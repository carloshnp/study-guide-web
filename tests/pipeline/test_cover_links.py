"""The cover index must link to pages that exist.

The guides ship a manual index written when one markdown file was one page, so
its links are ``#anchor`` references to headings that the split moved onto other
routes. These tests pin the rewrite that turns them into real chapter and section
URLs, and they run against the real corpus when ``data/`` is present, because the
failure mode (a correct-looking map that misses 12 of 325 entries) only shows up
on real headings.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from pipeline.cover_links import CoverLinkStats, normalize, rewrite_cover_anchors
from pipeline.split import Chapter, Section

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "guides"


def chapter(number: int, title: str, slug: str, sections: list[Section] | None = None) -> Chapter:
    return Chapter(
        id=f"g/{slug}",
        number=number,
        title=title,
        slug=slug,
        level=2,
        kind="teoria",
        part=None,
        markdown="",
        sections=tuple(sections or []),
    )


ALUMINIO = [
    chapter(1, "O alumínio como metal de engenharia", "01-o-aluminio-como-metal-de-engenharia"),
    chapter(2, "Classificação das ligas de alumínio", "02-classificacao-das-ligas-de-aluminio"),
]

DSA = [
    chapter(
        2,
        "Pseudocode and invariants",
        "02-pseudocode-and-invariants",
        [
            Section(id="21-loop-invariants", title="Loop invariants", level=3),
            Section(id="211-the-state", title="The state", level=4),
        ],
    )
]


def test_chapter_anchor_matched_by_title() -> None:
    markdown = "- [O alumínio como metal de engenharia](#1-o-alumínio-como-metal-de-engenharia)\n"
    rewritten, stats = rewrite_cover_anchors(markdown, guide_id="aluminio", chapters=ALUMINIO)

    assert "(/g/aluminio/c/01-o-aluminio-como-metal-de-engenharia)" in rewritten
    assert stats.chapters == 1 and stats.flattened == 0


def test_anchor_equal_to_slug() -> None:
    markdown = "[Classificação](#02-classificacao-das-ligas-de-aluminio)\n"
    rewritten, stats = rewrite_cover_anchors(markdown, guide_id="aluminio", chapters=ALUMINIO)

    assert "/g/aluminio/c/02-classificacao-das-ligas-de-aluminio" in rewritten
    assert stats.chapters == 1


def test_chapter_word_anchor_uses_the_number() -> None:
    markdown = "[Chapter 2: Pseudocode and invariants](#chapter-2-pseudocode-and-invariants)\n"
    rewritten, stats = rewrite_cover_anchors(markdown, guide_id="dsa", chapters=DSA)

    assert "/g/dsa/c/02-pseudocode-and-invariants" in rewritten
    assert stats.chapters == 1


def test_section_anchor_keeps_the_fragment() -> None:
    markdown = "- [1.1 Loop invariants](#21-loop-invariants)\n- [1.1.1 The state](#211-the-state)\n"
    rewritten, stats = rewrite_cover_anchors(markdown, guide_id="dsa", chapters=DSA)

    assert "/g/dsa/c/02-pseudocode-and-invariants#21-loop-invariants" in rewritten
    assert "/g/dsa/c/02-pseudocode-and-invariants#211-the-state" in rewritten
    assert stats.sections == 2


def test_unmatched_anchor_becomes_plain_text() -> None:
    markdown = "- [Seção que ninguém escreveu](#secao-fantasma)\n"
    rewritten, stats = rewrite_cover_anchors(markdown, guide_id="dsa", chapters=DSA)

    assert rewritten.strip() == "- Seção que ninguém escreveu"
    assert stats.flattened == 1
    assert "](#" not in rewritten


def test_anchor_to_the_cover_itself_is_left_alone() -> None:
    markdown = "## Índice\n\n[Voltar ao índice](#índice)\n"
    rewritten, stats = rewrite_cover_anchors(markdown, guide_id="dsa", chapters=DSA)

    assert "[Voltar ao índice](#índice)" in rewritten
    assert stats.kept == 1


def test_external_and_relative_links_are_untouched() -> None:
    markdown = "[arXiv](https://arxiv.org/abs/1706.03762) e [fonte](fontes/aula1.pdf)\n"
    rewritten, _ = rewrite_cover_anchors(markdown, guide_id="dsa", chapters=DSA)

    assert rewritten == markdown


def test_image_syntax_is_not_a_link() -> None:
    markdown = "![Figura 1](#figura-1)\n"
    rewritten, stats = rewrite_cover_anchors(markdown, guide_id="dsa", chapters=DSA)

    assert rewritten == markdown
    assert stats.total == 0


def test_normalize_folds_numbering_and_accents() -> None:
    assert normalize("#1 O alumínio como metal de engenharia") == normalize("O alumínio como metal de engenharia")
    assert normalize("Chapter 3: Python") == normalize("3. Python")


def test_stats_line_is_reportable() -> None:
    stats = CoverLinkStats(total=3, chapters=2, sections=1)
    assert "3 anchors" in stats.as_line("aluminio")


@pytest.mark.skipif(not DATA.is_dir(), reason="canonical corpus not present on this host")
def test_every_guide_cover_link_resolves_on_the_real_corpus() -> None:
    """No cover anchor may survive unless the cover itself provides the heading."""
    from pipeline.build import load_guide  # noqa: PLC0415 - heavy import, only for this test
    from pipeline.catalog import load as load_catalog  # noqa: PLC0415

    catalog = load_catalog(ROOT / "catalog.yaml")
    checked = 0
    for entry in catalog.guides:
        source = load_guide(entry, catalog, ROOT / "data")
        rewritten, stats = rewrite_cover_anchors(
            source.document.cover, guide_id=entry.id, chapters=source.document.chapters
        )
        assert stats.flattened == 0, f"{entry.id}: {stats.flattened} anchors had no target"
        for text, href in re.findall(r"(?<!!)\[([^\]]*)\]\((/[^)]+)\)", rewritten):
            route = href.split("#")[0]
            assert route.startswith("/g/"), href
            guide_id, _, chapter_slug = route.removeprefix("/g/").partition("/c/")
            assert guide_id == entry.id
            slugs = {chapter.slug for chapter in source.document.chapters}
            assert chapter_slug in slugs, f"{entry.id}: {text!r} → {href}"
        checked += stats.total
    assert checked >= 300
