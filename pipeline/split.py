"""Fence-aware heading scan and chapter units for the source guides.

The guides are markdown produced by the study-guide workflow, and they embed
python, rust and shell fences full of ``#`` comments. A line-based scan that
ignores fences turns those comments into chapters, which is the trap this
module exists to avoid.

Front matter blocks (``Índice``, ``Table of contents``, ``How to use this
guide``, ``Conventions``, ``A0 About this appendix``) belong to the guide
cover, not to chapters, so they are filtered by name.

Two structural rules go beyond a plain "split at level N" scan:

* part dividers (``# Part I: L0 Toolkit``) group the chapters that follow and
  are not chapters themselves;
* a heading *above* the split level that appears after the guide started its
  chapters (magnésio's ``# Banco de questões resolvidas``, ``# Referência
  rápida``, ``# Glossário``) is a chapter of its own, with a ``kind``, and its
  deeper headings become sections of it instead of chapters.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

MIN_LEVEL = 1
MAX_LEVEL = 6

FENCE_RE = re.compile(r"^(?P<indent> {0,3})(?P<fence>`{3,}|~{3,})(?P<info>.*)$")
ATX_RE = re.compile(r"^(?P<indent> {0,3})(?P<hashes>#{1,6})(?:[ \t]+(?P<title>.*?))?[ \t]*$")
CLOSING_HASHES_RE = re.compile(r"[ \t]+#+$")
WHITESPACE_RE = re.compile(r"\s+")
NUMBER_PREFIX_RE = re.compile(r"^(?P<number>\d+(?:\.\d+)*)\.?(?=\s|$)\s*")
CHAPTER_PREFIX_RE = re.compile(
    r"^(?:chapter|capitulo|capítulo|cap\.)\s+(?P<number>\d+)\s*[:.\-–—]\s*", re.IGNORECASE
)
SLUG_SEPARATORS_RE = re.compile(r"[^a-z0-9]+")

FRONT_MATTER_TITLES: frozenset[str] = frozenset(
    {
        "indice",
        "contents",
        "table of contents",
        "conventions",
        "how to use this guide",
        "a0 about this appendix",
    }
)

PART_RE = re.compile(r"^(?:part|parte|unidade|volume|livro|book|tomo)\b")

# Ordered: the first prefix that matches wins, so "referencia rapida" is not
# shadowed by a shorter pattern. Keys are normalized (unaccented, casefolded).
KIND_PREFIXES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("glossario", ("glossario", "glossary", "termos e definicoes", "indice remissivo")),
    ("banco", ("banco", "questao", "questoes", "question bank", "exercicios resolvidos",
               "lista de exercicios", "respostas")),
    ("referencia", ("referencia", "quick reference", "cheat sheet", "resumo", "formulario",
                    "formulas", "tabelas")),
    ("apendice", ("apendice", "appendix", "anexo", "mapa", "notas", "glossario de")),
)

CHAPTER_KINDS: tuple[str, ...] = ("teoria", "banco", "referencia", "glossario", "apendice")


@dataclass(frozen=True)
class Heading:
    """One heading of a guide, with the 1-based line where it appears."""

    level: int
    title: str
    line: int


@dataclass(frozen=True)
class Section:
    """One progress unit inside a chapter: an h2, h3 or h4 of the chapter."""

    id: str
    title: str
    level: int
    parent_id: str | None = None
    children: tuple["Section", ...] = ()

    def walk(self) -> list["Section"]:
        """Pre-order flattening, so the result stays in document order."""
        flat: list[Section] = [self]
        for child in self.children:
            flat.extend(child.walk())
        return flat

    def as_json(self) -> dict[str, object]:
        return {
            "id": self.id,
            "title": self.title,
            "level": self.level,
            "parentId": self.parent_id,
        }


@dataclass(frozen=True)
class Chapter:
    """A chapter unit: a heading at the split level (or a promoted appendix)."""

    id: str
    number: int
    title: str
    slug: str
    level: int
    kind: str
    part: str | None
    markdown: str
    sections: tuple[Section, ...] = ()

    def flat_sections(self) -> list[Section]:
        flat: list[Section] = []
        for section in self.sections:
            flat.extend(section.walk())
        return flat

    def as_summary(self) -> dict[str, object]:
        return {
            "id": self.id,
            "number": self.number,
            "title": self.title,
            "slug": self.slug,
            "part": self.part,
            "kind": self.kind,
            "sections": [section.as_json() for section in self.flat_sections()],
        }


@dataclass(frozen=True)
class SplitDocument:
    """The guide cover markdown plus the ordered chapters."""

    cover: str
    chapters: tuple[Chapter, ...]
    parts: tuple[str, ...] = ()


def normalize_title(title: str) -> str:
    """Case- and accent-insensitive key used for name comparisons."""
    decomposed = unicodedata.normalize("NFKD", title)
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    collapsed = WHITESPACE_RE.sub(" ", without_marks).strip().casefold()
    return collapsed.rstrip(":.")


def is_front_matter(title: str) -> bool:
    """True when a heading names a front matter block of the guide cover."""
    key = normalize_title(title)
    if key in FRONT_MATTER_TITLES:
        return True
    return key.startswith("how to use this guide") or key.startswith("a0 about")


def strip_numbering(title: str) -> tuple[str | None, str]:
    """Split ``"1.2 Título"`` into ``("1.2", "Título")``; ``(None, title)`` otherwise."""
    match = CHAPTER_PREFIX_RE.match(title)
    if match is not None:
        rest = title[match.end():].strip()
        return match.group("number"), rest or title
    match = NUMBER_PREFIX_RE.match(title)
    if match is not None:
        rest = title[match.end():].strip()
        if rest:
            return match.group("number"), rest
    return None, title


def slugify(text: str) -> str:
    """ASCII slug, accent-free and punctuation-free, as used by ids."""
    decomposed = unicodedata.normalize("NFKD", text)
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    slug = SLUG_SEPARATORS_RE.sub("-", without_marks.casefold()).strip("-")
    return slug


def classify_kind(title: str, *, fallback: str = "teoria") -> str:
    """Map a chapter title to one of ``CHAPTER_KINDS``."""
    _, rest = strip_numbering(title)
    key = normalize_title(rest)
    keys = [key]
    if ":" in key:
        # "Magnésio: referência rápida" is a quick reference, not an appendix.
        keys.append(key.split(":", 1)[1].strip())
    for kind, prefixes in KIND_PREFIXES:
        for candidate in keys:
            for prefix in prefixes:
                if (
                    candidate == prefix
                    or candidate.startswith(prefix + " ")
                    or candidate.startswith(prefix + ":")
                ):
                    return kind
    return fallback


def is_part_divider(title: str) -> bool:
    """True for ``Part I``/``Parte 2`` style dividers that group chapters."""
    _, rest = strip_numbering(title)
    return PART_RE.match(normalize_title(rest)) is not None


def _fence_marker(line: str) -> tuple[str, int, str] | None:
    match = FENCE_RE.match(line)
    if match is None:
        return None
    fence = match.group("fence")
    return fence[0], len(fence), match.group("info").strip()


def _clean_title(raw: str | None) -> str:
    if raw is None:
        return ""
    title = CLOSING_HASHES_RE.sub("", raw.strip())
    return title.strip()


def scan_headings(markdown: str) -> list[Heading]:
    """Return every ATX heading outside fenced code, in document order."""
    headings: list[Heading] = []
    open_fence: tuple[str, int] | None = None
    for lineno, line in enumerate(markdown.splitlines(), start=1):
        marker = _fence_marker(line)
        if open_fence is None:
            if marker is not None:
                open_fence = (marker[0], marker[1])
                continue
        else:
            if (
                marker is not None
                and marker[0] == open_fence[0]
                and marker[1] >= open_fence[1]
                and not marker[2]
            ):
                open_fence = None
            continue
        match = ATX_RE.match(line)
        if match is None:
            continue
        title = _clean_title(match.group("title"))
        if not title:
            continue
        headings.append(
            Heading(level=len(match.group("hashes")), title=title, line=lineno)
        )
    return headings


def front_matter_headings(markdown: str) -> list[Heading]:
    """Headings that belong to the guide cover rather than to a chapter."""
    return [heading for heading in scan_headings(markdown) if is_front_matter(heading.title)]


def chapter_headings(markdown: str, level: int) -> list[Heading]:
    """Headings that start a chapter, at the catalogued split level.

    Two kinds of heading are excluded even at the split level: front matter
    blocks, and the document title (the first heading of the document when it
    sits at the split level, as in the DSA guide, which splits at H1).
    """
    if not MIN_LEVEL <= level <= MAX_LEVEL:
        raise ValueError(f"split level must be between {MIN_LEVEL} and {MAX_LEVEL}, got {level}")
    headings = scan_headings(markdown)
    body = [heading for heading in headings if not is_front_matter(heading.title)]
    if body and headings and body[0] is headings[0] and body[0].level == level:
        body = body[1:]
    return [heading for heading in body if heading.level == level]


def count_chapters(markdown: str, level: int) -> int:
    """Number of chapter units a chapter split produces, appendices included.

    This is the number the catalog records in ``expected_chapters`` and the
    number `pipeline.build` emits, so the two can never disagree.
    """
    return len(split_units(markdown, level))


class _Node:
    """Mutable scaffolding for the immutable `Section` tree."""

    __slots__ = ("id", "title", "level", "children")

    def __init__(self, section_id: str, title: str, level: int) -> None:
        self.id = section_id
        self.title = title
        self.level = level
        self.children: list["_Node"] = []

    def freeze(self, parent_id: str | None = None) -> Section:
        return Section(
            id=self.id,
            title=self.title,
            level=self.level,
            parent_id=parent_id,
            children=tuple(child.freeze(self.id) for child in self.children),
        )


def _unique(base: str, seen: set[str]) -> str:
    candidate = base
    index = 2
    while candidate in seen:
        candidate = f"{base}-{index}"
        index += 1
    seen.add(candidate)
    return candidate


def _section_id(title: str, seen: set[str]) -> str:
    number, rest = strip_numbering(title)
    slug = slugify(rest) or "secao"
    base = f"{number.replace('.', '')}-{slug}" if number else slug
    return _unique(base, seen)


def _chapter_id(number: int, title: str, seen: set[str]) -> str:
    """Two-digit number plus the title slug; the id is also the file name."""
    _, rest = strip_numbering(title)
    slug = slugify(rest) or "capitulo"
    return _unique(f"{number:02d}-{slug}", seen)


def _sections(chapter_markdown: str, chapter_level: int) -> tuple[Section, ...]:
    roots: list[_Node] = []
    stack: list[_Node] = []
    seen: set[str] = set()
    for heading in scan_headings(chapter_markdown):
        if heading.level <= chapter_level or is_front_matter(heading.title):
            continue
        while stack and stack[-1].level >= heading.level:
            stack.pop()
        node = _Node(_section_id(heading.title, seen), heading.title, heading.level)
        if stack:
            stack[-1].children.append(node)
        else:
            roots.append(node)
        stack.append(node)
    return tuple(node.freeze() for node in roots)


def split_document(
    markdown: str, level: int, *, default_kind: str = "teoria"
) -> SplitDocument:
    """Split one guide into its cover markdown and its chapter units.

    ``level`` is the catalogued heading level that starts a chapter. Headings
    below it (h3/h4 and deeper) become nested sections of their chapter, and
    headings above it become appendices, grouped under their part divider when
    the guide declares one.
    """
    if not MIN_LEVEL <= level <= MAX_LEVEL:
        raise ValueError(f"split level must be between {MIN_LEVEL} and {MAX_LEVEL}, got {level}")
    if default_kind not in CHAPTER_KINDS:
        raise ValueError(
            f"default kind must be one of {', '.join(CHAPTER_KINDS)}, got {default_kind!r}"
        )

    lines = markdown.splitlines(keepends=True)
    headings = scan_headings(markdown)
    if not headings:
        return SplitDocument(cover=markdown.strip(), chapters=(), parts=())

    # The first heading of a guide is its document title, never a chapter.
    body_headings = headings[1:]
    boundaries: list[tuple[Heading, str, str | None]] = []
    parts: list[str] = []
    current_level: int | None = None
    current_part: str | None = None
    for heading in body_headings:
        if is_front_matter(heading.title):
            continue
        if current_level is None:
            if heading.level > level:
                continue  # preamble of the cover
        elif heading.level > current_level:
            continue  # a section, handled per chapter
        if heading.level < level and is_part_divider(heading.title):
            current_part = heading.title
            parts.append(heading.title)
            boundaries.append((heading, "part", current_part))
            continue
        if heading.level < level:
            kind = classify_kind(heading.title, fallback="apendice")
        else:
            kind = classify_kind(heading.title, fallback=default_kind)
        boundaries.append((heading, kind, current_part))
        current_level = heading.level

    if not boundaries:
        return SplitDocument(cover=markdown.strip(), chapters=(), parts=())

    first_line = boundaries[0][0].line
    cover = "".join(lines[: first_line - 1]).strip()

    chapters: list[Chapter] = []
    seen_ids: set[str] = set()
    number = 0
    for index, (heading, kind, part) in enumerate(boundaries):
        if kind == "part":
            continue
        next_line = (
            boundaries[index + 1][0].line if index + 1 < len(boundaries) else len(lines) + 1
        )
        chapter_markdown = "".join(lines[heading.line - 1 : next_line - 1]).strip()
        number += 1
        chapter_id = _chapter_id(number, heading.title, seen_ids)
        _, title = strip_numbering(heading.title)
        chapters.append(
            Chapter(
                id=chapter_id,
                number=number,
                title=title,
                slug=chapter_id,
                level=heading.level,
                kind=kind,
                part=part,
                markdown=chapter_markdown,
                sections=_sections(chapter_markdown, heading.level),
            )
        )
    return SplitDocument(cover=cover, chapters=tuple(chapters), parts=tuple(parts))


def split_units(
    markdown: str, level: int, *, default_kind: str = "teoria"
) -> list[Chapter]:
    """Chapter units of one guide, in document order (see `split_document`)."""
    return list(split_document(markdown, level, default_kind=default_kind).chapters)


# The seam named in SPEC.md, kept as the same function under its old name.
split_chapters = split_units
