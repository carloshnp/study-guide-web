"""T00: SQLite helpers for fc_notes, fc_cards, fc_revlog, fc_habits, fc_settings."""

from __future__ import annotations

import sqlite3

import pytest

from app.flashcards import db as fdb

TS = "2026-10-22T12:00:00Z"
LATER = "2026-10-23T09:30:00Z"


def make_note(conn: sqlite3.Connection, **overrides: object) -> int:
    payload: dict[str, object] = {
        "kind": "basic",
        "front": "O que e perlita?",
        "back": "Lamelas alternadas de ferrita e cementita.",
        "guide_id": "magnesio",
        "chapter_slug": "01-estrutura",
        "section_id": "31-perlita",
        "source_snippet": "A perlita e uma microestrutura...",
        "tags": "metal,estrutura",
        "now": TS,
    }
    payload.update(overrides)
    return fdb.create_note(conn, **payload)  # type: ignore[arg-type]


def make_card(conn: sqlite3.Connection, note_id: int, **overrides: object) -> int:
    payload: dict[str, object] = {"note_id": note_id, "template": "basic", "now": TS}
    payload.update(overrides)
    return fdb.create_card(conn, **payload)  # type: ignore[arg-type]


def test_create_note_roundtrips_every_field(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)

    row = fdb.get_note(conn, note_id)

    assert row is not None
    assert row["kind"] == "basic"
    assert row["front"] == "O que e perlita?"
    assert row["back"] == "Lamelas alternadas de ferrita e cementita."
    assert row["guide_id"] == "magnesio"
    assert row["chapter_slug"] == "01-estrutura"
    assert row["section_id"] == "31-perlita"
    assert row["source_snippet"] == "A perlita e uma microestrutura..."
    assert row["tags"] == "metal,estrutura"
    assert row["created_at"] == TS
    assert row["updated_at"] == TS


def test_create_note_without_an_anchor_is_standalone(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn, guide_id=None, chapter_slug=None, section_id=None)

    row = fdb.get_note(conn, note_id)

    assert row is not None
    assert row["guide_id"] is None
    assert row["chapter_slug"] is None
    assert row["section_id"] is None


def test_invalid_kind_is_rejected_by_the_check_constraint(conn: sqlite3.Connection) -> None:
    with pytest.raises(sqlite3.IntegrityError):
        make_note(conn, kind="typo")


def test_list_notes_is_empty_by_default(conn: sqlite3.Connection) -> None:
    assert fdb.list_notes(conn) == []


def test_list_notes_filters_by_guide_and_orders_by_id(conn: sqlite3.Connection) -> None:
    first = make_note(conn)
    second = make_note(conn, guide_id="dsa", front="O que e uma BST?")
    third = make_note(conn, front="O que e cementita?")

    everything = fdb.list_notes(conn)
    only_magnesio = fdb.list_notes(conn, guide_id="magnesio")

    assert [row["id"] for row in everything] == [first, second, third]
    assert [row["id"] for row in only_magnesio] == [first, third]


def test_update_note_changes_fields_and_stamps_updated_at(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)

    row = fdb.update_note(conn, note_id, {"front": "O que e cementita?", "tags": "metal"}, now=LATER)

    assert row is not None
    assert row["front"] == "O que e cementita?"
    assert row["tags"] == "metal"
    assert row["created_at"] == TS
    assert row["updated_at"] == LATER


def test_update_note_rejects_unknown_columns(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)

    with pytest.raises(ValueError):
        fdb.update_note(conn, note_id, {"id": 99})


def test_update_note_returns_none_when_missing(conn: sqlite3.Connection) -> None:
    assert fdb.update_note(conn, 404, {"front": "x"}, now=LATER) is None


def test_delete_note_returns_false_when_missing(conn: sqlite3.Connection) -> None:
    assert fdb.delete_note(conn, 404) is False


def test_delete_note_cascades_to_cards_and_revlog(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)
    card_id = make_card(conn, note_id)
    fdb.append_revlog(
        conn,
        card_id=card_id,
        rating=3,
        state_before="new",
        interval_before=0,
        interval_after=1,
        elapsed_ms=1200,
        reviewed_at=TS,
    )

    assert fdb.delete_note(conn, note_id) is True

    assert fdb.get_note(conn, note_id) is None
    assert fdb.list_cards(conn, note_id=note_id) == []
    assert fdb.list_revlog(conn, card_id=card_id) == []


def test_create_card_defaults_to_a_new_card_due_now(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)

    card_id = make_card(conn, note_id, due=None, stability=None, difficulty=None)

    row = fdb.get_card(conn, card_id)
    assert row is not None
    assert row["state"] == "new"
    assert row["due"] == TS
    assert row["stability"] == 1.0
    assert row["difficulty"] == 5.0
    assert row["retrievability"] is None
    assert row["reps"] == 0
    assert row["lapses"] == 0
    assert row["leech"] == 0
    assert row["deprecated_at"] is None
    assert row["last_review"] is None


def test_create_card_needs_an_existing_note(conn: sqlite3.Connection) -> None:
    with pytest.raises(sqlite3.IntegrityError):
        make_card(conn, 999)


def test_list_cards_filters_by_note_and_state(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)
    basic = make_card(conn, note_id, template="basic")
    reverse = make_card(conn, note_id, template="reverse")
    fdb.update_card(conn, reverse, {"state": "suspended"})

    assert [row["id"] for row in fdb.list_cards(conn, note_id=note_id)] == [basic, reverse]
    assert [row["id"] for row in fdb.list_cards(conn, note_id=note_id, states=["suspended"])] == [reverse]
    assert fdb.list_cards(conn, note_id=12345) == []


def test_update_card_whitelists_columns(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)
    card_id = make_card(conn, note_id)

    row = fdb.update_card(conn, card_id, {"state": "review", "stability": 12.5, "due": LATER})

    assert row is not None
    assert row["state"] == "review"
    assert row["stability"] == 12.5
    assert row["due"] == LATER
    with pytest.raises(ValueError):
        fdb.update_card(conn, card_id, {"note_id": 2})
    with pytest.raises(ValueError):
        fdb.update_card(conn, card_id, {"created_at": TS})


def test_update_card_returns_none_when_missing(conn: sqlite3.Connection) -> None:
    assert fdb.update_card(conn, 404, {"state": "review"}) is None


def test_deprecate_cards_sets_state_and_timestamp(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)
    keep = make_card(conn, note_id, template="basic")
    drop = make_card(conn, note_id, template="cloze:c2")

    changed = fdb.deprecate_cards(conn, [drop], now=LATER)

    assert changed == 1
    row = fdb.get_card(conn, drop)
    assert row is not None
    assert row["state"] == "deprecated"
    assert row["deprecated_at"] == LATER
    assert fdb.get_card(conn, keep)["state"] == "new"


def test_deprecate_cards_is_idempotent(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)
    card_id = make_card(conn, note_id)

    assert fdb.deprecate_cards(conn, [card_id], now=TS) == 1
    assert fdb.deprecate_cards(conn, [card_id], now=LATER) == 0
    assert fdb.get_card(conn, card_id)["deprecated_at"] == TS


def test_revlog_is_append_only(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)
    card_id = make_card(conn, note_id)
    first = fdb.append_revlog(
        conn,
        card_id=card_id,
        rating=3,
        state_before="new",
        interval_before=0,
        interval_after=1,
        elapsed_ms=900,
        reviewed_at=TS,
    )

    fdb.update_card(conn, card_id, {"state": "review", "reps": 1})
    second = fdb.append_revlog(
        conn,
        card_id=card_id,
        rating=4,
        state_before="review",
        interval_before=1,
        interval_after=4,
        elapsed_ms=700,
        reviewed_at=LATER,
    )

    entries = fdb.list_revlog(conn, card_id=card_id)
    assert [row["id"] for row in entries] == [first, second]
    assert [row["rating"] for row in entries] == [3, 4]
    assert not hasattr(fdb, "update_revlog")
    assert not hasattr(fdb, "delete_revlog")


def test_append_revlog_validates_the_rating_range(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)
    card_id = make_card(conn, note_id)

    with pytest.raises(sqlite3.IntegrityError):
        fdb.append_revlog(
            conn,
            card_id=card_id,
            rating=5,
            state_before="new",
            interval_before=0,
            interval_after=1,
            elapsed_ms=10,
            reviewed_at=TS,
        )


def test_list_revlog_filters_by_day_window(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn)
    card_id = make_card(conn, note_id)
    for stamp in (TS, LATER):
        fdb.append_revlog(
            conn,
            card_id=card_id,
            rating=3,
            state_before="new",
            interval_before=0,
            interval_after=1,
            elapsed_ms=10,
            reviewed_at=stamp,
        )

    assert len(fdb.list_revlog(conn, day_from="2026-10-23", day_to="2026-10-23")) == 1
    assert len(fdb.list_revlog(conn, day_from="2026-10-01", day_to="2026-10-31")) == 2
    assert len(fdb.list_revlog(conn, card_id=card_id)) == 2


def test_habit_counters_accumulate_on_the_same_day(conn: sqlite3.Connection) -> None:
    fdb.record_review(conn, day="2026-10-22")
    fdb.record_review(conn, day="2026-10-22", is_new=True)
    fdb.record_review(conn, day="2026-10-22", is_new=True)
    fdb.record_review(conn, day="2026-10-21")

    today = fdb.get_habit(conn, "2026-10-22")
    assert today is not None
    assert today["reviews_done"] == 3
    assert today["new_reviewed"] == 2
    yesterday = fdb.get_habit(conn, "2026-10-21")
    assert yesterday["reviews_done"] == 1
    assert yesterday["new_reviewed"] == 0
    assert [row["day"] for row in fdb.list_habits(conn)] == ["2026-10-21", "2026-10-22"]
    assert fdb.get_habit(conn, "2026-10-20") is None


def test_settings_return_defaults_and_merge_overrides(conn: sqlite3.Connection) -> None:
    defaults = fdb.get_settings(conn)

    assert defaults["dailyNewLimit"] == 10
    assert defaults["reviewCap"] == 200
    assert defaults["floor"] == 5
    assert defaults["desiredRetentionDefault"] == 0.9
    assert defaults["perGuide"] == {}

    saved = fdb.save_settings(
        conn,
        {"dailyNewLimit": 25, "desiredRetentionDefault": 0.92, "perGuide": {"magnesio": 0.88}},
    )

    assert saved["dailyNewLimit"] == 25
    assert saved["reviewCap"] == 200
    assert saved["desiredRetentionDefault"] == 0.92
    assert saved["perGuide"] == {"magnesio": 0.88}
    assert fdb.get_settings(conn)["desiredRetentionDefault"] == 0.92


def test_per_guide_retention_is_stored_as_json(conn: sqlite3.Connection) -> None:
    fdb.save_settings(conn, {"perGuide": {"magnesio": 0.87, "dsa": 0.95}})

    raw = fdb.get_setting(conn, "perGuide")

    assert raw is not None
    assert "magnesio" in raw and "0.87" in raw
    assert fdb.get_settings(conn)["perGuide"] == {"magnesio": 0.87, "dsa": 0.95}


def test_timestamps_default_to_utc_z_strings(conn: sqlite3.Connection) -> None:
    note_id = make_note(conn, now=None)
    card_id = make_card(conn, note_id, now=None)

    note = fdb.get_note(conn, note_id)
    card = fdb.get_card(conn, card_id)
    assert note["created_at"].endswith("Z")
    assert card["due"].endswith("Z")
    assert card["created_at"].endswith("Z")
