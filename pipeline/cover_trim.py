"""Trim the cover down to what the guide page cannot already say.

The generated guides open with a metadata block (discipline, level, sources, date,
file name) and a manual index. The app shows the title and the same metadata in the
page header, and the chapter list below already is the index, so publishing both is
duplication: the reader scrolls past a second title, a block of bibliographic text
and a 337-item link list before reaching the first chapter.

What this does:

* drops blockquotes that carry the metadata labels, wherever they sit before the
  content;
* drops a section whose heading is an index (``Índice``, ``Table of contents``,
  ``Sumário``, ``Conteúdo``, ``Contents``, ``Index``) up to the next heading of the
  same or a higher level;
* keeps everything else (``How to use this guide`` and other narrative stays);
* drops the leading ``#`` title, because the page header already renders it;
* drops a leading blockquote, which is the build note ("generated from subsection
  files, do not edit by hand") rather than something a reader needs;
* returns an empty string when nothing else survives, so the page renders no empty
  cover section at all.

The metadata itself is not lost: ``pipeline.build`` keeps it in ``guide.json.meta``,
parsed from the untouched cover before this runs.
"""

from __future__ import annotations

import re

__all__ = ["INDEX_HEADING", "METADATA_LABELS", "trim_cover"]

#: Heading texts that mean "this is the manual index".
INDEX_HEADING = re.compile(
    r"^(?:índice|indice|sum[áa]rio|conte[úu]do|contents|table\s+of\s+contents|index)\b",
    re.IGNORECASE,
)

#: Labels that mark a blockquote as the guide metadata block.
METADATA_LABELS = (
    "disciplina",
    "nível",
    "nivel",
    "fontes",
    "gerado em",
    "arquivo",
    "professor",
)

HEADING = re.compile(r"^(#{1,6})\s+(.*)$")
HR = re.compile(r"^\s*(?:-{3,}|\*{3,}|_{3,})\s*$")

#: A leading blockquote is only a build note when it says so; a quotation stays.
NOTE = re.compile(
    r"generated from|do not edit|don't edit|rebuild with|automatically generated|"
    r"gerado automaticamente|n[ãa]o edite",
    re.IGNORECASE,
)


def _is_metadata_block(lines: list[str]) -> bool:
    text = "\n".join(line.lstrip("> ").strip() for line in lines).lower()
    hits = sum(1 for label in METADATA_LABELS if f"{label}:" in text or f"**{label}:**" in text)
    return hits >= 2


def _drop_metadata(lines: list[str]) -> list[str]:
    kept: list[str] = []
    index = 0
    total = len(lines)
    while index < total:
        if lines[index].lstrip().startswith(">"):
            block: list[str] = []
            while index < total and lines[index].lstrip().startswith(">"):
                block.append(lines[index])
                index += 1
            if not _is_metadata_block(block):
                kept.extend(block)
            continue
        kept.append(lines[index])
        index += 1
    return kept


def _drop_index_sections(lines: list[str]) -> list[str]:
    kept: list[str] = []
    index = 0
    total = len(lines)
    while index < total:
        match = HEADING.match(lines[index])
        if match and INDEX_HEADING.match(match.group(2).strip().rstrip(":")):
            level = len(match.group(1))
            index += 1
            while index < total:
                deeper = HEADING.match(lines[index])
                if deeper and len(deeper.group(1)) <= level:
                    break
                index += 1
            continue
        kept.append(lines[index])
        index += 1
    return kept


def _clean(lines: list[str]) -> str:
    """Collapse the blank gaps and separator runs the removals leave behind."""
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # A separator left directly after another separator, or at the edges, is noise.
    text = re.sub(r"(?:^|\n)(?:\s*-{3,}\s*\n)+\s*(?=-{3,})", "\n", text)
    text = re.sub(r"^(?:\s*-{3,}\s*\n)+", "", text)
    text = re.sub(r"\n(?:\s*-{3,}\s*\n?)+$", "\n", text)
    return text.strip()


def _drop_leading_title(lines: list[str]) -> list[str]:
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "":
            continue
        match = HEADING.match(stripped)
        if match and len(match.group(1)) == 1:
            return lines[:index] + lines[index + 1 :]
        return lines
    return lines


def _drop_leading_note(lines: list[str]) -> list[str]:
    """Remove the first block when it is a blockquote sitting before any body."""
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "":
            continue
        if not stripped.startswith(">"):
            return lines
        start = index
        block: list[str] = []
        while index < len(lines) and lines[index].strip().startswith(">"):
            block.append(lines[index])
            index += 1
        if not NOTE.search("\n".join(block)):
            return lines
        return lines[:start] + lines[index:]
    return lines


def _only_title_left(text: str) -> bool:
    body = text.strip()
    if body == "":
        return True
    for line in body.splitlines():
        stripped = line.strip()
        if stripped == "" or HEADING.match(stripped) or HR.match(stripped):
            continue
        return False
    return True


def trim_cover(markdown: str) -> str:
    """Return the cover with metadata and index removed, or ``""`` if nothing is left."""
    if not markdown.strip():
        return ""
    lines = _drop_index_sections(_drop_metadata(markdown.splitlines()))
    lines = _drop_leading_note(_drop_leading_title(lines))
    text = _clean(lines)
    return "" if _only_title_left(text) else text
