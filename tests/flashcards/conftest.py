"""Fixtures for the flashcards backend tests.

Every test gets its own SQLite file through ``ESTUDOS_DB`` (same store the progress
API uses) plus a throwaway SPA build/content tree, so nothing touches real data.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Callable, Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import db as store
from app.main import create_app

#: Fixed clock used by every scheduler/queue/API test (Thursday, 2026-10-22).
NOW = datetime(2026, 10, 22, 12, 0, 0, tzinfo=UTC)

INDEX_HTML = (
    "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">"
    "<title>Estudos</title></head><body><div id=\"root\"></div></body></html>"
)


@pytest.fixture()
def db_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "estudos.db"
    monkeypatch.setenv("ESTUDOS_DB", str(path))
    return path


@pytest.fixture()
def conn(db_file: Path) -> Iterator[sqlite3.Connection]:
    connection = store.connect(db_file)
    try:
        yield connection
    finally:
        connection.close()


@pytest.fixture()
def web_dist(tmp_path: Path) -> Path:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(INDEX_HTML, encoding="utf-8")
    (dist / "assets" / "index-abc123.js").write_text("console.log('estudos')\n", encoding="utf-8")
    return dist


@pytest.fixture()
def content_dir(tmp_path: Path) -> Path:
    content = tmp_path / "content"
    (content / "media").mkdir(parents=True)
    (content / "index.json").write_text('{"guides": []}\n', encoding="utf-8")
    return content


@pytest.fixture()
def client(db_file: Path, web_dist: Path, content_dir: Path) -> Iterator[TestClient]:
    app = create_app(web_dist=web_dist, content_dir=content_dir)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def execute(db_file: Path) -> Callable[..., None]:
    """Run one committed statement directly against the store (seeding only)."""

    def run(query: str, params: tuple[object, ...] = ()) -> None:
        # ``store.connect`` also creates the schema, so a test can seed before the
        # first HTTP request.
        connection = store.connect(db_file)
        try:
            with connection:
                connection.execute(query, params)
        finally:
            connection.close()

    return run


@pytest.fixture()
def rows(db_file: Path) -> Callable[..., list[sqlite3.Row]]:
    """Read the store directly, bypassing the HTTP layer."""

    def read(query: str, params: tuple[object, ...] = ()) -> list[sqlite3.Row]:
        connection = sqlite3.connect(db_file)
        connection.row_factory = sqlite3.Row
        try:
            return connection.execute(query, params).fetchall()
        finally:
            connection.close()

    return read
