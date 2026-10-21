"""Publish a build: copy the SPA and the content tree, verify it, swap ``current``.

The deploy invariant is that a reader holding ``<root>/current`` always sees one
complete build. It is met by never writing into the live tree:

1. copy ``web/dist`` and ``content`` into ``builds/.staging-<ts>-<pid>/`` on the
   same filesystem as ``builds/``;
2. smoke-check the staged tree (index, one chapter, one media file, the hashed
   JS bundle referenced by ``index.html``);
3. rename the staging directory to ``builds/<ts>/`` (one ``os.replace``), then
   atomically repoint the ``current`` symlink with a second ``os.replace`` of a
   temporary symlink.

Any failure before step 3 removes the staging directory and leaves ``current``
pointing at the previous build. Because a symlink is replaced, never rewritten
in place, a concurrent ``open("current/index.json")`` resolves either the old or
the new build, never a half-copied one.

``web/dist`` and ``content`` at the repository root are expected to be relative
symlinks through ``current`` (``web/dist -> ../current/web``, ``content ->
current/content``); ``app.main`` resolves them at import, so the service is
restarted after a successful swap (``--restart``).
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WEB_DIST = REPO_ROOT / "web" / "dist"
DEFAULT_CONTENT_ROOT = REPO_ROOT / "content"
DEFAULT_BUILDS_ROOT = REPO_ROOT / "builds"
DEFAULT_CURRENT = REPO_ROOT / "current"
DEFAULT_KEEP = 5
SYSTEMD_UNIT = "estudos.service"


class PublishError(RuntimeError):
    """Raised when a publish cannot be completed; the message names the path."""


@dataclass(frozen=True)
class SmokeCheck:
    """One verified file inside the staged build."""

    name: str
    path: str
    detail: str


@dataclass(frozen=True)
class PublishReport:
    """The result of one publish, as printed by the CLI."""

    build_dir: Path
    current: Path
    previous: Path | None
    checks: tuple[SmokeCheck, ...]
    files: int
    bytes: int
    seconds: float
    pruned: tuple[Path, ...] = ()
    restarted: bool = False

    @property
    def stamp(self) -> str:
        return self.build_dir.name


def _now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _unique_build_dir(builds_root: Path, stamp: str) -> Path:
    """A build directory name that does not collide with an existing one."""
    candidate = builds_root / stamp
    suffix = 1
    while candidate.exists() or candidate.is_symlink():
        candidate = builds_root / f"{stamp}-{suffix}"
        suffix += 1
    return candidate


def _require(path: Path, what: str) -> None:
    if not path.exists():
        raise PublishError(f"{path}: {what} not found")


def _tree_size(root: Path) -> tuple[int, int]:
    files = 0
    total = 0
    for path in root.rglob("*"):
        if path.is_file():
            files += 1
            total += path.stat().st_size
    return files, total


def _read_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PublishError(f"{path}: unreadable JSON: {exc}") from exc


def _bundle_from_index(index_html: Path) -> str:
    """The hashed JS entry referenced by the SPA shell."""
    try:
        html = index_html.read_text(encoding="utf-8")
    except OSError as exc:
        raise PublishError(f"{index_html}: unreadable SPA shell: {exc}") from exc
    marker = 'type="module"'
    for tag in html.split("<script")[1:]:
        if marker in tag and "src=" in tag:
            start = tag.index('src="') + len('src="')
            return tag[start : tag.index('"', start)]
    raise PublishError(f"{index_html}: no module script found; is the SPA built?")


def _first_chapter(
    build_root: Path, index: dict[str, object]
) -> tuple[str, Path, dict[str, object]]:
    """Locate one chapter JSON, preferring the first guide in the index."""
    guides = index.get("guides")
    if not isinstance(guides, list) or not guides:
        raise PublishError(f"{build_root}: index.json has no guides")

    candidates: list[str] = []
    for row in guides:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            candidates.append(str(row["id"]))
    if not candidates:
        raise PublishError(f"{build_root}: index.json guides carry no id")

    for guide_id in candidates:
        chapters_dir = build_root / "content" / "guides" / guide_id / "chapters"
        if not chapters_dir.is_dir():
            continue
        for chapter in sorted(chapters_dir.glob("*.json")):
            payload = _read_json(chapter)
            if not isinstance(payload, dict) or not payload.get("markdown"):
                raise PublishError(f"{chapter}: chapter JSON is empty")
            return guide_id, chapter, payload

    raise PublishError(f"{build_root}: no chapter JSON under content/guides/*/chapters")


def _build_path(build_root: Path, src: str) -> Path:
    """Map a public URL path to its file inside the staged build.

    ``/media/...`` is served from ``content/media``, ``/content/...`` from
    ``content/`` and everything else (``/assets/...``, ``/fonts/...``) from ``web/``.
    """
    clean = src.lstrip("/")
    if clean.startswith("media/"):
        return build_root / "content" / clean
    if clean.startswith("content/"):
        return build_root / clean
    return build_root / "web" / clean


def _media_for_chapter(
    build_root: Path, guide_id: str, chapter: dict[str, object], chapter_path: Path
) -> tuple[Path, str]:
    """The first image referenced by a chapter, checked on disk."""
    images = chapter.get("images")
    if isinstance(images, list):
        for image in images:
            if isinstance(image, dict) and isinstance(image.get("src"), str):
                src = str(image["src"]).lstrip("/")
                path = _build_path(build_root, src)
                if path.is_file() and path.stat().st_size > 0:
                    return path, src
                raise PublishError(f"{chapter_path}: image {src} missing from the build")

    # A chapter without figures is legal; fall back to any media file so the
    # publish still proves the media tree arrived.
    media_root = build_root / "content" / "media"
    for path in sorted(media_root.rglob("*.webp")):
        if path.is_file() and path.stat().st_size > 0:
            return path, path.relative_to(build_root).as_posix()
    raise PublishError(f"{media_root}: no media file in the build ({guide_id})")


def smoke_check(build_root: Path) -> tuple[SmokeCheck, ...]:
    """Verify the staged build before it can become ``current``.

    Checks the SPA shell and its bundle, ``content/index.json``, the first
    chapter JSON (parseable, with markdown and a title) and one media file
    (non-empty, WebP magic). Raises :class:`PublishError` naming the file.
    """
    index_html = build_root / "web" / "index.html"
    _require(index_html, "SPA shell")
    bundle = _bundle_from_index(index_html)
    bundle_path = build_root / "web" / bundle.lstrip("/")
    if not bundle_path.is_file():
        raise PublishError(f"{bundle_path}: bundle referenced by index.html is missing")

    index_path = build_root / "content" / "index.json"
    _require(index_path, "content index")
    index = _read_json(index_path)
    if not isinstance(index, dict):
        raise PublishError(f"{index_path}: expected a JSON object")

    guide_id, chapter_path, chapter = _first_chapter(build_root, index)
    title = chapter.get("title")
    if not isinstance(title, str) or not title.strip():
        raise PublishError(f"{chapter_path}: chapter has no title")

    media_path, media_src = _media_for_chapter(build_root, guide_id, chapter, chapter_path)
    head = media_path.read_bytes()[:12]
    if not (head.startswith(b"RIFF") and head[8:12] == b"WEBP"):
        raise PublishError(f"{media_path}: media file is not WebP")

    return (
        SmokeCheck("spa", "web/index.html", f"bundle {bundle}"),
        SmokeCheck("bundle", f"web/{bundle.lstrip('/')}", "module script present"),
        SmokeCheck(
            "index",
            "content/index.json",
            f"{len(index.get('guides', []))} guides, {len(index.get('subjects', []))} subjects",
        ),
        SmokeCheck("chapter", chapter_path.relative_to(build_root).as_posix(), title),
        SmokeCheck(
            "media",
            media_path.relative_to(build_root).as_posix(),
            f"{media_src}, {media_path.stat().st_size} bytes",
        ),
    )


def _copy_tree(source: Path, destination: Path) -> None:
    try:
        shutil.copytree(
            source,
            destination,
            symlinks=False,
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store"),
        )
    except OSError as exc:
        raise PublishError(f"{source}: copy failed: {exc}") from exc


def _fsync_dir(path: Path) -> None:
    try:
        handle = os.open(path, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(handle)
    except OSError:
        pass
    finally:
        os.close(handle)


def _current_target(current: Path) -> Path | None:
    if current.is_symlink():
        try:
            return current.resolve()
        except OSError:
            return None
    return None


def _replace_symlink(current: Path, target: Path) -> None:
    """Point ``current`` at ``target`` with one ``os.replace``."""
    if current.exists() and not current.is_symlink():
        raise PublishError(
            f"{current}: exists and is not a symlink; remove it so publish can own it"
        )
    relative = os.path.relpath(target.resolve(), current.parent.resolve())
    temporary = current.parent / f".{current.name}.{os.getpid()}.tmp"
    if temporary.is_symlink() or temporary.exists():
        temporary.unlink()
    os.symlink(relative, temporary)
    try:
        os.replace(temporary, current)
    except OSError as exc:
        temporary.unlink(missing_ok=True)
        raise PublishError(f"{current}: symlink swap failed: {exc}") from exc


def _prune(builds_root: Path, current: Path, keep: int) -> tuple[Path, ...]:
    """Delete old build directories, always keeping the live one.

    ``keep`` counts the live build too, so ``keep=2`` leaves the current build
    plus one previous version.
    """
    if keep <= 0:
        return ()
    live = current.resolve()
    directories = sorted(
        (path for path in builds_root.iterdir() if path.is_dir() and path.resolve() != live),
        key=lambda path: path.name,
        reverse=True,
    )
    removed: list[Path] = []
    for index, path in enumerate(directories):
        if index < max(keep - 1, 0):
            continue
        shutil.rmtree(path, ignore_errors=True)
        removed.append(path)
    return tuple(removed)


def _run_web_build(web_dir: Path) -> None:
    """Run ``npm run build`` in ``web/``; the output tail is in the error."""
    npm = shutil.which("npm")
    if npm is None:
        raise PublishError("npm: not found on PATH; cannot build the SPA")
    try:
        result = subprocess.run(
            [npm, "run", "build"],
            cwd=web_dir,
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise PublishError(f"{web_dir}: npm run build failed to start: {exc}") from exc
    if result.returncode != 0:
        tail = "\n".join((result.stdout + result.stderr).strip().splitlines()[-20:])
        raise PublishError(
            f"{web_dir}: npm run build exited {result.returncode}\n{tail}"
        )


def _restart_service(unit: str = SYSTEMD_UNIT) -> bool:
    systemctl = shutil.which("systemctl")
    if systemctl is None:
        raise PublishError("systemctl: not found on PATH; cannot restart the service")
    result = subprocess.run(
        [systemctl, "--user", "restart", unit],
        capture_output=True,
        text=True,
        check=False,
        timeout=120,
    )
    if result.returncode != 0:
        tail = (result.stderr or result.stdout).strip() or "no output"
        raise PublishError(f"systemctl --user restart {unit}: {tail}")
    return True


def publish(
    *,
    content_root: Path = DEFAULT_CONTENT_ROOT,
    web_dist: Path = DEFAULT_WEB_DIST,
    builds_root: Path = DEFAULT_BUILDS_ROOT,
    current: Path = DEFAULT_CURRENT,
    stamp: str | None = None,
    web_build: bool = True,
    web_dir: Path | None = None,
    keep: int = DEFAULT_KEEP,
    build_runner: Callable[[Path], None] | None = None,
    restart: bool = False,
    restart_runner: Callable[[], bool] | None = None,
) -> PublishReport:
    """Build, verify and atomically publish one version; return what happened."""
    started = time.perf_counter()
    content = Path(content_root)
    dist = Path(web_dist)
    builds = Path(builds_root)
    live = Path(current)

    web = Path(web_dir) if web_dir is not None else dist.parent
    if web_build:
        (build_runner or _run_web_build)(web)
    elif not (dist / "index.html").is_file():
        raise PublishError(f"{dist}: SPA build missing; run npm run build first")

    _require(dist / "index.html", "SPA shell")
    _require(content / "index.json", "content index")
    _require(content / "guides", "content guides")
    _require(content / "media", "media cache")
    builds.mkdir(parents=True, exist_ok=True)

    build_dir = _unique_build_dir(builds, stamp or _now_stamp())
    staging = builds / f".staging-{build_dir.name}-{os.getpid()}"
    if staging.exists():
        shutil.rmtree(staging)
    previous = _current_target(live)

    try:
        staging.mkdir(parents=True)
        _copy_tree(dist, staging / "web")
        _copy_tree(content, staging / "content")
        checks = smoke_check(staging)
        if build_dir.exists():
            raise PublishError(f"{build_dir}: appeared while publishing; refusing to clobber")
        os.replace(staging, build_dir)
        _fsync_dir(builds)

        _replace_symlink(live, build_dir)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise

    files, size = _tree_size(build_dir)
    removed = _prune(builds, live, keep)
    restarted = False
    if restart:
        try:
            restarted = (restart_runner or _restart_service)()
        except PublishError as exc:
            raise PublishError(
                f"{live.name} -> {build_dir.name}: published, but the service "
                f"restart failed: {exc}"
            ) from exc
    return PublishReport(
        build_dir=build_dir,
        current=live,
        previous=previous,
        checks=checks,
        files=files,
        bytes=size,
        seconds=time.perf_counter() - started,
        pruned=removed,
        restarted=restarted,
    )


def describe(report: PublishReport) -> str:
    """Plain-text summary for the CLI."""
    lines = [
        f"published {report.stamp}",
        f"  current -> {os.path.relpath(report.build_dir, report.current.parent)}",
        f"  previous: {report.previous or '-'}",
        f"  {report.files} files, {report.bytes / (1024 * 1024):.2f} MB, "
        f"{report.seconds:.2f}s",
    ]
    lines.extend(f"  check {check.name:<8} {check.path} ({check.detail})" for check in report.checks)
    if report.pruned:
        lines.append(f"  pruned: {', '.join(path.name for path in report.pruned)}")
    if report.restarted:
        lines.append(f"  restarted {SYSTEMD_UNIT}")
    return "\n".join(lines)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m pipeline.publish",
        description="Build the SPA, stage a version, verify it and swap `current`.",
    )
    parser.add_argument("--content-root", type=Path, default=DEFAULT_CONTENT_ROOT)
    parser.add_argument("--web-dist", type=Path, default=DEFAULT_WEB_DIST)
    parser.add_argument("--web-dir", type=Path, default=None)
    parser.add_argument("--builds-root", type=Path, default=DEFAULT_BUILDS_ROOT)
    parser.add_argument("--current", type=Path, default=DEFAULT_CURRENT)
    parser.add_argument(
        "--skip-web-build",
        action="store_true",
        help="publish the existing web/dist instead of running npm run build",
    )
    parser.add_argument("--keep", type=int, default=DEFAULT_KEEP, help="old builds to keep")
    parser.add_argument(
        "--restart",
        action="store_true",
        help=f"restart {SYSTEMD_UNIT} after the swap so uvicorn resolves the new tree",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        report = publish(
            content_root=args.content_root,
            web_dist=args.web_dist,
            web_dir=args.web_dir,
            builds_root=args.builds_root,
            current=args.current,
            web_build=not args.skip_web_build,
            keep=args.keep,
            restart=args.restart,
        )
    except PublishError as exc:
        print(f"publish: {exc}", file=sys.stderr)
        return 1
    print(describe(report))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry
    raise SystemExit(main())
