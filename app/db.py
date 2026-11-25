"""SQLite store for accounts, reading progress, notes, highlights, and flashcards.

One connection per request, WAL journalling (readers never block the writer), no ORM.

The schema is created on every connection with ``CREATE TABLE IF NOT EXISTS`` so a
fresh checkout needs no manual migration step, and existing v1 stores migrate
in-place to v2 (adding ``users``, ``sessions``, and ``user_id`` scoping with all
pre-existing rows preserved under ``user_id = 1``). ``ESTUDOS_DB`` overrides the
database file, which is how the tests get an isolated store.
"""

from __future__ import annotations

import os
import sqlite3
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Root-level ``state.db`` (already in .gitignore) rather than inside ``data/``:
# ``data/`` is the corpus git repository and the store must not dirty its history.
DEFAULT_DB_PATH = ROOT / "state.db"
DB_ENV_VAR = "ESTUDOS_DB"
SCHEMA_VERSION = 2
BUSY_TIMEOUT_SECONDS = 5.0

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS progress (
    user_id    INTEGER NOT NULL DEFAULT 1,
    guide_id   TEXT NOT NULL,
    unit_id    TEXT NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('done', 'review')),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, guide_id, unit_id)
);

CREATE TABLE IF NOT EXISTS notes (
    user_id    INTEGER NOT NULL DEFAULT 1,
    guide_id   TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    body       TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, guide_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS progress_by_guide_status
    ON progress (user_id, guide_id, status);

CREATE TABLE IF NOT EXISTS fc_notes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1,
    kind TEXT NOT NULL CHECK (kind IN ('basic', 'basic-reverse', 'cloze')),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    guide_id TEXT,
    chapter_slug TEXT,
    section_id TEXT,
    source_snippet TEXT,
    tags TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS fc_notes_by_user ON fc_notes (user_id, guide_id);

CREATE TABLE IF NOT EXISTS fc_cards (
    id INTEGER PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES fc_notes(id) ON DELETE CASCADE,
    template TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'suspended', 'deprecated')),
    deprecated_at TEXT,
    difficulty REAL NOT NULL DEFAULT 5.0,
    stability REAL NOT NULL DEFAULT 0.0,
    retrievability REAL,
    due TEXT,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    leech INTEGER NOT NULL DEFAULT 0,
    last_review TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS fc_cards_due ON fc_cards (due) WHERE state IN ('learning', 'review');
CREATE INDEX IF NOT EXISTS fc_cards_note ON fc_cards (note_id);

CREATE TABLE IF NOT EXISTS fc_revlog (
    id INTEGER PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES fc_cards(id) ON DELETE CASCADE,
    reviewed_at TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
    state_before TEXT NOT NULL,
    interval_before INTEGER NOT NULL,
    interval_after INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fc_habits (
    user_id INTEGER NOT NULL DEFAULT 1,
    day TEXT NOT NULL,
    new_reviewed INTEGER NOT NULL DEFAULT 0,
    reviews_done INTEGER NOT NULL DEFAULT 0,
    streak_frozen INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS fc_settings (
    user_id INTEGER NOT NULL DEFAULT 1,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS study_notes (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL DEFAULT 1,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS study_notes_by_user
    ON study_notes (user_id, updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS study_note_links (
    note_id    INTEGER NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    guide_id   TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    section_id TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (note_id, guide_id, chapter_id, section_id)
);

CREATE INDEX IF NOT EXISTS study_note_links_target
    ON study_note_links (guide_id, chapter_id, section_id);

CREATE TABLE IF NOT EXISTS highlights (
    id           INTEGER PRIMARY KEY,
    user_id      INTEGER NOT NULL DEFAULT 1,
    guide_id     TEXT NOT NULL,
    chapter_id   TEXT NOT NULL,
    variant      TEXT NOT NULL DEFAULT 'full' CHECK (variant IN ('full', 'resumo')),
    section_id   TEXT,
    exact        TEXT NOT NULL,
    prefix       TEXT NOT NULL DEFAULT '',
    suffix       TEXT NOT NULL DEFAULT '',
    start_offset INTEGER NOT NULL CHECK (start_offset >= 0),
    end_offset   INTEGER NOT NULL CHECK (end_offset > start_offset),
    color        TEXT NOT NULL CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS highlights_by_chapter
    ON highlights (user_id, guide_id, chapter_id, variant);
"""


def _table_exists(connection: sqlite3.Connection, table: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)
    ).fetchone()
    return row is not None


def _column_names(connection: sqlite3.Connection, table: str) -> set[str]:
    return {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}


def _migrate_v1_to_v2(connection: sqlite3.Connection) -> None:
    """Upgrade an existing v1 database to v2, preserving all rows under user_id = 1."""
    connection.execute("PRAGMA foreign_keys=OFF")
    try:
        with connection:
            if _table_exists(connection, "progress") and "user_id" not in _column_names(
                connection, "progress"
            ):
                connection.execute("DROP INDEX IF EXISTS progress_by_guide_status")
                connection.execute(
                    """
                    CREATE TABLE progress_v2 (
                        user_id    INTEGER NOT NULL DEFAULT 1,
                        guide_id   TEXT NOT NULL,
                        unit_id    TEXT NOT NULL,
                        status     TEXT NOT NULL CHECK (status IN ('done', 'review')),
                        updated_at TEXT NOT NULL,
                        PRIMARY KEY (user_id, guide_id, unit_id)
                    )
                    """
                )
                connection.execute(
                    """
                    INSERT INTO progress_v2 (user_id, guide_id, unit_id, status, updated_at)
                    SELECT 1, guide_id, unit_id, status, updated_at FROM progress
                    """
                )
                connection.execute("DROP TABLE progress")
                connection.execute("ALTER TABLE progress_v2 RENAME TO progress")

            if _table_exists(connection, "notes") and "user_id" not in _column_names(
                connection, "notes"
            ):
                connection.execute(
                    """
                    CREATE TABLE notes_v2 (
                        user_id    INTEGER NOT NULL DEFAULT 1,
                        guide_id   TEXT NOT NULL,
                        chapter_id TEXT NOT NULL,
                        body       TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        PRIMARY KEY (user_id, guide_id, chapter_id)
                    )
                    """
                )
                connection.execute(
                    """
                    INSERT INTO notes_v2 (user_id, guide_id, chapter_id, body, updated_at)
                    SELECT 1, guide_id, chapter_id, body, updated_at FROM notes
                    """
                )
                connection.execute("DROP TABLE notes")
                connection.execute("ALTER TABLE notes_v2 RENAME TO notes")

            if _table_exists(connection, "fc_habits") and "user_id" not in _column_names(
                connection, "fc_habits"
            ):
                connection.execute(
                    """
                    CREATE TABLE fc_habits_v2 (
                        user_id INTEGER NOT NULL DEFAULT 1,
                        day TEXT NOT NULL,
                        new_reviewed INTEGER NOT NULL DEFAULT 0,
                        reviews_done INTEGER NOT NULL DEFAULT 0,
                        streak_frozen INTEGER NOT NULL DEFAULT 0,
                        PRIMARY KEY (user_id, day)
                    )
                    """
                )
                connection.execute(
                    """
                    INSERT INTO fc_habits_v2 (user_id, day, new_reviewed, reviews_done, streak_frozen)
                    SELECT 1, day, new_reviewed, reviews_done, streak_frozen FROM fc_habits
                    """
                )
                connection.execute("DROP TABLE fc_habits")
                connection.execute("ALTER TABLE fc_habits_v2 RENAME TO fc_habits")

            if _table_exists(connection, "fc_settings") and "user_id" not in _column_names(
                connection, "fc_settings"
            ):
                connection.execute(
                    """
                    CREATE TABLE fc_settings_v2 (
                        user_id INTEGER NOT NULL DEFAULT 1,
                        key TEXT NOT NULL,
                        value TEXT NOT NULL,
                        PRIMARY KEY (user_id, key)
                    )
                    """
                )
                connection.execute(
                    """
                    INSERT INTO fc_settings_v2 (user_id, key, value)
                    SELECT 1, key, value FROM fc_settings
                    """
                )
                connection.execute("DROP TABLE fc_settings")
                connection.execute("ALTER TABLE fc_settings_v2 RENAME TO fc_settings")

            for table in ("fc_notes", "study_notes", "highlights"):
                if _table_exists(connection, table) and "user_id" not in _column_names(
                    connection, table
                ):
                    if table == "highlights":
                        connection.execute("DROP INDEX IF EXISTS highlights_by_chapter")
                    connection.execute(
                        f"ALTER TABLE {table} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1"
                    )
    finally:
        connection.execute("PRAGMA foreign_keys=ON")


def db_path() -> Path:
    """Database file for this process, honouring ``ESTUDOS_DB``."""
    override = os.environ.get(DB_ENV_VAR)
    if override:
        return Path(override).expanduser()
    return DEFAULT_DB_PATH


def utcnow() -> str:
    """Current UTC time as an ISO 8601 string with a ``Z`` suffix."""
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def connect(path: Path | None = None) -> sqlite3.Connection:
    """Open a connection with the pragmas and schema this app expects."""
    target = path if path is not None else db_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(
        target,
        timeout=BUSY_TIMEOUT_SECONDS,
        check_same_thread=False,
    )
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.execute("PRAGMA foreign_keys=ON")

    current_version = int(connection.execute("PRAGMA user_version").fetchone()[0])
    if current_version < SCHEMA_VERSION:
        _migrate_v1_to_v2(connection)
    connection.executescript(SCHEMA)
    if current_version < SCHEMA_VERSION:
        connection.execute(f"PRAGMA user_version={SCHEMA_VERSION}")
    connection.commit()
    return connection


def get_connection() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: a connection that lives for exactly one request."""
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()
