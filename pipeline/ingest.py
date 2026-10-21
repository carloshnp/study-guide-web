"""Adopt a source guide into the site-owned `data/` corpus.

The contract, from `SPEC.md`:

* the final guide markdown is copied byte for byte (the source is never edited);
* every image it references is copied too, including targets that live outside
  the guide folder (`../diagrams/...` in the llm_chess guide);
* `meta.json` records provenance: `sourcePath`, `sha256`, `ingestedAt`, `slug`;
* `data/` is its own git repository and every ingest is one commit;
* reports, briefings, backups and `part-*` fragments are refused;
* re-ingesting the same hash is a no-op, a changed hash is drift and requires
  `force=True` (the `--force` flag on the CLI).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Mapping, Sequence
from urllib.parse import unquote

from pipeline.catalog import Catalog, CatalogError, GuideEntry, load, load_sources
from pipeline.split import count_chapters

REPO_ROOT = Path(__file__).resolve().parent.parent

SCHEMA_VERSION = 1
TOOL = "pipeline.ingest/1"

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
IMAGE_RE = re.compile(r"!\[[^\]]*\]\(\s*(?:<(?P<angle>[^>\n]*)>|(?P<url>[^)\s]+))")
HTML_IMG_RE = re.compile(
    r"""<img\b[^>]*?\bsrc\s*=\s*(?P<quote>["'])(?P<src>.*?)(?P=quote)""",
    re.IGNORECASE,
)

# Folder names whose contents are never the guide to publish.
REFUSED_DIRS = frozenset(
    {"reports", "relatorios", "report", "research", "plans", "planejamento", "backups"}
)

_SOURCE_PREFIXES = ("http://", "https://", "data:", "mailto:", "//", "tel:")
_REFUSED_NAME_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"^part[-_]"), "it is a part-* fragment, not the merged guide"),
    (re.compile(r"^parte[-_0-9]"), "it is a part-* fragment, not the merged guide"),
    (re.compile(r"baseline"), "it is a baseline copy"),
    (re.compile(r"backup"), "it is a backup copy"),
    (re.compile(r"briefing"), "it is a briefing for the writing workflow"),
    (re.compile(r"relat[oó]rio|report"), "it is a report"),
)


class IngestError(RuntimeError):
    """Raised when a source cannot be adopted into `data/`."""


@dataclass(frozen=True)
class IngestRequest:
    """What the catalog says about the guide being adopted."""

    guide_id: str
    slug: str
    title: str
    subject: str
    type: str
    split: int

    def __post_init__(self) -> None:
        if not SLUG_RE.match(self.slug):
            raise IngestError(
                f"invalid slug {self.slug!r}: must match {SLUG_RE.pattern} "
                "(lowercase letters, digits and hyphens)"
            )
        if not SLUG_RE.match(self.guide_id):
            raise IngestError(
                f"invalid guide id {self.guide_id!r}: must match {SLUG_RE.pattern}"
            )
        if not 1 <= self.split <= 6:
            raise IngestError(f"invalid split level {self.split}: must be between 1 and 6")

    @classmethod
    def from_entry(cls, entry: GuideEntry, slug: str | None = None) -> "IngestRequest":
        return cls(
            guide_id=entry.id,
            slug=slug or entry.id,
            title=entry.title,
            subject=entry.subject,
            type=entry.type,
            split=entry.split,
        )


@dataclass(frozen=True)
class AssetRecord:
    """One copied asset, keyed by the link that referenced it."""

    link: str
    path: str
    sha256: str
    bytes: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "link": self.link,
            "path": self.path,
            "sha256": self.sha256,
            "bytes": self.bytes,
        }


@dataclass
class IngestResult:
    """Outcome of one `ingest()` call."""

    guide_id: str
    slug: str
    status: str  # new | updated | unchanged | drift | would-ingest
    source: Path
    dest: Path
    sha256: str
    chapters: int
    stored_sha256: str | None = None
    assets: tuple[AssetRecord, ...] = ()
    warnings: list[dict[str, str]] = field(default_factory=list)
    commit: str | None = None
    bytes: int = 0


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def validate_source(source: Path) -> Path:
    """Refuse anything that is not the final merged guide markdown."""
    path = Path(source).expanduser()
    if not path.exists():
        raise IngestError(f"{path}: source file not found")
    if not path.is_file():
        raise IngestError(f"{path}: source is not a file")
    for parent in path.parents:
        if parent.name.casefold() in REFUSED_DIRS:
            raise IngestError(
                f"{path}: refusing to ingest from the '{parent.name}' folder "
                "(reports and plans are not guide sources)"
            )
    if path.suffix.lower() != ".md":
        raise IngestError(f"{path}: refusing to ingest: expected a .md guide, got '{path.suffix}'")
    name = path.name.casefold()
    for pattern, reason in _REFUSED_NAME_RULES:
        if pattern.search(name):
            raise IngestError(f"{path}: refusing to ingest: {reason}")
    return path


def is_remote(link: str) -> bool:
    lowered = link.strip().casefold()
    return lowered.startswith(_SOURCE_PREFIXES)


def collect_asset_links(markdown: str) -> list[str]:
    """Image links in document order, deduplicated, without remote/inline ones."""
    links: list[str] = []
    seen: set[str] = set()
    for match in IMAGE_RE.finditer(markdown):
        link = (match.group("angle") or match.group("url") or "").strip()
        if not link or link.startswith("#") or is_remote(link):
            continue
        key = unquote(link)
        if key in seen:
            continue
        seen.add(key)
        links.append(link)
    for match in HTML_IMG_RE.finditer(markdown):
        link = match.group("src").strip()
        if not link or link.startswith("#") or is_remote(link):
            continue
        key = unquote(link)
        if key in seen:
            continue
        seen.add(key)
        links.append(link)
    return links


def asset_destination(link: str) -> Path:
    """Where a referenced asset is stored inside the guide folder.

    The authored layout is preserved: `assets/x.png` stays `assets/x.png`.
    A link that climbs out of the guide folder is mirrored with `__up__` in
    place of each `..`, so `../diagrams/a.svg` becomes
    `assets/__up__/diagrams/a.svg` and nothing escapes the guide folder.
    """
    parts: list[str] = []
    for part in PurePosixPath(unquote(link)).parts:
        if part in ("", ".", "/"):
            continue
        parts.append("__up__" if part == ".." else part)
    if not parts:
        raise IngestError(f"cannot map asset link {link!r} to a path in the guide folder")
    if parts[0] == "assets":
        return Path(*parts)
    return Path("assets", *parts)


def _plan_assets(
    markdown: str, source: Path
) -> tuple[list[tuple[str, Path, Path]], list[dict[str, str]]]:
    """Return (link, destination relative path, absolute target) plus warnings."""
    source_dir = source.parent.resolve()
    planned: list[tuple[str, Path, Path]] = []
    warnings: list[dict[str, str]] = []
    for link in collect_asset_links(markdown):
        if link.startswith("/"):
            warnings.append(
                {"link": link, "reason": f"absolute asset link is not resolvable: {link}"}
            )
            continue
        target = (source_dir / unquote(link)).resolve()
        if not target.is_file():
            warnings.append({"link": link, "reason": f"missing asset: {target}"})
            continue
        planned.append((link, asset_destination(link), target))
    return planned, warnings


def _read_meta(dest: Path) -> dict[str, Any] | None:
    meta_path = dest / "meta.json"
    if not meta_path.is_file():
        return None
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise IngestError(f"{meta_path}: corrupt meta.json: {exc}") from exc


def _git(data_root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(data_root), *args], capture_output=True, text=True
    )
    if result.returncode != 0:
        raise IngestError(
            f"git {' '.join(args)} failed in {data_root}: {result.stderr.strip() or result.stdout.strip()}"
        )
    return result.stdout.strip()


def ensure_data_repo(data_root: Path) -> None:
    """`data/` is its own git repository, with no remote."""
    data_root.mkdir(parents=True, exist_ok=True)
    if not (data_root / ".git").exists():
        result = subprocess.run(
            ["git", "init", "-q", str(data_root)], capture_output=True, text=True
        )
        if result.returncode != 0:
            raise IngestError(f"git init failed in {data_root}: {result.stderr.strip()}")


def commit_data(data_root: Path, message: str) -> str | None:
    """Stage everything under `data/` and commit. Returns the short sha or None."""
    ensure_data_repo(data_root)
    _git(data_root, "add", "-A")
    staged = subprocess.run(
        ["git", "-C", str(data_root), "diff", "--cached", "--quiet"], capture_output=True
    )
    if staged.returncode == 0:
        return None
    _git(data_root, "commit", "-q", "-m", message)
    return _git(data_root, "rev-parse", "--short", "HEAD")


def _same_request(meta: Mapping[str, Any], request: IngestRequest) -> bool:
    return (
        meta.get("guideId") == request.guide_id
        and meta.get("slug") == request.slug
        and meta.get("title") == request.title
        and meta.get("subject") == request.subject
        and meta.get("type") == request.type
        and meta.get("split") == request.split
    )


def _assets_intact(dest: Path, records: Iterable[AssetRecord]) -> bool:
    for record in records:
        path = dest / record.path
        if not path.is_file() or path.stat().st_size != record.bytes:
            return False
    return True


def _copy_if_changed(target: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_file() and destination.stat().st_size == target.stat().st_size:
        if sha256_file(destination) == sha256_file(target):
            return
    shutil.copyfile(target, destination)


def _prune_assets(dest: Path, keep: set[Path]) -> None:
    assets_root = dest / "assets"
    if not assets_root.is_dir():
        return
    for path in sorted(assets_root.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        if path.is_file() and path.relative_to(dest) not in keep:
            path.unlink()
        elif path.is_dir() and not any(path.iterdir()):
            path.rmdir()


def compose_markdown(paths: Sequence[Path]) -> tuple[str, str, int]:
    """Join the source files of a guide into the markdown the site serves.

    A guide is normally one file, and then the text is returned untouched (so
    the stored copy stays byte for byte identical to the source). With more than
    one file, the parts are concatenated in the given order with exactly one
    blank line between them, and the digest is taken over the result: the guide
    is then one document whose provenance is the list of files.
    """
    if len(paths) == 1:
        path = paths[0]
        return path.read_text(encoding="utf-8"), sha256_file(path), path.stat().st_size
    parts = [path.read_text(encoding="utf-8").strip("\n") for path in paths]
    markdown = "\n\n".join(parts) + "\n"
    encoded = markdown.encode("utf-8")
    return markdown, hashlib.sha256(encoded).hexdigest(), len(encoded)


def _as_source_list(source: str | Path | Sequence[str | Path]) -> list[Path]:
    if isinstance(source, (str, Path)):
        return [Path(source)]
    paths = [Path(item) for item in source]
    if not paths:
        raise IngestError("a guide needs at least one source file")
    return paths


def ingest(
    source: str | Path | Sequence[str | Path],
    data_root: str | Path,
    request: IngestRequest,
    *,
    force: bool = False,
    dry_run: bool = False,
) -> IngestResult:
    """Adopt `source` into `data_root/guides/<subject>/<slug>/`.

    `source` is one markdown file, or a sequence of them composing a single
    guide (its parts are concatenated in order). Returns an `IngestResult`
    whose `status` is one of `new`, `updated`, `unchanged`, `drift` (refused
    without `force`) or `would-ingest`.
    """
    requested = _as_source_list(source)
    source_paths = [validate_source(path) for path in requested]
    source_path = source_paths[0]
    data_path = Path(data_root)
    dest = data_path / "guides" / request.subject / request.slug

    markdown, digest, size = compose_markdown(source_paths)
    chapters = count_chapters(markdown, request.split)
    planned: list[tuple[str, Path, Path]] = []
    warnings: list[dict[str, str]] = []
    seen_links: set[str] = set()
    for path in source_paths:
        text = markdown if len(source_paths) == 1 else path.read_text(encoding="utf-8")
        planned_part, warnings_part = _plan_assets(text, path)
        warnings.extend(warnings_part)
        for link, dest_rel, target in planned_part:
            if link in seen_links:
                continue
            seen_links.add(link)
            planned.append((link, dest_rel, target))
    records = tuple(
        AssetRecord(
            link=link,
            path=dest_rel.as_posix(),
            sha256=sha256_file(target),
            bytes=target.stat().st_size,
        )
        for link, dest_rel, target in planned
    )

    existing = _read_meta(dest)
    stored_sha = existing.get("sha256") if existing else None

    if existing is not None and stored_sha == digest:
        if _same_request(existing, request) and _assets_intact(dest, records):
            return IngestResult(
                guide_id=request.guide_id,
                slug=request.slug,
                status="unchanged",
                source=source_path.resolve(),
                dest=dest,
                sha256=digest,
                stored_sha256=stored_sha,
                chapters=chapters,
                assets=records,
                warnings=warnings,
                bytes=size,
            )
        status = "updated"
    elif existing is not None and not force:
        return IngestResult(
            guide_id=request.guide_id,
            slug=request.slug,
            status="drift",
            source=source_path.resolve(),
            dest=dest,
            sha256=digest,
            stored_sha256=stored_sha,
            chapters=chapters,
            assets=records,
            warnings=warnings,
            bytes=size,
        )
    else:
        status = "updated" if existing is not None else "new"

    if dry_run:
        return IngestResult(
            guide_id=request.guide_id,
            slug=request.slug,
            status="would-ingest",
            source=source_path.resolve(),
            dest=dest,
            sha256=digest,
            stored_sha256=stored_sha,
            chapters=chapters,
            assets=records,
            warnings=warnings,
            bytes=size,
        )

    ensure_data_repo(data_path)
    dest.mkdir(parents=True, exist_ok=True)
    if len(source_paths) == 1:
        shutil.copyfile(source_path, dest / "guide.md")
    else:
        (dest / "guide.md").write_text(markdown, encoding="utf-8")
    for _link, dest_rel, target in planned:
        _copy_if_changed(target, dest / dest_rel)
    _prune_assets(dest, {dest_rel for _link, dest_rel, _target in planned})

    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "tool": TOOL,
        "guideId": request.guide_id,
        "slug": request.slug,
        "title": request.title,
        "subject": request.subject,
        "type": request.type,
        "split": request.split,
        "sourcePath": str(source_path.resolve()),
        "sourceMtime": datetime.fromtimestamp(source_path.stat().st_mtime)
        .astimezone()
        .isoformat(timespec="seconds"),
        "sha256": digest,
        "bytes": size,
        "sources": [
            {
                "path": str(path.resolve()),
                "sha256": sha256_file(path),
                "bytes": path.stat().st_size,
            }
            for path in source_paths
        ],
        "chapters": chapters,
        "ingestedAt": utc_now(),
        "assets": [record.to_dict() for record in records],
        "warnings": warnings,
    }
    meta_path = dest / "meta.json"
    tmp_path = meta_path.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp_path, meta_path)

    commit = commit_data(
        data_path, f"ingest {request.guide_id}: {request.title} ({digest[:12]})"
    )

    return IngestResult(
        guide_id=request.guide_id,
        slug=request.slug,
        status=status,
        source=source_path.resolve(),
        dest=dest,
        sha256=digest,
        stored_sha256=stored_sha,
        chapters=chapters,
        assets=records,
        warnings=warnings,
        commit=commit,
        bytes=size,
    )


def ingest_catalog(
    catalog: Catalog,
    sources: Mapping[str, Path | Sequence[Path]],
    data_root: str | Path,
    *,
    force: bool = False,
    check_only: bool = False,
) -> list[IngestResult]:
    """Ingest every published guide of the catalog, in catalog order."""
    missing = [guide.id for guide in catalog.published_guides() if guide.id not in sources]
    if missing:
        raise IngestError(
            f"{catalog.path}: no source path for {', '.join(missing)} in the sources map"
        )
    results: list[IngestResult] = []
    for guide in catalog.published_guides():
        results.append(
            ingest(
                sources[guide.id],
                data_root,
                IngestRequest.from_entry(guide),
                force=force,
                dry_run=check_only,
            )
        )
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m pipeline.ingest",
        description="Adopt a guide markdown (plus its assets) into data/.",
    )
    parser.add_argument("source", nargs="?", type=Path, help="guide markdown to adopt")
    parser.add_argument("--all", action="store_true", dest="all_guides", help="ingest every published guide")
    parser.add_argument("--check", action="store_true", help="report only, write nothing")
    parser.add_argument("--force", action="store_true", help="overwrite a drifted guide")
    parser.add_argument("--slug")
    parser.add_argument("--guide-id", dest="guide_id")
    parser.add_argument("--title")
    parser.add_argument("--subject")
    parser.add_argument("--type")
    parser.add_argument("--split", type=int)
    parser.add_argument("--data-root", type=Path, default=REPO_ROOT / "data")
    parser.add_argument("--catalog", type=Path, default=REPO_ROOT / "catalog.yaml")
    parser.add_argument("--sources", type=Path, default=REPO_ROOT / "sources.local.yaml")
    args = parser.parse_args(argv)

    try:
        if args.all_guides:
            catalog = load(args.catalog)
            sources = load_sources(args.sources)
            results = ingest_catalog(
                catalog, sources, args.data_root, force=args.force, check_only=args.check
            )
            mismatches = 0
            for guide, result in zip(catalog.published_guides(), results):
                if args.check:
                    ok = result.chapters == guide.expected_chapters
                    mismatches += 0 if ok else 1
                    print(
                        f"{guide.id:<12} split={guide.split} "
                        f"chapters={result.chapters:<3} "
                        f"expected={guide.expected_chapters:<3} "
                        f"assets={len(result.assets):<4} "
                        f"{'OK' if ok else 'MISMATCH'}"
                    )
                else:
                    print(
                        f"{guide.id:<12} {result.status:<11} chapters={result.chapters:<3} "
                        f"assets={len(result.assets):<4} {result.dest}"
                        + (f" commit={result.commit}" if result.commit else "")
                    )
            drifted = [r.guide_id for r in results if r.status == "drift"]
            if drifted:
                print(
                    f"drift: {', '.join(drifted)} changed since ingest; "
                    "rerun with --force to overwrite",
                    file=sys.stderr,
                )
                return 1
            return 1 if mismatches else 0

        if args.source is None:
            parser.error("pass a source markdown or --all")
        missing = [
            flag
            for flag, value in (
                ("--slug", args.slug),
                ("--title", args.title),
                ("--subject", args.subject),
                ("--type", args.type),
                ("--split", args.split),
            )
            if value is None
        ]
        if missing:
            parser.error(f"missing required flags for a single ingest: {', '.join(missing)}")
        request = IngestRequest(
            guide_id=args.guide_id or args.slug,
            slug=args.slug,
            title=args.title,
            subject=args.subject,
            type=args.type,
            split=args.split,
        )
        result = ingest(
            args.source, args.data_root, request, force=args.force, dry_run=args.check
        )
        print(
            f"{result.guide_id:<12} {result.status:<11} chapters={result.chapters:<3} "
            f"assets={len(result.assets):<4} {result.dest}"
            + (f" commit={result.commit}" if result.commit else "")
        )
        for warning in result.warnings:
            print(f"warning: {warning['link']}: {warning['reason']}", file=sys.stderr)
        return 1 if result.status == "drift" else 0
    except (IngestError, CatalogError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
