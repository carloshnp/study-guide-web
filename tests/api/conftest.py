"""Shared fixtures for the API contract tests.

Every test gets its own SQLite file through ``ESTUDOS_DB`` and its own throwaway
``web/dist`` + ``content`` tree, so nothing touches the real project data.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

INDEX_HTML = (
    "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">"
    "<title>Estudos</title></head><body><div id=\"root\"></div>"
    "<script type=\"module\" src=\"/assets/index-abc123.js\"></script></body></html>"
)


@pytest.fixture()
def db_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Point the app at a fresh SQLite file for this test only."""
    path = tmp_path / "estudos.db"
    monkeypatch.setenv("ESTUDOS_DB", str(path))
    return path


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
    media = content / "media" / "abc123" / "1280.webp"
    media.parent.mkdir(parents=True)
    media.write_bytes(b"RIFF-fake-webp")
    (content / "media" / "abc123" / "640.webp").write_bytes(b"RIFF-fake-webp-640")
    (content / "index.json").write_text('{"guides": []}\n', encoding="utf-8")
    return content


@pytest.fixture()
def client(db_file: Path, web_dist: Path, content_dir: Path) -> Iterator[TestClient]:
    app = create_app(web_dist=web_dist, content_dir=content_dir)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def sqlite_rows(db_file: Path) -> Callable[..., list[sqlite3.Row]]:
    """Read the store directly, bypassing the HTTP layer."""

    def rows(query: str, params: tuple[object, ...] = ()) -> list[sqlite3.Row]:
        conn = sqlite3.connect(db_file)
        conn.row_factory = sqlite3.Row
        try:
            return conn.execute(query, params).fetchall()
        finally:
            conn.close()

    return rows
