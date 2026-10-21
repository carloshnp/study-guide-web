"""The guide page removes the metadata block and the manual index from the cover.

Two things are being protected here: that the duplication disappears, and that a
cover carrying real prose ("How to use this guide") keeps it. The corpus test at
the bottom is the one that matters after a re-ingest, because a new guide can bring
a heading nobody anticipated.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline.cover_trim import trim_cover

CONTENT = Path(__file__).resolve().parents[2] / "content"

COVER = """# Metalurgia Física das Ligas Não Ferrosas: Titânio

> **Guia de estudo completo (teoria e banco de questões)**
>
> Disciplina: EET 428, Metalurgia Física | Professor Luiz Henrique de Almeida
>
> Nível: detalhado
>
> Fontes: `12 Titanio I - 2026.pdf` (29 slides), `13 Titanio II - 2026.pdf` (17 slides)
>
> Gerado em: 2026-10-13
>
> **Arquivo:** `titanio-final.md`

---

## Índice

1. [Titânio: características gerais](/g/titanio/c/01-titanio)
2. [Alotropia do titânio](/g/titanio/c/02-alotropia)

---
"""


def test_drops_metadata_and_index_leaves_nothing_behind() -> None:
    # Only the title and the index lived there, so the page shows no cover at all.
    assert trim_cover(COVER) == ""


def test_keeps_narrative_sections() -> None:
    narrative = (
        "# Foundations for L0 and L1: Study Guide\n\n"
        "> Nível: detalhado\n> Gerado em: 2026-10-13\n\n"
        "## How to use this guide\n\n"
        "Read the chapters in order, then use the question bank.\n"
    )
    result = trim_cover(narrative)
    assert "How to use this guide" in result
    assert "Read the chapters in order" in result
    assert "Gerado em" not in result
    assert not result.startswith("# Foundations"), "the page header already shows the title"


def test_keeps_sections_that_follow_the_index() -> None:
    markdown = (
        "# Guia\n\n"
        "## Índice\n\n1. [Capítulo um](/g/x/c/01)\n\n"
        "## Convenções\n\nSímbolos usados: α, β, γ.\n"
    )
    result = trim_cover(markdown)
    assert "Índice" not in result
    assert "Convenções" in result
    assert "Símbolos usados" in result


@pytest.mark.parametrize(
    "heading",
    ["## Índice", "## Indice", "## Sumário", "## Conteúdo", "## Table of contents", "## Contents", "### Index"],
)
def test_recognises_index_headings(heading: str) -> None:
    markdown = f"# Guia\n\n{heading}\n\n1. [Um](/g/x/c/01)\n\nFim.\n"
    assert "Um" not in trim_cover(markdown)


def test_keeps_a_heading_that_only_starts_like_an_index() -> None:
    markdown = "# Guia\n\n## Indicação de leitura\n\nComece pelo capítulo 2.\n"
    assert trim_cover(markdown) == "## Indicação de leitura\n\nComece pelo capítulo 2."


def test_drops_the_leading_title_only() -> None:
    markdown = "# Guia\n\n## Convenções\n\nSímbolos usados: α, β, γ.\n"
    result = trim_cover(markdown)
    assert "# Guia" not in result
    assert "Convenções" in result


def test_keeps_a_blockquote_that_is_not_metadata() -> None:
    # A quotation that happens to sit at the top is content, not a build note.
    markdown = "# Guia\n\n> Os diagramas seguem a norma ASTM E112.\n\n## Capítulo\n\nTexto.\n"
    result = trim_cover(markdown)
    assert "ASTM E112" in result


def test_drops_a_leading_build_note() -> None:
    markdown = (
        "# DSA Guide\n\n"
        "> Theory pass, generated from subsection files. Do not edit by hand; rebuild "
        "with scripts/build_guide.py.\n"
    )
    assert trim_cover(markdown) == ""


def test_empty_input_stays_empty() -> None:
    assert trim_cover("") == ""
    assert trim_cover("   \n\n") == ""


def test_corpus_covers_no_longer_publish_an_index() -> None:
    """After a build, no guide cover may still carry an index heading."""
    guides = sorted(CONTENT.glob("guides/*/guide.json"))
    if not guides:
        pytest.skip("no built content in this checkout")

    for path in guides:
        data = json.loads(path.read_text(encoding="utf-8"))
        markdown = data["cover"]["markdown"]
        assert "## Índice" not in markdown, f"{path.parent.name} still shows an index"
        assert "Table of contents" not in markdown, f"{path.parent.name} still shows an index"
        assert "Gerado em:" not in markdown, f"{path.parent.name} still shows the metadata block"
        # The metadata is not lost: it stays available for the page header.
        assert "generated" in data["meta"] or "sources" in data["meta"]
