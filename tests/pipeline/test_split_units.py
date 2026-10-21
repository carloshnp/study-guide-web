from __future__ import annotations

from pathlib import Path

import pytest

from pipeline.split import Section, split_document, split_units


def read(fixtures_dir: Path, name: str) -> str:
    return (fixtures_dir / name).read_text(encoding="utf-8")


def ids(sections: tuple[Section, ...]) -> list[str]:
    flat: list[str] = []
    for section in sections:
        flat.append(section.id)
        flat.extend(ids(section.children))
    return flat


def walk(sections: tuple[Section, ...]) -> list[Section]:
    flat: list[Section] = []
    for section in sections:
        flat.append(section)
        flat.extend(walk(section.children))
    return flat


def test_h2_chapters_carry_h3_sections(fixtures_dir: Path) -> None:
    chapters = split_units(read(fixtures_dir, "magnesio_h4.md"), 2)

    assert [c.id for c in chapters] == [
        "01-o-mg-entre-as-ligas-nao-ferrosas",
        "02-escolha-e-projeto-com-mg",
        "03-glossario-de-magnesio-eet-428",
    ]
    assert [c.title for c in chapters] == [
        "O Mg entre as ligas não ferrosas",
        "Escolha e projeto com Mg",
        "Glossário de magnésio (EET 428)",
    ]
    assert [c.number for c in chapters] == [1, 2, 3]
    assert [c.kind for c in chapters] == ["teoria", "teoria", "glossario"]
    first = chapters[0]
    assert [s.id for s in first.sections] == [
        "11-posicao-do-mg-no-mapa-das-ligas",
        "12-densidade-estrutura-hc-e-consequencias",
        "termos-introduzidos",
    ]
    assert [s.level for s in first.sections] == [3, 3, 3]
    assert all(s.parent_id is None for s in first.sections)


def test_h4_sections_nest_under_their_h3_parent(fixtures_dir: Path) -> None:
    chapters = split_units(read(fixtures_dir, "magnesio_h4.md"), 2)

    first = chapters[0]
    parent = first.sections[0]
    assert [(child.id, child.level, child.parent_id) for child in parent.children] == [
        ("o-panorama-das-ligas-nao-ferrosas", 4, "11-posicao-do-mg-no-mapa-das-ligas"),
        (
            "dois-eixos-de-leitura-metal-base-e-funcao",
            4,
            "11-posicao-do-mg-no-mapa-das-ligas",
        ),
    ]
    # Flattening keeps document order: parent, its children, then the next sibling.
    assert ids(first.sections) == [
        "11-posicao-do-mg-no-mapa-das-ligas",
        "o-panorama-das-ligas-nao-ferrosas",
        "dois-eixos-de-leitura-metal-base-e-funcao",
        "12-densidade-estrutura-hc-e-consequencias",
        "a-escala-de-densidade-dos-metais",
        "maclagem-baixa-ductilidade-e-implicacoes-de-fabricacao",
        "termos-introduzidos",
    ]
    # Every section here is an h3 or h4 unit, never a chapter again.
    assert {section.level for section in walk(first.sections)} == {3, 4}


def test_hash_inside_a_fence_never_becomes_a_section(fixtures_dir: Path) -> None:
    chapters = split_units(read(fixtures_dir, "llm_fence_trap.md"), 2)

    assert [c.id for c in chapters] == [
        "01-f0-1-vectors-dot-products-matrices-and-softmax",
        "02-f0-2-probability-distributions-calibration-and-proper-scoring-rules",
    ]
    section_ids = [s.id for c in chapters for s in c.sections]
    assert section_ids == [
        "1-vectors-what-they-are-and-how-to-read-the-notation",
        "2-the-dot-product",
        "3-random-variables-outcomes-and-events",
    ]
    assert "nested-fence-must-not-leak" not in section_ids
    assert "tilde-fence-trap" not in section_ids
    # The fenced code stays inside the chapter body, untouched.
    assert "# this comment is not a chapter" in chapters[0].markdown


def test_chapter_markdown_starts_at_its_heading_and_ends_before_the_next(
    fixtures_dir: Path,
) -> None:
    chapters = split_units(read(fixtures_dir, "dsa_flat.md"), 1)

    assert [c.title for c in chapters] == [
        "Restate and decompose",
        "Pseudocode and invariants",
    ]
    assert chapters[0].markdown.startswith("# Chapter 1: Restate and decompose")
    assert "## 1.1 Problem-solving habits" in chapters[0].markdown
    assert "Chapter 2" not in chapters[0].markdown
    assert chapters[1].markdown.startswith("# Chapter 2: Pseudocode and invariants")


def test_front_matter_belongs_to_the_cover_not_to_a_chapter(fixtures_dir: Path) -> None:
    document = split_document(read(fixtures_dir, "dsa_flat.md"), 1)

    assert document.cover.startswith("# DSA Guide: Algorithms and Data Structures")
    assert "## Table of contents" in document.cover
    assert "## Conventions" in document.cover
    assert "# Chapter 1" not in document.cover
    assert [c.id for c in document.chapters] == [
        "01-restate-and-decompose",
        "02-pseudocode-and-invariants",
    ]


def test_h1_appendix_after_chapters_is_its_own_chapter_with_a_kind() -> None:
    markdown = """# Guia

## 1. Teoria

Texto.

### 1.1 Detalhe

Texto.

# Banco de questões resolvidas: lista 2026

Introdução do banco.

## Questão 1

Enunciado um.

## Questão 2

Enunciado dois.

# Referência rápida

## 1. Densidades

Tabela.

# Glossário

Termo: definição.
"""

    chapters = split_units(markdown, 2)

    assert [(c.number, c.title, c.kind) for c in chapters] == [
        (1, "Teoria", "teoria"),
        (2, "Banco de questões resolvidas: lista 2026", "banco"),
        (3, "Referência rápida", "referencia"),
        (4, "Glossário", "glossario"),
    ]
    # The h2 questions under the appendix h1 are sections, not chapters.
    bank = chapters[1]
    assert bank.level == 1
    assert [(s.id, s.level) for s in bank.sections] == [
        ("questao-1", 2),
        ("questao-2", 2),
    ]
    assert "Introdução do banco." in bank.markdown
    assert "Questão 1" not in chapters[0].markdown
    # The last theory chapter no longer swallows the appendix headings.
    assert "# Banco de questões" not in chapters[0].markdown
    assert chapters[2].sections[0].id == "1-densidades"


def test_part_dividers_are_not_chapters(fixtures_dir: Path) -> None:
    markdown = (
        read(fixtures_dir, "llm_fence_trap.md")
        + "\n# Part II: L1 LLM and Transformer Foundations\n\n"
        + "## F1.1 Tokens and Vocabularies\n\nText.\n"
    )

    document = split_document(markdown, 2)

    assert [c.title for c in document.chapters] == [
        "F0.1 Vectors, Dot Products, Matrices and Softmax",
        "F0.2 Probability, Distributions, Calibration and Proper Scoring Rules",
        "F1.1 Tokens and Vocabularies",
    ]
    assert document.chapters[2].part == "Part II: L1 LLM and Transformer Foundations"
    assert document.chapters[0].part is None
    assert "Part II" not in document.chapters[2].markdown


def test_duplicate_section_titles_get_unique_stable_ids(fixtures_dir: Path) -> None:
    markdown = read(fixtures_dir, "magnesio_h4.md")
    # "Termos introduzidos" appears under both theory chapters; each chapter
    # gets the plain id, and a repeated title inside one chapter is suffixed.
    chapters = split_units(markdown, 2)
    assert [s.id for s in chapters[1].sections] == [
        "21-criterios-de-selecao",
        "termos-introduzidos",
    ]

    repeated = "# Guia\n\n## 1. Um\n\n### Alvo\n\nA\n\n### Alvo\n\nB\n"
    sections = split_units(repeated, 2)[0].sections
    assert [s.id for s in sections] == ["alvo", "alvo-2"]


def test_section_ids_are_ascii_slugs_without_accents_or_punctuation(
    fixtures_dir: Path,
) -> None:
    chapters = split_units(read(fixtures_dir, "magnesio_h4.md"), 2)

    for chapter in chapters:
        # The contract names the chapter file after the slug, and slug == id.
        assert chapter.slug == chapter.id
        for section in walk(chapter.sections):
            assert section.id == section.id.lower()
            assert all(ch.isalnum() or ch in "-_" for ch in section.id)


def test_split_level_must_be_in_range(fixtures_dir: Path) -> None:
    with pytest.raises(ValueError, match="split level"):
        split_units(read(fixtures_dir, "dsa_flat.md"), 0)
