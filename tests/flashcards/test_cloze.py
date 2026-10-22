"""T04: cloze syntax - one card per lacuna."""

from __future__ import annotations

import pytest

from app.flashcards import cloze

TEXT = "A {{c1::perlita}} e formada por {{c2::ferrita}} e {{c3::cementita}}."


def test_parse_cloze_returns_one_gap_per_number() -> None:
    gaps = cloze.parse_cloze(TEXT)

    assert [gap.number for gap in gaps] == [1, 2, 3]
    assert [gap.answer for gap in gaps] == ["perlita", "ferrita", "cementita"]


def test_parse_cloze_dedupes_repeated_numbers() -> None:
    gaps = cloze.parse_cloze("{{c1::A}} e {{c1::B}} e {{c2::C}}")

    assert [gap.number for gap in gaps] == [1, 2]
    assert [gap.answer for gap in gaps] == ["A", "B"][:1] + ["C"]


def test_parse_cloze_reads_hints() -> None:
    gaps = cloze.parse_cloze("O metal e {{c1::aluminio::o mais leve}}.")

    assert gaps[0].answer == "aluminio"
    assert gaps[0].hint == "o mais leve"


def test_parse_cloze_keeps_the_markdown_around_the_gaps() -> None:
    text = "**Dureza** de {{c1::`HB`}} (ver $\\sigma_y$)"
    gaps = cloze.parse_cloze(text)

    assert gaps[0].answer == "`HB`"
    assert cloze.parse_cloze(text)[0].number == 1


def test_parse_cloze_without_gaps_returns_nothing() -> None:
    assert cloze.parse_cloze("sem lacunas") == []
    assert cloze.has_gaps("sem lacunas") is False
    assert cloze.has_gaps(TEXT) is True


@pytest.mark.parametrize("text", ["{{c1::}}", "{{c1::   }}", "{{cX::valor}}", "{{c1::sem fechar"])
def test_malformed_cloze_raises(text: str) -> None:
    with pytest.raises(cloze.ClozeSyntaxError):
        cloze.parse_cloze(text)


def test_card_templates_are_one_per_lacuna() -> None:
    assert cloze.card_templates("cloze", TEXT) == ["cloze:c1", "cloze:c2", "cloze:c3"]
    assert cloze.card_templates("basic", "F") == ["basic"]
    assert cloze.card_templates("basic-reverse", "F") == ["basic", "reverse"]


def test_render_question_hides_only_the_target_gap() -> None:
    assert cloze.render_question(TEXT, 1) == "A [...] e formada por ferrita e cementita."
    assert cloze.render_question(TEXT, 3) == "A perlita e formada por ferrita e [...]."


def test_render_question_uses_the_hint_when_present() -> None:
    text = "O metal e {{c1::aluminio::o mais leve}}."

    assert cloze.render_question(text, 1) == "O metal e [o mais leve]."


def test_render_answer_fills_every_gap() -> None:
    assert cloze.render_answer(TEXT, 1) == "A perlita e formada por ferrita e cementita."


def test_cloze_numbers_are_sorted_and_unique() -> None:
    assert cloze.cloze_numbers("{{c3::c}} {{c1::a}} {{c3::c2}}") == [1, 3]
