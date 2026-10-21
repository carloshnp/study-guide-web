from __future__ import annotations

from pathlib import Path

from pipeline.split import (
    Heading,
    chapter_headings,
    classify_kind,
    count_chapters,
    is_front_matter,
    scan_headings,
    split_document,
)


def read(fixtures_dir: Path, name: str) -> str:
    return (fixtures_dir / name).read_text(encoding="utf-8")


def test_scan_returns_level_title_and_one_based_line() -> None:
    markdown = "# Title\n\ntext\n\n## First\n\n### Deep *thing*\n\n## Second ##\n"

    assert scan_headings(markdown) == [
        Heading(level=1, title="Title", line=1),
        Heading(level=2, title="First", line=5),
        Heading(level=3, title="Deep *thing*", line=7),
        Heading(level=2, title="Second", line=9),
    ]


def test_hash_inside_fences_never_counts(fixtures_dir: Path) -> None:
    headings = scan_headings(read(fixtures_dir, "llm_fence_trap.md"))

    titles = [h.title for h in headings]
    assert "this comment is not a chapter" not in titles
    assert "neither is this one" not in titles
    assert "3. Matrices as batches of dot products" not in titles
    assert "Also not a chapter" not in titles
    assert "nested fence must not leak" not in titles
    assert [h.title for h in headings if h.level == 2] == [
        "How to use this guide",
        "F0.1 Vectors, Dot Products, Matrices and Softmax",
        "F0.2 Probability, Distributions, Calibration and Proper Scoring Rules",
    ]


def test_tilde_fence_is_immune(fixtures_dir: Path) -> None:
    markdown = read(fixtures_dir, "llm_fence_trap.md")

    assert "tilde fence trap" not in [h.title for h in scan_headings(markdown)]


def test_nested_backtick_fence_does_not_leak(fixtures_dir: Path) -> None:
    markdown = "````markdown\n```python\n## inner\n```\n````\n\n## real\n"

    assert [h.title for h in scan_headings(markdown)] == ["real"]


def test_front_matter_titles_are_recognised_case_and_accent_insensitively() -> None:
    assert is_front_matter("Índice")
    assert is_front_matter("indice")
    assert is_front_matter("  ÍNDICE  ")
    assert is_front_matter("How to use this guide")
    assert is_front_matter("Contents")
    assert is_front_matter("Table of contents")
    assert is_front_matter("Conventions")
    assert is_front_matter("A0 About this appendix")
    assert not is_front_matter("1. O alumínio como metal de engenharia")
    assert not is_front_matter("F0.1 Vectors")


def test_front_matter_blocks_are_not_chapters(fixtures_dir: Path) -> None:
    llm = read(fixtures_dir, "llm_fence_trap.md")
    assert [h.title for h in chapter_headings(llm, 2)] == [
        "F0.1 Vectors, Dot Products, Matrices and Softmax",
        "F0.2 Probability, Distributions, Calibration and Proper Scoring Rules",
    ]

    dsa = read(fixtures_dir, "dsa_flat.md")
    assert [h.title for h in chapter_headings(dsa, 2)] == [
        "1.1 Problem-solving habits",
        "1.6 Exercises",
        "2.1 Loop invariants and the three obligations",
        "2.6 Exercises",
    ]


def test_dsa_split_one_drops_the_document_title_not_a_chapter(fixtures_dir: Path) -> None:
    dsa = read(fixtures_dir, "dsa_flat.md")

    chapters = chapter_headings(dsa, 1)

    assert [h.title for h in chapters] == [
        "Chapter 1: Restate and decompose",
        "Chapter 2: Pseudocode and invariants",
    ]
    assert [h.line for h in chapters] == [12, 24]


def test_magnesio_structure_counts_h2_chapters_and_h4_units(fixtures_dir: Path) -> None:
    magnesio = read(fixtures_dir, "magnesio_h4.md")

    # Two h2 chapters plus the trailing h1 glossary, which `split_document`
    # promotes to a chapter of its own (kind="glossario"); `chapter_headings`
    # still lists only the plain split-level headings.
    assert count_chapters(magnesio, 2) == 3
    assert [h.title for h in chapter_headings(magnesio, 2)] == [
        "1. O Mg entre as ligas não ferrosas",
        "2. Escolha e projeto com Mg",
    ]
    h4 = [h.title for h in scan_headings(magnesio) if h.level == 4]
    assert h4 == [
        "O panorama das ligas não ferrosas",
        "Dois eixos de leitura: metal base e função",
        "A escala de densidade dos metais",
        "Maclagem, baixa ductilidade e implicações de fabricação",
        "Resistência específica",
        "Corrosão galvânica",
    ]
    # The trailing glossary is an H1, above the split level: not a chapter.
    assert "Glossário de magnésio (EET 428)" not in [h.title for h in chapter_headings(magnesio, 2)]


def test_four_space_indented_hash_is_code_not_a_heading() -> None:
    markdown = "    # indented code\n\n#\tTabbed heading\n"

    assert scan_headings(markdown) == [Heading(level=1, title="Tabbed heading", line=3)]


def test_kind_is_named_after_a_comma_separated_segment() -> None:
    assert classify_kind("Cálculo Numérico: Módulo 1, Séries de Taylor, Banco de Questões") == "banco"
    assert classify_kind("Cálculo Numérico: Módulo 4, Glossário") == "glossario"


def test_heading_without_text_is_ignored() -> None:
    markdown = "#\n##   \n### Real\n"

    assert [h.title for h in scan_headings(markdown)] == ["Real"]


def test_numbered_first_heading_is_a_chapter_not_the_document_title() -> None:
    markdown = (
        "## 15. Banco de Questões\n\n"
        "texto do banco\n\n"
        "### Questão 1\n\n"
        "enunciado\n"
    )

    document = split_document(markdown, 2)

    assert [chapter.title for chapter in document.chapters] == ["Banco de Questões"]
    assert document.cover == ""


def test_document_with_a_single_heading_is_one_chapter() -> None:
    markdown = (
        "# Cálculo Numérico: Módulo 3, Banco de Questões\n\n"
        "abertura\n\n"
        "### Questão 1\n\n"
        "enunciado\n"
    )

    document = split_document(markdown, 2, default_kind="banco")

    assert [chapter.title for chapter in document.chapters] == [
        "Cálculo Numérico: Módulo 3, Banco de Questões"
    ]
    assert document.chapters[0].kind == "banco"
    assert [section.title for section in document.chapters[0].flat_sections()] == ["Questão 1"]


def test_heading_at_split_level_without_body_is_a_divider() -> None:
    markdown = (
        "# Guia\n\n"
        "## Resumo\n\n"
        "## 1. Primeiro capítulo\n\n"
        "corpo\n\n"
        "## Questões\n\n"
        "## Lista 1\n\n"
        "corpo da lista\n"
    )

    document = split_document(markdown, 2)

    assert [chapter.title for chapter in document.chapters] == [
        "Primeiro capítulo",
        "Lista 1",
    ]


def test_chapter_with_sections_but_no_own_text_is_not_a_divider() -> None:
    markdown = (
        "# Guia\n\n"
        "## 1. Capítulo\n\n"
        "### Seção\n\n"
        "corpo\n"
    )

    document = split_document(markdown, 2)

    assert [chapter.title for chapter in document.chapters] == ["Capítulo"]
