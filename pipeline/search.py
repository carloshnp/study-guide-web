"""Search corpus for the client-side index.

One document per chapter: the title and section headings kept intact (so a
title match can be ranked above a body match) and the body text stripped of
markdown and math delimiters. Code fences are dropped: they are samples, and
their identifiers would drown the prose in the MiniSearch index.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, Sequence

from pipeline.catalog import CatalogError, GuideEntry
from pipeline.split import Chapter

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_ROOT = REPO_ROOT / "content"

FENCE_RE = re.compile(r"^(?: {0,3})(`{3,}|~{3,})")
IMAGE_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")
HEADING_RE = re.compile(r"^(?: {0,3})#{1,6}\s+")
BLOCKQUOTE_RE = re.compile(r"^(?: {0,3})>\s?")
FOOTNOTE_RE = re.compile(r"\[\^[^\]]*\]")
EMPHASIS_RE = re.compile(r"\*{1,3}")
WHITESPACE_RE = re.compile(r"\s+")
TABLE_PIPE_RE = re.compile(r"\s*\|\s*")


def strip_markdown(markdown: str) -> str:
    """Plain text of a markdown block, safe for a search index."""
    kept: list[str] = []
    fence: str | None = None
    for raw_line in markdown.splitlines():
        marker = FENCE_RE.match(raw_line)
        if fence is None and marker is not None:
            fence = marker.group(1)
            continue
        if fence is not None:
            if (
                marker is not None
                and marker.group(1)[0] == fence[0]
                and len(marker.group(1)) >= len(fence)
            ):
                fence = None
            continue
        line = IMAGE_RE.sub(" ", raw_line)
        line = HEADING_RE.sub("", line)
        line = BLOCKQUOTE_RE.sub("", line)
        line = LINK_RE.sub(r"\1", line)
        line = FOOTNOTE_RE.sub(" ", line)
        line = EMPHASIS_RE.sub("", line)
        line = line.replace("`", "")
        line = line.replace("$$", " ").replace("$", " ")
        line = TABLE_PIPE_RE.sub(" ", line)
        if line.strip() in {"---", "***", "___", ""}:
            continue
        kept.append(line)
    return WHITESPACE_RE.sub(" ", " ".join(kept)).strip()


def chapter_headings(chapter: Chapter) -> list[str]:
    """Chapter title plus every section title, in document order."""
    return [chapter.title, *(section.title for section in chapter.flat_sections())]


def document_for_chapter(entry: GuideEntry, chapter: Chapter) -> dict[str, Any]:
    """One search document, shaped exactly as `content/search.json` expects."""
    return {
        "id": f"{entry.id}/{chapter.slug}",
        "guideId": entry.id,
        "guideTitle": entry.title,
        "chapterId": chapter.slug,
        "title": chapter.title,
        "headings": chapter_headings(chapter),
        "text": strip_markdown(chapter.markdown),
    }


def build_documents(
    entry: GuideEntry, chapters: Sequence[Chapter]
) -> list[dict[str, Any]]:
    """Search documents for one guide, one per chapter, in chapter order."""
    return [document_for_chapter(entry, chapter) for chapter in chapters]


def write_corpus(content_root: Path, documents: Sequence[dict[str, Any]]) -> Path:
    """Write ``content/search.json`` and return its path."""
    path = content_root / "search.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(documents, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    return path


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m pipeline.search",
        description="Rebuild content/search.json from the chapter JSON files.",
    )
    parser.add_argument("--content-root", type=Path, default=DEFAULT_CONTENT_ROOT)
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        documents = _documents_from_content(args.content_root)
    except (OSError, CatalogError, KeyError, ValueError) as exc:
        print(f"search failed: {exc}", file=sys.stderr)
        return 1
    path = write_corpus(args.content_root, documents)
    print(f"wrote {len(documents)} documents to {path}")
    return 0


def _documents_from_content(content_root: Path) -> list[dict[str, Any]]:
    """Derive the corpus from the built chapter JSON, without re-splitting."""
    index_path = content_root / "index.json"
    if not index_path.is_file():
        raise ValueError(f"{index_path}: build the content first (pipeline.build --all)")
    index = json.loads(index_path.read_text(encoding="utf-8"))
    documents: list[dict[str, Any]] = []
    for row in index["guides"]:
        guide_root = content_root / "guides" / row["id"]
        guide = json.loads((guide_root / "guide.json").read_text(encoding="utf-8"))
        for chapter in guide["chapters"]:
            chapter_payload = json.loads(
                (guide_root / "chapters" / f"{chapter['slug']}.json").read_text(encoding="utf-8")
            )
            documents.append(
                {
                    "id": f"{row['id']}/{chapter['slug']}",
                    "guideId": row["id"],
                    "guideTitle": row["title"],
                    "chapterId": chapter["slug"],
                    "title": chapter["title"],
                    "headings": [
                        chapter["title"],
                        *(section["title"] for section in chapter_payload["sections"]),
                    ],
                    "text": strip_markdown(chapter_payload["markdown"]),
                }
            )
    return documents


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
