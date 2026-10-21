"""Emit the JSON contract consumed by the SPA.

Shapes are documented in ``docs/BRIEFING.md`` and pinned by
``tests/pipeline/test_contract.py``:

* ``content/index.json`` — subjects plus one row per published guide;
* ``content/guides/<id>/guide.json`` — guide metadata, cover markdown and the
  chapter TOC with its sections;
* ``content/guides/<id>/chapters/<slug>.json`` — one chapter of markdown plus
  its section ids and its image manifest;
* ``content/search.json`` — one document per chapter (written by
  `pipeline.search`).

The build refuses to write output when the measured chapter count disagrees
with ``catalog.yaml``: a silently wrong count is worse than a failed build.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

from pipeline.assets import cover_image, rewrite_links
from pipeline.cover_links import CoverLinkStats, rewrite_cover_anchors
from pipeline.catalog import Catalog, CatalogError, GuideEntry, load
from pipeline.search import build_documents
from pipeline.split import Chapter, SplitDocument, split_document

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "catalog.yaml"
DEFAULT_DATA_ROOT = REPO_ROOT / "data"
DEFAULT_CONTENT_ROOT = REPO_ROOT / "content"

DISCIPLINE_RE = re.compile(r"Disciplina:\s*(?P<value>[^,|>\n]+)")
PROFESSOR_RE = re.compile(r"Professor(?:a)?\s+(?P<value>[^,|>\n]+)")
BACKTICK_RE = re.compile(r"`([^`]+)`")
GENERATED_RE = re.compile(r"Gerado em:\s*(?P<value>\d{4}-\d{2}-\d{2})")


class BuildError(RuntimeError):
    """Raised when a guide cannot be built; the message names the path."""


@dataclass(frozen=True)
class GuideBuild:
    """What one guide contributed to the build."""

    guide_id: str
    chapters: int
    sections: int
    images: int
    cover: str | None
    bytes_written: int
    cover_links: CoverLinkStats = CoverLinkStats()


@dataclass(frozen=True)
class BuildReport:
    """The whole build, as reported by the CLI."""

    content_root: Path
    generated_at: str
    guides: tuple[GuideBuild, ...]
    bytes_written: int = 0
    seconds: float = 0.0

    @property
    def chapters(self) -> int:
        return sum(guide.chapters for guide in self.guides)

    @property
    def images(self) -> int:
        return sum(guide.images for guide in self.guides)


@dataclass(frozen=True)
class GuideSource:
    """One ingested guide, loaded and split but not yet emitted."""

    entry: GuideEntry
    directory: Path
    meta: dict[str, Any]
    assets: dict[str, Path]
    markdown: str
    document: SplitDocument


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def guide_directory(data_root: Path, entry: GuideEntry) -> Path:
    return data_root / "guides" / entry.subject / entry.id


def parse_front_matter_meta(cover_markdown: str) -> dict[str, Any]:
    """Pull discipline, professor, sources and date out of the cover blockquote.

    The guides carry a blockquote under the title (``> Disciplina: EET 428 …``,
    ``> Fontes: `x.pdf` …``). Anything absent is reported as null or an empty
    list rather than guessed.
    """
    discipline: str | None = None
    professor: str | None = None
    generated: str | None = None
    sources: list[str] = []
    collecting = False
    for raw_line in cover_markdown.splitlines():
        line = raw_line.strip()
        if not line.startswith(">"):
            if collecting:
                break
            continue
        body = line.lstrip(">").strip()
        key_match = re.match(r"^\*{0,2}(?P<key>[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ]*)\*{0,2}:", body)
        key = key_match.group("key").strip().casefold() if key_match else None
        if key == "fontes" or key == "fonte":
            collecting = True
            for name in BACKTICK_RE.findall(body):
                sources.append(name)
            continue
        if key is not None:
            collecting = False
        if discipline is None:
            match = DISCIPLINE_RE.search(body)
            if match is not None:
                discipline = match.group("value").strip().rstrip(".,;") or None
        if professor is None:
            match = PROFESSOR_RE.search(body)
            if match is not None:
                professor = match.group("value").strip().rstrip(".,;") or None
        if generated is None:
            match = GENERATED_RE.search(body)
            if match is not None:
                generated = match.group("value")
        if collecting:
            for name in BACKTICK_RE.findall(body):
                if name not in sources:
                    sources.append(name)
    return {
        "discipline": discipline,
        "professor": professor,
        "sources": sources,
        "generated": generated,
    }


def load_guide(entry: GuideEntry, catalog: Catalog, data_root: Path) -> GuideSource:
    """Read and split one ingested guide, or fail naming the missing file."""
    directory = guide_directory(data_root, entry)
    markdown_path = directory / "guide.md"
    meta_path = directory / "meta.json"
    if not markdown_path.is_file():
        raise BuildError(f"{markdown_path}: ingested guide not found (run pipeline.ingest)")
    if not meta_path.is_file():
        raise BuildError(f"{meta_path}: ingest metadata not found (run pipeline.ingest)")
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise BuildError(f"{meta_path}: invalid JSON: {exc}") from exc
    markdown = markdown_path.read_text(encoding="utf-8")
    document = split_document(markdown, entry.split, default_kind=entry.type)
    if not document.chapters:
        raise BuildError(f"{markdown_path}: no chapters at split level {entry.split}")
    if len(document.chapters) != entry.expected_chapters:
        raise BuildError(
            f"{catalog.path}: guide {entry.id}: "
            f"expected_chapters: {entry.expected_chapters} but measured: {len(document.chapters)}; "
            "update catalog.yaml to the measured count"
        )
    assets: dict[str, Path] = {}
    for asset in meta.get("assets", []):
        link, path = asset.get("link"), asset.get("path")
        if isinstance(link, str) and isinstance(path, str):
            assets[link] = directory / path
    return GuideSource(
        entry=entry,
        directory=directory,
        meta=meta,
        assets=assets,
        markdown=markdown,
        document=document,
    )


def _json_text(payload: Any, *, indent: int | None) -> str:
    separators = (",", ":") if indent is None else (",", ": ")
    return json.dumps(payload, ensure_ascii=False, indent=indent, separators=separators)


def _write_json(path: Path, payload: Any, *, indent: int | None = None) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = _json_text(payload, indent=indent) + "\n"
    path.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def _updated_at(entry: GuideEntry, meta: dict[str, Any]) -> str:
    if entry.updated:
        return f"{entry.updated}T00:00:00Z"
    ingested = meta.get("ingestedAt")
    if isinstance(ingested, str) and ingested.endswith("Z"):
        return ingested
    return _now()


def chapter_payload(
    entry: GuideEntry, chapter: Chapter, markdown: str, images: list[Any]
) -> dict[str, Any]:
    return {
        "id": chapter.id,
        "guideId": entry.id,
        "number": chapter.number,
        "title": chapter.title,
        "slug": chapter.slug,
        "kind": chapter.kind,
        "part": chapter.part,
        "markdown": markdown,
        "sections": [section.as_json() for section in chapter.flat_sections()],
        "images": [image.as_json() for image in images],
    }


def _first_cover_source(
    cover_images: list[Any], chapter_images: Sequence[list[Any]], content_root: Path
) -> Path | None:
    for candidate in [*cover_images, *(images[0] for images in chapter_images if images)]:
        path = content_root / candidate.original.lstrip("/")
        if path.is_file():
            return path
    return None


def emit_guide(source: GuideSource, *, content_root: Path) -> GuideBuild:
    """Write ``content/guides/<id>/`` for an already loaded guide."""
    entry = source.entry
    media_root = content_root / "media"
    guide_root = content_root / "guides" / entry.id

    cover_markdown, cover_images = rewrite_links(
        source.document.cover,
        source.directory / "guide.md",
        media_root,
        assets=source.assets,
    )
    # The authored index still holds in-page anchors from the one-page era; point
    # them at the chapter and section routes this build just created.
    cover_markdown, cover_links = rewrite_cover_anchors(
        cover_markdown, guide_id=entry.id, chapters=source.document.chapters
    )

    written = 0
    image_count = 0
    section_count = 0
    chapter_images: list[list[Any]] = []
    payloads: list[dict[str, Any]] = []
    for chapter in source.document.chapters:
        markdown, images = rewrite_links(
            chapter.markdown,
            source.directory / "guide.md",
            media_root,
            assets=source.assets,
        )
        payloads.append(chapter_payload(entry, chapter, markdown, images))
        chapter_images.append(images)
        image_count += len(images)
        section_count += len(chapter.flat_sections())
    image_count += len(cover_images)

    chapters_dir = guide_root / "chapters"
    chapters_dir.mkdir(parents=True, exist_ok=True)
    for payload in payloads:
        written += _write_json(chapters_dir / f"{payload['slug']}.json", payload)
    keep = {f"{payload['slug']}.json" for payload in payloads}
    for stale in chapters_dir.glob("*.json"):
        if stale.name not in keep:
            stale.unlink()

    cover_path: str | None = None
    cover_source = _first_cover_source(cover_images, chapter_images, content_root)
    cover_destination = media_root / "covers" / f"{entry.id}.webp"
    if cover_source is not None:
        cover_image(cover_source, cover_destination)
        cover_path = f"/media/covers/{entry.id}.webp"
    elif cover_destination.is_file():
        cover_destination.unlink()

    guide_payload = {
        "id": entry.id,
        "title": entry.title,
        "subject": entry.subject,
        "type": entry.type,
        "meta": parse_front_matter_meta(source.document.cover),
        "cover": {"markdown": cover_markdown},
        "chapters": [chapter.as_summary() for chapter in source.document.chapters],
    }
    written += _write_json(guide_root / "guide.json", guide_payload, indent=2)
    return GuideBuild(
        guide_id=entry.id,
        chapters=len(source.document.chapters),
        sections=section_count,
        images=image_count,
        cover=cover_path,
        bytes_written=written,
        cover_links=cover_links,
    )


def build_guide(
    entry: GuideEntry,
    catalog: Catalog,
    *,
    data_root: Path = DEFAULT_DATA_ROOT,
    content_root: Path = DEFAULT_CONTENT_ROOT,
) -> GuideBuild:
    """Build one guide into ``content/guides/<id>/``; returns its stats."""
    return emit_guide(
        load_guide(entry, catalog, data_root), content_root=content_root
    )


def build_all(
    *,
    catalog_path: Path = DEFAULT_CATALOG,
    data_root: Path = DEFAULT_DATA_ROOT,
    content_root: Path = DEFAULT_CONTENT_ROOT,
    generated_at: str | None = None,
) -> BuildReport:
    """Build every published guide, then the index and the search corpus."""
    started = time.perf_counter()
    catalog = load(catalog_path)
    subjects = sorted(catalog.subjects, key=lambda subject: (subject.order, subject.id))
    entries = sorted(
        catalog.published_guides(),
        key=lambda entry: (
            catalog.subject(entry.subject).order,
            entry.order,
            entry.id,
        ),
    )
    if not entries:
        raise BuildError(f"{catalog_path}: no published guides to build")

    stamp = generated_at or _now()
    builds: list[GuideBuild] = []
    rows: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    for entry in entries:
        source = load_guide(entry, catalog, data_root)
        build = emit_guide(source, content_root=content_root)
        builds.append(build)
        documents.extend(build_documents(entry, source.document.chapters))
        rows.append(
            {
                "id": entry.id,
                "title": entry.title,
                "subject": entry.subject,
                "type": entry.type,
                "chapterCount": build.chapters,
                "updatedAt": _updated_at(entry, source.meta),
                "cover": build.cover,
            }
        )

    index = {
        "generatedAt": stamp,
        "subjects": [
            {"id": subject.id, "title": subject.title, "order": subject.order}
            for subject in subjects
        ],
        "guides": rows,
    }
    written = sum(build.bytes_written for build in builds)
    written += _write_json(content_root / "index.json", index, indent=2)
    written += _write_json(content_root / "search.json", documents)
    return BuildReport(
        content_root=content_root,
        generated_at=stamp,
        guides=tuple(builds),
        bytes_written=written,
        seconds=time.perf_counter() - started,
    )


def describe(report: BuildReport) -> str:
    """One plain-text line per guide plus a total, for the CLI."""
    lines = [
        f"{build.guide_id:<12} chapters={build.chapters:<3} sections={build.sections:<4} "
        f"images={build.images:<4} cover={build.cover or '-'} "
        f"links={build.cover_links.rewritten}/{build.cover_links.total}"
        for build in report.guides
    ]
    megabytes = report.bytes_written / (1024 * 1024)
    lines.append(
        f"built {len(report.guides)} guides, {report.chapters} chapters, "
        f"{report.images} images, {megabytes:.2f} MB of JSON "
        f"in {report.seconds:.2f}s -> {report.content_root}"
    )
    return "\n".join(lines)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m pipeline.build",
        description="Build the JSON contract and media cache from data/guides.",
    )
    parser.add_argument("--all", action="store_true", dest="all_guides", help="build every published guide")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--data-root", type=Path, default=DEFAULT_DATA_ROOT)
    parser.add_argument("--content-root", type=Path, default=DEFAULT_CONTENT_ROOT)
    parser.add_argument("--quiet", action="store_true", help="print only the total")
    args = parser.parse_args(list(argv) if argv is not None else None)

    if not args.all_guides:
        parser.error("pass --all: the SPA consumes the whole corpus, not one guide")
    try:
        report = build_all(
            catalog_path=args.catalog,
            data_root=args.data_root,
            content_root=args.content_root,
        )
    except (BuildError, CatalogError) as exc:
        print(f"build failed: {exc}", file=sys.stderr)
        return 1
    text = describe(report)
    print(text.splitlines()[-1] if args.quiet else text)
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
