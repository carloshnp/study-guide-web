"""Store-level guards: schema shape, WAL journalling, and the default location."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from app import db

EXPECTED_PROGRESS_COLUMNS = [
    ("guide_id", "TEXT", 1, 1),
    ("unit_id", "TEXT", 1, 2),
    ("status", "TEXT", 1, 0),
    ("updated_at", "TEXT", 1, 0),
]
EXPECTED_NOTES_COLUMNS = [
    ("guide_id", "TEXT", 1, 1),
    ("chapter_id", "TEXT", 1, 2),
    ("body", "TEXT", 1, 0),
    ("updated_at", "TEXT", 1, 0),
]


def _columns(connection: sqlite3.Connection, table: str) -> list[tuple[str, str, int, int]]:
    return [
        (row["name"], row["type"], row["notnull"], row["pk"])
        for row in connection.execute(f"PRAGMA table_info({table})")
    ]


def test_default_store_is_not_inside_the_corpus_repo() -> None:
    assert db.DEFAULT_DB_PATH == db.ROOT / "state.db"
    assert "data" not in db.DEFAULT_DB_PATH.parts


def test_store_uses_wal_and_normal_synchronous(db_file: Path) -> None:
    connection = db.connect()

    assert connection.execute("PRAGMA journal_mode").fetchone()[0].lower() == "wal"
    assert connection.execute("PRAGMA synchronous").fetchone()[0] == 1
    assert connection.execute("PRAGMA user_version").fetchone()[0] == db.SCHEMA_VERSION
    connection.close()


def test_schema_matches_the_documented_columns(db_file: Path) -> None:
    connection = db.connect()

    assert _columns(connection, "progress") == EXPECTED_PROGRESS_COLUMNS
    assert _columns(connection, "notes") == EXPECTED_NOTES_COLUMNS
    connection.close()


def test_status_column_rejects_unknown_values(db_file: Path) -> None:
    connection = db.connect()

    try:
        connection.execute(
            "INSERT INTO progress (guide_id, unit_id, status, updated_at) VALUES (?, ?, ?, ?)",
            ("aluminio", "aluminio/01-x", "lido", db.utcnow()),
        )
    except sqlite3.IntegrityError:
        pass
    else:  # pragma: no cover - the CHECK constraint must reject this
        raise AssertionError("status CHECK constraint did not reject 'lido'")
    finally:
        connection.close()


def test_reconnecting_keeps_the_rows(db_file: Path) -> None:
    first = db.connect()
    with first:
        first.execute(
            "INSERT INTO progress (guide_id, unit_id, status, updated_at) VALUES (?, ?, ?, ?)",
            ("aluminio", "aluminio/01-x", "done", db.utcnow()),
        )
    first.close()

    second = db.connect()

    assert second.execute("SELECT COUNT(*) FROM progress").fetchone()[0] == 1
    second.close()


def test_utcnow_is_iso8601_utc() -> None:
    value = db.utcnow()

    assert value.endswith("Z")
    assert value[4] == "-" and value[7] == "-" and value[10] == "T"
