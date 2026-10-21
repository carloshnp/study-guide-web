"""SQLite store for reading progress and chapter notes.

Single user, no authentication: access control is the tailnet. One connection per
request, WAL journalling (readers never block the writer), no ORM.

The schema is created on every connection with ``CREATE TABLE IF NOT EXISTS`` so a
fresh checkout needs no migration step. ``ESTUDOS_DB`` overrides the database file,
which is how the tests get an isolated store.
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
SCHEMA_VERSION = 1
BUSY_TIMEOUT_SECONDS = 5.0

SCHEMA = """
CREATE TABLE IF NOT EXISTS progress (
    guide_id   TEXT NOT NULL,
    unit_id    TEXT NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('done', 'review')),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (guide_id, unit_id)
);

CREATE TABLE IF NOT EXISTS notes (
    guide_id   TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    body       TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (guide_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS progress_by_guide_status ON progress (guide_id, status);
"""


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
    connection.executescript(SCHEMA)
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
