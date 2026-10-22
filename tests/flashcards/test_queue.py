"""T03: due selection, interleaving, session bounds, training mode and decks."""

from __future__ import annotations

import sqlite3
from datetime import timedelta

import pytest

from app.flashcards import db as fdb
from app.flashcards import queue as fqueue
from app.flashcards import scheduler as sched

NOW = sched.as_datetime("2026-10-22T12:00:00Z")


def add_card(
    conn: sqlite3.Connection,
    *,
    guide: str | None = "magnesio",
    chapter: str | None = "01-estrutura",
    section: str | None = "31-perlita",
    template: str = "basic",
    state: str = "review",
    due_minutes: int = 0,
    due_days: int = 0,
    stability: float = 50.0,
    front: str = "O que e perlita?",
    back: str = "Lamelas de ferrita e cementita.",
) -> int:
    note_id = fdb.create_note(
        conn,
        kind="basic",
        front=front,
        back=back,
        guide_id=guide,
        chapter_slug=chapter,
        section_id=section,
        now=sched.iso(NOW),
    )
    card_id = fdb.create_card(
        conn, note_id=note_id, template=template, state=state, now=sched.iso(NOW)
    )
    due = NOW + timedelta(minutes=due_minutes, days=due_days)
    fdb.update_card(
        conn,
        card_id,
        {
            "state": state,
            "due": sched.iso(due),
            "stability": stability,
            "last_review": sched.iso(NOW - timedelta(days=5)),
        },
    )
    return card_id


def ids(session: fqueue.Session) -> list[int]:
    return [row["id"] for row in session.cards]


# ------------------------------------------------------------------ due selection


def test_due_cards_are_ordered_by_due_then_id(conn: sqlite3.Connection) -> None:
    late = add_card(conn, due_minutes=-5)
    early_a = add_card(conn, due_minutes=-30)
    early_b = add_card(conn, due_minutes=-30)

    rows = fqueue.due_cards(conn, now=NOW)

    assert [row["id"] for row in rows] == [early_a, early_b, late]


def test_due_cards_exclude_future_suspended_and_deprecated(conn: sqlite3.Connection) -> None:
    due = add_card(conn, due_minutes=-1)
    add_card(conn, due_minutes=30)
    add_card(conn, due_minutes=-1, state="suspended")
    add_card(conn, due_minutes=-1, state="deprecated")

    rows = fqueue.due_cards(conn, now=NOW)

    assert [row["id"] for row in rows] == [due]


def test_due_cards_exclude_new_cards(conn: sqlite3.Connection) -> None:
    add_card(conn, state="new", due_minutes=0)
    review = add_card(conn, due_minutes=-1)

    assert [row["id"] for row in fqueue.due_cards(conn, now=NOW)] == [review]


def test_scope_guide_filters(conn: sqlite3.Connection) -> None:
    magnesio = add_card(conn, due_minutes=-1)
    add_card(conn, guide="dsa", due_minutes=-1)

    rows = fqueue.due_cards(conn, scope=fqueue.parse_scope("guide:magnesio"), now=NOW)

    assert [row["id"] for row in rows] == [magnesio]


def test_scope_chapter_filters(conn: sqlite3.Connection) -> None:
    wanted = add_card(conn, due_minutes=-1)
    add_card(conn, chapter="02-propriedades", due_minutes=-1)

    rows = fqueue.due_cards(conn, scope=fqueue.parse_scope("chapter:magnesio:01-estrutura"), now=NOW)

    assert [row["id"] for row in rows] == [wanted]


def test_scope_section_filters(conn: sqlite3.Connection) -> None:
    wanted = add_card(conn, due_minutes=-1)
    add_card(conn, section="32-cementita", due_minutes=-1)

    rows = fqueue.due_cards(
        conn, scope=fqueue.parse_scope("section:magnesio:01-estrutura:31-perlita"), now=NOW
    )

    assert [row["id"] for row in rows] == [wanted]


@pytest.mark.parametrize("raw", ["bogus", "guide:", "chapter:only-guide", "section:a:b", ""])
def test_invalid_scopes_are_rejected(raw: str) -> None:
    with pytest.raises(fqueue.InvalidScope):
        fqueue.parse_scope(raw)


def test_scope_all_is_the_default() -> None:
    scope = fqueue.parse_scope(None)

    assert scope.kind == "all"
    assert scope.guide_id is None


# --------------------------------------------------------------------- interleave


def test_interleaving_round_robins_between_guides(conn: sqlite3.Connection) -> None:
    a1 = add_card(conn, due_minutes=-9)
    a2 = add_card(conn, due_minutes=-7)
    a3 = add_card(conn, due_minutes=-5)
    b1 = add_card(conn, guide="dsa", due_minutes=-8)
    b2 = add_card(conn, guide="dsa", due_minutes=-6)
    b3 = add_card(conn, guide="dsa", due_minutes=-4)

    rows = fqueue.due_cards(conn, now=NOW)
    ordered = fqueue.interleave(rows)

    assert [row["id"] for row in ordered] == [a1, b1, a2, b2, a3, b3]


def test_interleaving_keeps_due_order_inside_a_guide(conn: sqlite3.Connection) -> None:
    first = add_card(conn, due_minutes=-9)
    second = add_card(conn, due_minutes=-3)

    ordered = fqueue.interleave(fqueue.due_cards(conn, now=NOW))

    assert [row["id"] for row in ordered] == [first, second]


def test_interleaving_includes_standalone_cards(conn: sqlite3.Connection) -> None:
    standalone = add_card(conn, guide=None, chapter=None, section=None, due_minutes=-1)
    anchored = add_card(conn, due_minutes=-2)

    ordered = fqueue.interleave(fqueue.due_cards(conn, now=NOW))

    assert [row["id"] for row in ordered] == [anchored, standalone]


# ----------------------------------------------------------------------- sessions


def test_session_is_capped_at_twenty_cards_and_reports_more(conn: sqlite3.Connection) -> None:
    created = [add_card(conn, due_minutes=-60 + index) for index in range(25)]

    session = fqueue.build_session(conn, now=NOW)

    assert len(session.cards) == 20
    assert session.has_more is True
    assert session.session_mode == "review"
    assert session.next_cursor == created[19]


def test_continue_with_a_cursor_returns_the_next_batch(conn: sqlite3.Connection) -> None:
    created = [add_card(conn, due_minutes=-60 + index) for index in range(25)]
    first = fqueue.build_session(conn, now=NOW)

    second = fqueue.build_session(conn, now=NOW, cursor=first.next_cursor)

    assert ids(second) == created[20:]
    assert second.has_more is False
    assert second.next_cursor is None


def test_cursor_for_a_card_already_reviewed_keeps_paging(conn: sqlite3.Connection) -> None:
    created = [add_card(conn, due_minutes=-60 + index) for index in range(4)]
    first = fqueue.build_session(conn, now=NOW, limit=2)
    assert ids(first) == created[:2]

    sched.apply_review(conn, created[0], 3, now=NOW)

    second = fqueue.build_session(conn, now=NOW, limit=2, cursor=first.next_cursor)

    assert ids(second) == created[2:]


def test_session_respects_a_custom_limit(conn: sqlite3.Connection) -> None:
    for index in range(6):
        add_card(conn, due_minutes=-60 + index)

    session = fqueue.build_session(conn, now=NOW, limit=3)

    assert len(session.cards) == 3
    assert session.has_more is True


def test_session_injects_new_cards_up_to_the_daily_limit(conn: sqlite3.Connection) -> None:
    add_card(conn, state="new")
    add_card(conn, state="new")

    session = fqueue.build_session(conn, now=NOW)

    assert len(session.cards) == 2
    assert {row["state"] for row in session.cards} == {"new"}


def test_daily_new_limit_is_reduced_by_todays_new_reviews(conn: sqlite3.Connection) -> None:
    fdb.save_settings(conn, {"dailyNewLimit": 3})
    for _ in range(2):
        add_card(conn, state="new")
    fdb.record_review(conn, day="2026-10-22")
    fdb.record_review(conn, day="2026-10-22", is_new=True)
    fdb.record_review(conn, day="2026-10-22", is_new=True)

    session = fqueue.build_session(conn, now=NOW)

    assert len(session.cards) == 1


def test_exhausted_new_limit_hides_new_cards(conn: sqlite3.Connection) -> None:
    fdb.save_settings(conn, {"dailyNewLimit": 1})
    add_card(conn, state="new")
    fdb.record_review(conn, day="2026-10-22", is_new=True)

    assert fqueue.build_session(conn, now=NOW).cards == []


# ------------------------------------------------------------------ training mode


def test_training_mode_returns_the_whole_deck_in_a_deterministic_shuffle(
    conn: sqlite3.Connection,
) -> None:
    created = [add_card(conn, due_minutes=60 * index, state="new" if index % 2 else "review") for index in range(12)]

    first = fqueue.build_session(conn, now=NOW, mode="training", limit=100)
    second = fqueue.build_session(conn, now=NOW, mode="training", limit=100)

    assert sorted(ids(first)) == sorted(created)
    assert ids(first) == ids(second)
    assert ids(first) != sorted(created)
    assert first.session_mode == "training"


def test_training_mode_shuffle_changes_with_the_day(conn: sqlite3.Connection) -> None:
    for index in range(12):
        add_card(conn, due_minutes=index)

    today = fqueue.build_session(conn, now=NOW, mode="training", limit=100)
    tomorrow = fqueue.build_session(
        conn, now=NOW + timedelta(days=1), mode="training", limit=100
    )

    assert ids(today) != ids(tomorrow)


def test_training_mode_can_be_paginated_with_a_cursor(conn: sqlite3.Connection) -> None:
    created = [add_card(conn, due_minutes=index) for index in range(6)]
    first = fqueue.build_session(conn, now=NOW, mode="training", limit=4)

    second = fqueue.build_session(conn, now=NOW, mode="training", limit=4, cursor=first.next_cursor)

    assert len(first.cards) == 4
    assert len(second.cards) == 2
    assert set(ids(first)) | set(ids(second)) == set(created)


def test_training_mode_excludes_suspended_and_deprecated(conn: sqlite3.Connection) -> None:
    keep = add_card(conn, state="new")
    add_card(conn, state="suspended")
    add_card(conn, state="deprecated")

    session = fqueue.build_session(conn, now=NOW, mode="training", limit=100)

    assert ids(session) == [keep]


def test_building_a_session_never_writes(conn: sqlite3.Connection) -> None:
    card = add_card(conn, due_minutes=-1)
    before = dict(fdb.get_card(conn, card))

    fqueue.build_session(conn, now=NOW, mode="training", limit=100)
    fqueue.build_session(conn, now=NOW)

    assert dict(fdb.get_card(conn, card)) == before


# --------------------------------------------------------------------------- decks


def build_deck_fixture(conn: sqlite3.Connection) -> dict[str, int]:
    cards = {
        "m1": add_card(conn, section="31-perlita", due_minutes=-3),
        "m2": add_card(conn, section="31-perlita", template="reverse", due_minutes=-2),
        "m3": add_card(conn, section="32-cementita", due_minutes=-1),
        "m4": add_card(conn, chapter="02-propriedades", section="21-leveza", due_minutes=-1),
        "d1": add_card(conn, guide="dsa", chapter="03-arvores", section="31-bst", due_minutes=-1),
        "o1": add_card(conn, guide=None, chapter=None, section=None, due_minutes=-1),
    }
    add_card(conn, section="31-perlita", state="deprecated", due_minutes=-1)
    return cards


def test_deck_list_derives_guide_chapter_section_and_outras(conn: sqlite3.Connection) -> None:
    build_deck_fixture(conn)

    decks = {deck["id"]: deck for deck in fqueue.list_decks(conn)}

    assert decks["guide:magnesio"]["cardCount"] == 4
    assert decks["guide:dsa"]["cardCount"] == 1
    assert decks["chapter:magnesio:01-estrutura"]["cardCount"] == 3
    assert decks["section:magnesio:01-estrutura:31-perlita"]["cardCount"] == 2
    assert decks["outras"]["cardCount"] == 1
    assert decks["outras"]["type"] == "outras"
    assert decks["guide:magnesio"]["type"] == "guide"
    assert decks["chapter:magnesio:01-estrutura"]["type"] == "chapter"
    assert decks["section:magnesio:01-estrutura:31-perlita"]["type"] == "section"
    assert "chapter:magnesio:02-propriedades" in decks


def test_deck_list_titles_are_humanised(conn: sqlite3.Connection) -> None:
    build_deck_fixture(conn)

    decks = {deck["id"]: deck for deck in fqueue.list_decks(conn)}

    assert decks["guide:magnesio"]["title"] == "Magnesio"
    assert decks["chapter:magnesio:01-estrutura"]["title"] == "Estrutura"
    assert decks["section:magnesio:01-estrutura:31-perlita"]["title"] == "Perlita"
    assert decks["outras"]["title"] == "Outras"


def test_deck_list_keeps_the_anchor_columns(conn: sqlite3.Connection) -> None:
    build_deck_fixture(conn)

    decks = {deck["id"]: deck for deck in fqueue.list_decks(conn)}

    assert decks["chapter:magnesio:01-estrutura"]["guideId"] == "magnesio"
    assert decks["chapter:magnesio:01-estrutura"]["chapterSlug"] == "01-estrutura"
    assert decks["section:magnesio:01-estrutura:31-perlita"]["sectionId"] == "31-perlita"
    assert decks["outras"]["guideId"] is None


def test_deck_cards_returns_the_full_deck_without_deprecated(conn: sqlite3.Connection) -> None:
    build_deck_fixture(conn)

    rows = fqueue.deck_cards(conn, "section:magnesio:01-estrutura:31-perlita")

    assert rows is not None
    assert len(rows) == 2
    assert all(row["state"] != "deprecated" for row in rows)
    assert {row["template"] for row in rows} == {"basic", "reverse"}


def test_deck_meta_reports_the_count(conn: sqlite3.Connection) -> None:
    build_deck_fixture(conn)

    meta = fqueue.deck_meta(conn, "guide:magnesio")

    assert meta is not None
    assert meta["cardCount"] == 4
    assert meta["title"] == "Magnesio"


def test_unknown_deck_is_none(conn: sqlite3.Connection) -> None:
    build_deck_fixture(conn)

    assert fqueue.deck_meta(conn, "guide:nao-existe") is None
    assert fqueue.deck_cards(conn, "guide:nao-existe") == []


@pytest.mark.parametrize("raw", ["nope", "guide:", "chapter:a", "section:a:b", "outras:x"])
def test_malformed_deck_ids_are_rejected(conn: sqlite3.Connection, raw: str) -> None:
    with pytest.raises(fqueue.InvalidScope):
        fqueue.deck_cards(conn, raw)
