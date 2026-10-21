"""Rewrites the authored index on a guide cover into working links.

Every merged guide opens with a manual index whose links are in-page anchors
(``[O alumínio como metal de engenharia](#1-o-alumínio-como-metal-de-engenharia)``),
written when the whole guide was one page. After the build splits the guide into
chapter pages, those anchors point at nothing: the browser stays put and the
reader concludes the index is broken.

The index itself is worth keeping — it carries the author's numbering and, in the
DSA guide, 325 entries down to h4. So each anchor is resolved against the ids the
build just produced and rewritten to a real route:

* a chapter slug or title          → ``/g/<id>/c/<chapter-slug>``
* a section id                     → ``/g/<id>/c/<chapter-slug>#<section-id>``
* an anchor that still exists on the cover itself (an ``Índice`` heading, say)
                                   → untouched
* anything else                    → plain text, with the anchor removed

Dropping an unresolvable anchor instead of keeping the raw href is deliberate: a
link that does nothing is worse than no link, and a future guide can re-add one
once its target exists.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Sequence

from pipeline.split import Chapter, slugify

LINK_RE = re.compile(r"(?<!!)\[(?P<text>[^\]]*)\]\((?P<href>#[^)\s]+)\)")
ATX_RE = re.compile(r"^ {0,3}#{1,6}[ \t]+(?P<title>.*?)[ \t]*#*[ \t]*$")
CHAPTER_WORD_RE = re.compile(r"^(?:capitulo|capítulo|chapter|parte|part)\s+\d+\s*[:.\-–—]?\s*")
NUMBERING_RE = re.compile(r"^\d+(?:\.\d+)*\.?\s+")
CHAPTER_ANCHOR_RE = re.compile(r"^chapter\s+(\d+)\b")


@dataclass(frozen=True)
class CoverLinkStats:
    """What the rewrite did, so the build can report it."""

    total: int = 0
    chapters: int = 0
    sections: int = 0
    kept: int = 0
    flattened: int = 0

    @property
    def rewritten(self) -> int:
        return self.chapters + self.sections

    def as_line(self, guide_id: str) -> str:
        return (
            f"cover links {guide_id}: {self.total} anchors → "
            f"{self.chapters} chapters, {self.sections} sections, "
            f"{self.kept} kept, {self.flattened} plain text"
        )


def normalize(text: str) -> str:
    """Fold accents, case, numbering and separators so two labels compare."""
    folded = unicodedata.normalize("NFD", text)
    folded = "".join(char for char in folded if not unicodedata.combining(char))
    folded = folded.replace("_", " ").replace("-", " ").strip().lower().lstrip("#").strip()
    folded = CHAPTER_WORD_RE.sub("", folded)
    folded = NUMBERING_RE.sub("", folded)
    return re.sub(r"[^a-z0-9]+", "", folded)


def _cover_ids(markdown: str) -> set[str]:
    """Anchor ids the cover itself still provides (its own headings)."""
    ids: set[str] = set()
    for line in markdown.splitlines():
        match = ATX_RE.match(line)
        if match is None:
            continue
        title = match.group("title")
        if title:
            ids.add(slugify(title))
            ids.add(normalize(title))
    return ids


def _chapter_targets(chapters: Sequence[Chapter]) -> tuple[dict[str, str], dict[int, str], dict[str, str]]:
    by_label: dict[str, str] = {}
    by_number: dict[int, str] = {}
    section_owner: dict[str, str] = {}
    for chapter in chapters:
        by_number[chapter.number] = chapter.slug
        for label in (chapter.title, chapter.slug):
            key = normalize(label)
            if key:
                by_label.setdefault(key, chapter.slug)
        for section in chapter.flat_sections():
            section_owner[section.id] = chapter.slug
    return by_label, by_number, section_owner


def rewrite_cover_anchors(
    markdown: str, *, guide_id: str, chapters: Sequence[Chapter]
) -> tuple[str, CoverLinkStats]:
    """Point every cover index anchor at the chapter or section it names."""
    by_label, by_number, section_owner = _chapter_targets(chapters)
    cover_ids = _cover_ids(markdown)

    counts = {"chapters": 0, "sections": 0, "kept": 0, "flattened": 0}

    def replace(match: re.Match[str]) -> str:
        text = match.group("text")
        anchor = match.group("href")[1:]

        owner = section_owner.get(anchor)
        if owner is not None:
            counts["sections"] += 1
            return f"[{text}](/g/{guide_id}/c/{owner}#{anchor})"

        slug = by_label.get(normalize(anchor))
        if slug is None:
            numbered = CHAPTER_ANCHOR_RE.match(normalize_words(anchor))
            if numbered is not None:
                slug = by_number.get(int(numbered.group(1)))
        if slug is None:
            slug = by_label.get(normalize(text))
        if slug is not None:
            counts["chapters"] += 1
            return f"[{text}](/g/{guide_id}/c/{slug})"

        if anchor in cover_ids or normalize(anchor) in cover_ids:
            counts["kept"] += 1
            return match.group(0)

        counts["flattened"] += 1
        return text

    rewritten = LINK_RE.sub(replace, markdown)
    total = sum(counts.values())
    return rewritten, CoverLinkStats(
        total=total,
        chapters=counts["chapters"],
        sections=counts["sections"],
        kept=counts["kept"],
        flattened=counts["flattened"],
    )


def normalize_words(text: str) -> str:
    """Keep word boundaries, so ``chapter-1-x`` can be matched by number."""
    folded = unicodedata.normalize("NFD", text)
    folded = "".join(char for char in folded if not unicodedata.combining(char))
    return folded.replace("-", " ").replace("_", " ").lower()
