"""SQLite access for the flashcards feature.

This module is the single source of writes for ``fc_notes``, ``fc_cards``,
``fc_revlog``, ``fc_habits`` and ``fc_settings``: the scheduler and the API routers
only translate behaviour into calls here (see ``docs/spec-flashcards.md``).

Conventions match ``app/db.py``: plain ``sqlite3`` rows, ISO-8601 UTC timestamps
with a ``Z`` suffix, ``with connection:`` for a single write transaction and
``PRAGMA foreign_keys=ON`` (set by ``app.db.connect``) so deleting a note cascades
to its cards and their revlog.

``fc_revlog`` is append-only by construction: this module exposes no update or
delete helper for it, and only a note/card cascade can remove rows.
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable, Mapping, Sequence
from datetime import UTC, datetime
from typing import Any

from app.db import utcnow

NOTE_COLUMNS = (
    "kind",
    "front",
    "back",
    "guide_id",
    "chapter_slug",
    "section_id",
    "source_snippet",
    "tags",
)
CARD_COLUMNS = (
    "template",
    "state",
    "deprecated_at",
    "difficulty",
    "stability",
    "retrievability",
    "due",
    "reps",
    "lapses",
    "leech",
    "last_review",
)

SETTINGS_DEFAULTS: dict[str, Any] = {
    "dailyNewLimit": 10,
    "reviewCap": 200,
    "floor": 5,
    "desiredRetentionDefault": 0.90,
    "perGuide": {},
}

#: Settings keys stored as JSON in ``fc_settings.value``.
_JSON_SETTINGS = frozenset({"perGuide"})


def _timestamp(value: str | datetime | None) -> str:
    """Normalise ``value`` to the store's ISO-8601 UTC ``Z`` form."""
    if value is None:
        return utcnow()
    if isinstance(value, datetime):
        moment = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
        return moment.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return value


def _checked(changes: Mapping[str, Any], allowed: Sequence[str], entity: str) -> dict[str, Any]:
    unknown = sorted(set(changes) - set(allowed))
    if unknown:
        raise ValueError(f"unknown {entity} column(s): {', '.join(unknown)}")
    return dict(changes)


# --------------------------------------------------------------------------- notes


def create_note(
    conn: sqlite3.Connection,
    *,
    kind: str,
    front: str,
    back: str,
    guide_id: str | None = None,
    chapter_slug: str | None = None,
    section_id: str | None = None,
    source_snippet: str | None = None,
    tags: str = "",
    now: str | datetime | None = None,
) -> int:
    """Insert one note and return its id."""
    stamp = _timestamp(now)
    with conn:
        cursor = conn.execute(
            """
            INSERT INTO fc_notes (
                kind, front, back, guide_id, chapter_slug, section_id,
                source_snippet, tags, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                kind,
                front,
                back,
                guide_id,
                chapter_slug,
                section_id,
                source_snippet,
                tags,
                stamp,
                stamp,
            ),
        )
    return int(cursor.lastrowid or 0)


def get_note(conn: sqlite3.Connection, note_id: int) -> sqlite3.Row | None:
    """Return one note, or ``None`` when it does not exist."""
    return conn.execute("SELECT * FROM fc_notes WHERE id = ?", (note_id,)).fetchone()


def list_notes(conn: sqlite3.Connection, *, guide_id: str | None = None) -> list[sqlite3.Row]:
    """Return notes ordered by id, optionally narrowed to one guide."""
    if guide_id is None:
        return conn.execute("SELECT * FROM fc_notes ORDER BY id").fetchall()
    return conn.execute(
        "SELECT * FROM fc_notes WHERE guide_id = ? ORDER BY id", (guide_id,)
    ).fetchall()


def update_note(
    conn: sqlite3.Connection,
    note_id: int,
    changes: Mapping[str, Any],
    *,
    now: str | datetime | None = None,
) -> sqlite3.Row | None:
    """Patch the given columns; ``updated_at`` is stamped unless provided."""
    payload = _checked(changes, NOTE_COLUMNS, "note")
    if not payload:
        return get_note(conn, note_id)
    payload["updated_at"] = _timestamp(payload.get("updated_at", now))
    assignments = ", ".join(f"{column} = ?" for column in payload)
    with conn:
        cursor = conn.execute(
            f"UPDATE fc_notes SET {assignments} WHERE id = ?",
            (*payload.values(), note_id),
        )
    if cursor.rowcount == 0:
        return None
    return get_note(conn, note_id)


def delete_note(conn: sqlite3.Connection, note_id: int) -> bool:
    """Delete a note; cards and revlog rows follow through ``ON DELETE CASCADE``."""
    card_ids = [
        int(row["id"])
        for row in conn.execute("SELECT id FROM fc_cards WHERE note_id = ?", (note_id,))
    ]
    with conn:
        if card_ids:
            placeholders = ",".join("?" for _ in card_ids)
            conn.execute(f"DELETE FROM fc_revlog WHERE card_id IN ({placeholders})", card_ids)
            conn.execute("DELETE FROM fc_cards WHERE note_id = ?", (note_id,))
        cursor = conn.execute("DELETE FROM fc_notes WHERE id = ?", (note_id,))
    return cursor.rowcount > 0


# --------------------------------------------------------------------------- cards


def create_card(
    conn: sqlite3.Connection,
    *,
    note_id: int,
    template: str,
    state: str = "new",
    due: str | datetime | None = None,
    difficulty: float | None = None,
    stability: float | None = None,
    retrievability: float | None = None,
    now: str | datetime | None = None,
) -> int:
    """Insert one card; a fresh card starts as ``new``, due now, S=1.0, D=5.0."""
    stamp = _timestamp(now)
    with conn:
        cursor = conn.execute(
            """
            INSERT INTO fc_cards (
                note_id, template, state, difficulty, stability, retrievability,
                due, reps, lapses, leech, last_review, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, NULL, ?)
            """,
            (
                note_id,
                template,
                state,
                5.0 if difficulty is None else float(difficulty),
                1.0 if stability is None else float(stability),
                retrievability,
                _timestamp(due if due is not None else stamp),
                stamp,
            ),
        )
    return int(cursor.lastrowid or 0)


def get_card(conn: sqlite3.Connection, card_id: int) -> sqlite3.Row | None:
    """Return one card, or ``None`` when it does not exist."""
    return conn.execute("SELECT * FROM fc_cards WHERE id = ?", (card_id,)).fetchone()


def card_with_note(conn: sqlite3.Connection, card_id: int) -> sqlite3.Row | None:
    """Return a card joined with its note's anchor columns (``n_*`` aliases)."""
    return conn.execute(
        """
        SELECT c.*,
               n.kind AS kind,
               n.front AS front,
               n.back AS back,
               n.guide_id AS guide_id,
               n.chapter_slug AS chapter_slug,
               n.section_id AS section_id,
               n.source_snippet AS source_snippet,
               n.tags AS tags
        FROM fc_cards c
        JOIN fc_notes n ON n.id = c.note_id
        WHERE c.id = ?
        """,
        (card_id,),
    ).fetchone()


def list_cards(
    conn: sqlite3.Connection,
    *,
    note_id: int | None = None,
    states: Iterable[str] | None = None,
) -> list[sqlite3.Row]:
    """Return cards ordered by id, optionally filtered by note and/or states."""
    clauses: list[str] = []
    params: list[Any] = []
    if note_id is not None:
        clauses.append("note_id = ?")
        params.append(note_id)
    state_list = list(states) if states is not None else []
    if state_list:
        clauses.append(f"state IN ({','.join('?' for _ in state_list)})")
        params.extend(state_list)
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    return conn.execute(f"SELECT * FROM fc_cards{where} ORDER BY id", params).fetchall()


def update_card(
    conn: sqlite3.Connection, card_id: int, changes: Mapping[str, Any]
) -> sqlite3.Row | None:
    """Patch the given scheduler columns of one card."""
    payload = _checked(changes, CARD_COLUMNS, "card")
    if not payload:
        return get_card(conn, card_id)
    assignments = ", ".join(f"{column} = ?" for column in payload)
    with conn:
        cursor = conn.execute(
            f"UPDATE fc_cards SET {assignments} WHERE id = ?",
            (*payload.values(), card_id),
        )
    if cursor.rowcount == 0:
        return None
    return get_card(conn, card_id)


def deprecate_cards(
    conn: sqlite3.Connection, card_ids: Iterable[int], *, now: str | datetime | None = None
) -> int:
    """Mark cards ``deprecated`` (keeping their revlog); returns rows touched.

    Already deprecated cards are left untouched, so the timestamp records when the
    lacuna/template disappeared.
    """
    ids = [int(card_id) for card_id in card_ids]
    if not ids:
        return 0
    stamp = _timestamp(now)
    placeholders = ",".join("?" for _ in ids)
    with conn:
        cursor = conn.execute(
            f"""
            UPDATE fc_cards
               SET state = 'deprecated', deprecated_at = ?
             WHERE id IN ({placeholders}) AND state != 'deprecated'
            """,
            (stamp, *ids),
        )
    return int(cursor.rowcount)


# -------------------------------------------------------------------------- revlog


def append_revlog(
    conn: sqlite3.Connection,
    *,
    card_id: int,
    rating: int,
    state_before: str,
    interval_before: int,
    interval_after: int,
    elapsed_ms: int = 0,
    reviewed_at: str | datetime | None = None,
) -> int:
    """Append one review to the log (never updated, never truncated)."""
    with conn:
        cursor = conn.execute(
            """
            INSERT INTO fc_revlog (
                card_id, reviewed_at, rating, state_before,
                interval_before, interval_after, elapsed_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                card_id,
                _timestamp(reviewed_at),
                int(rating),
                state_before,
                int(interval_before),
                int(interval_after),
                int(elapsed_ms),
            ),
        )
    return int(cursor.lastrowid or 0)


def list_revlog(
    conn: sqlite3.Connection,
    *,
    card_id: int | None = None,
    day_from: str | None = None,
    day_to: str | None = None,
) -> list[sqlite3.Row]:
    """Return revlog rows ordered by id, optionally filtered by card and day window."""
    clauses: list[str] = []
    params: list[Any] = []
    if card_id is not None:
        clauses.append("card_id = ?")
        params.append(card_id)
    if day_from is not None:
        clauses.append("substr(reviewed_at, 1, 10) >= ?")
        params.append(day_from)
    if day_to is not None:
        clauses.append("substr(reviewed_at, 1, 10) <= ?")
        params.append(day_to)
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    return conn.execute(f"SELECT * FROM fc_revlog{where} ORDER BY id", params).fetchall()


# -------------------------------------------------------------------------- habits


def record_review(conn: sqlite3.Connection, *, day: str, is_new: bool = False) -> None:
    """Bump the daily habit counters (one row per UTC day)."""
    with conn:
        conn.execute(
            """
            INSERT INTO fc_habits (day, new_reviewed, reviews_done, streak_frozen)
            VALUES (?, ?, 1, 0)
            ON CONFLICT (day) DO UPDATE SET
                new_reviewed = fc_habits.new_reviewed + excluded.new_reviewed,
                reviews_done = fc_habits.reviews_done + 1
            """,
            (day, 1 if is_new else 0),
        )


def get_habit(conn: sqlite3.Connection, day: str) -> sqlite3.Row | None:
    """Return the habit row for one day, if the user studied that day."""
    return conn.execute("SELECT * FROM fc_habits WHERE day = ?", (day,)).fetchone()


def list_habits(
    conn: sqlite3.Connection, *, day_from: str | None = None, day_to: str | None = None
) -> list[sqlite3.Row]:
    """Return habit rows ordered by day, optionally within a window."""
    clauses: list[str] = []
    params: list[Any] = []
    if day_from is not None:
        clauses.append("day >= ?")
        params.append(day_from)
    if day_to is not None:
        clauses.append("day <= ?")
        params.append(day_to)
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    return conn.execute(f"SELECT * FROM fc_habits{where} ORDER BY day", params).fetchall()


# ------------------------------------------------------------------------ settings


def get_setting(conn: sqlite3.Connection, key: str) -> str | None:
    """Return one raw setting value, or ``None`` when unset."""
    row = conn.execute("SELECT value FROM fc_settings WHERE key = ?", (key,)).fetchone()
    return None if row is None else str(row["value"])


def set_setting(conn: sqlite3.Connection, key: str, value: str) -> None:
    """Upsert one raw setting value."""
    with conn:
        conn.execute(
            """
            INSERT INTO fc_settings (key, value) VALUES (?, ?)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value
            """,
            (key, value),
        )


def get_settings(conn: sqlite3.Connection) -> dict[str, Any]:
    """Return the effective settings: defaults merged with stored rows."""
    settings: dict[str, Any] = {
        key: (dict(value) if isinstance(value, dict) else value)
        for key, value in SETTINGS_DEFAULTS.items()
    }
    for row in conn.execute("SELECT key, value FROM fc_settings").fetchall():
        key = str(row["key"])
        if key not in SETTINGS_DEFAULTS:
            continue
        raw = str(row["value"])
        if key in _JSON_SETTINGS:
            try:
                decoded = json.loads(raw)
            except json.JSONDecodeError:
                decoded = {}
            settings[key] = decoded if isinstance(decoded, dict) else {}
        elif isinstance(SETTINGS_DEFAULTS[key], int):
            try:
                settings[key] = int(raw)
            except ValueError:
                continue
        else:
            try:
                settings[key] = float(raw)
            except ValueError:
                continue
    return settings


def save_settings(conn: sqlite3.Connection, changes: Mapping[str, Any]) -> dict[str, Any]:
    """Merge ``changes`` into the stored settings and return the new state."""
    unknown = sorted(set(changes) - set(SETTINGS_DEFAULTS))
    if unknown:
        raise ValueError(f"unknown setting(s): {', '.join(unknown)}")
    with conn:
        for key, value in changes.items():
            if key in _JSON_SETTINGS:
                serialised = json.dumps(value, sort_keys=True, ensure_ascii=False)
            else:
                serialised = str(value)
            conn.execute(
                """
                INSERT INTO fc_settings (key, value) VALUES (?, ?)
                ON CONFLICT (key) DO UPDATE SET value = excluded.value
                """,
                (key, serialised),
            )
    return get_settings(conn)
