"""Fail the build when an emitted image reference does not resolve.

Every ``/media/...`` reference in the generated JSON is checked against the
media cache: the chapter markdown, each entry of the image manifest and of
``sectionImages`` (``src``, ``srcset`` and ``original``), the guide cover markdown and the covers named by
``index.json``. A missing file is a build bug, so the check exits non-zero
instead of warning.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator

from pipeline.assets import IMAGE_RE

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_ROOT = REPO_ROOT / "content"
MEDIA_PREFIX = "/media/"


class CheckError(RuntimeError):
    """Raised when the content tree itself is unreadable."""


@dataclass(frozen=True)
class LinkProblem:
    """One image reference that points at a file which is not there."""

    file: Path
    link: str
    reason: str


def _image_links(markdown: str) -> Iterator[str]:
    for match in IMAGE_RE.finditer(markdown):
        link = match.group("link")
        if link.startswith("<") and link.endswith(">"):
            link = link[1:-1]
        if link.startswith(MEDIA_PREFIX):
            yield link


def _srcset_links(srcset: str) -> Iterator[str]:
    for candidate in srcset.split(","):
        link = candidate.strip().split(" ")[0]
        if link.startswith(MEDIA_PREFIX):
            yield link


def _json_files(content_root: Path) -> Iterator[Path]:
    index = content_root / "index.json"
    if index.is_file():
        yield index
    guides_root = content_root / "guides"
    if guides_root.is_dir():
        for guide_json in sorted(guides_root.glob("*/guide.json")):
            yield guide_json
        for chapter_json in sorted(guides_root.glob("*/chapters/*.json")):
            yield chapter_json


def _links_of(path: Path) -> Iterator[str]:
    """Every media link a generated JSON file makes, in file order."""
    payload: Any = json.loads(path.read_text(encoding="utf-8"))
    if path.name == "index.json":
        for guide in payload.get("guides", []):
            cover = guide.get("cover")
            if isinstance(cover, str) and cover.startswith(MEDIA_PREFIX):
                yield cover
        return
    if path.name == "guide.json":
        cover = payload.get("cover")
        if isinstance(cover, dict) and isinstance(cover.get("markdown"), str):
            yield from _image_links(cover["markdown"])
        return
    if isinstance(payload.get("markdown"), str):
        yield from _image_links(payload["markdown"])
    manifest: list[Any] = list(payload.get("images", []))
    for group in (payload.get("sectionImages") or {}).values():
        manifest.extend(group)
    for image in manifest:
        src = image.get("src")
        if isinstance(src, str) and src.startswith(MEDIA_PREFIX):
            yield src
        srcset = image.get("srcset")
        if isinstance(srcset, str):
            yield from _srcset_links(srcset)
        original = image.get("original")
        if isinstance(original, str) and original.startswith(MEDIA_PREFIX):
            yield original


def check_content(content_root: Path) -> list[LinkProblem]:
    """Return every broken media reference under `content_root`."""
    problems: list[LinkProblem] = []
    seen: set[tuple[Path, str]] = set()
    for path in _json_files(content_root):
        try:
            links = list(_links_of(path))
        except json.JSONDecodeError as exc:
            problems.append(LinkProblem(file=path, link="-", reason=f"invalid JSON: {exc}"))
            continue
        for link in links:
            if (path, link) in seen:
                continue
            seen.add((path, link))
            target = content_root / link.lstrip("/")
            if not target.is_file():
                problems.append(
                    LinkProblem(file=path, link=link, reason="media file not found")
                )
    return problems


def describe(problems: Iterable[LinkProblem]) -> str:
    return "\n".join(
        f"{problem.file}: {problem.link} ({problem.reason})" for problem in problems
    )


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m pipeline.check_links",
        description="Fail when a generated image reference does not resolve.",
    )
    parser.add_argument("--content-root", type=Path, default=DEFAULT_CONTENT_ROOT)
    args = parser.parse_args(list(argv) if argv is not None else None)

    index = args.content_root / "index.json"
    if not index.is_file():
        print(f"check failed: {index}: build the content first", file=sys.stderr)
        return 1
    problems = check_content(args.content_root)
    if problems:
        print(f"{len(problems)} broken media reference(s):", file=sys.stderr)
        print(describe(problems), file=sys.stderr)
        return 1
    print(f"all media references resolve under {args.content_root}")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
