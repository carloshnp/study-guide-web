"""T16: HTTP contract for PUT/GET /api/notes."""

from __future__ import annotations

import sqlite3
from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient

GUIDE = "aluminio"
CHAPTER = "04-solucao-solida"
OTHER_CHAPTER = "05-endurecimento-por-precipitacao"
BODY_LIMIT = 20000


def put_note(
    client: TestClient,
    body: str,
    chapter_id: str = CHAPTER,
    guide_id: str = GUIDE,
) -> Any:
    return client.put(
        "/api/notes",
        json={"guideId": guide_id, "chapterId": chapter_id, "body": body},
    )


def get_note(client: TestClient, chapter_id: str = CHAPTER, guide_id: str = GUIDE) -> Any:
    return client.get("/api/notes", params={"guideId": guide_id, "chapterId": chapter_id})


def test_get_notes_defaults_to_empty(client: TestClient) -> None:
    response = get_note(client)

    assert response.status_code == 200
    assert response.json() == {
        "guideId": GUIDE,
        "chapterId": CHAPTER,
        "body": "",
        "updatedAt": None,
    }


def test_put_then_get_returns_body_and_timestamp(client: TestClient) -> None:
    written = put_note(client, "Difusão substitucional vs. intersticial.")

    assert written.status_code == 200
    written_body = written.json()
    assert written_body["body"] == "Difusão substitucional vs. intersticial."
    assert written_body["guideId"] == GUIDE
    assert written_body["chapterId"] == CHAPTER
    assert written_body["updatedAt"].endswith("Z")

    read = get_note(client).json()
    assert read["body"] == "Difusão substitucional vs. intersticial."
    assert read["updatedAt"] == written_body["updatedAt"]


def test_put_empty_text_deletes_the_row(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    put_note(client, "rascunho")

    response = put_note(client, "")

    assert response.status_code == 200
    assert response.json()["body"] == ""
    assert response.json()["updatedAt"] is None
    assert get_note(client).json() == {
        "guideId": GUIDE,
        "chapterId": CHAPTER,
        "body": "",
        "updatedAt": None,
    }
    assert sqlite_rows("SELECT * FROM notes") == []


def test_put_whitespace_only_text_also_deletes(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    put_note(client, "conteúdo")

    response = put_note(client, "  \n\t ")

    assert response.status_code == 200
    assert get_note(client).json()["body"] == ""
    assert sqlite_rows("SELECT * FROM notes") == []


def test_put_empty_text_on_a_missing_row_is_a_no_op(client: TestClient) -> None:
    response = put_note(client, "")

    assert response.status_code == 200
    assert response.json()["updatedAt"] is None
    assert get_note(client).status_code == 200


def test_long_text_is_capped_at_20000_chars(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    oversized = "a" * (BODY_LIMIT + 5000)

    response = put_note(client, oversized)

    assert response.status_code == 200
    stored = response.json()["body"]
    assert len(stored) == BODY_LIMIT
    assert stored == oversized[:BODY_LIMIT]
    assert get_note(client).json()["body"] == oversized[:BODY_LIMIT]
    rows = sqlite_rows("SELECT length(body) AS n FROM notes")
    assert rows[0]["n"] == BODY_LIMIT


def test_exactly_20000_chars_is_kept_whole(client: TestClient) -> None:
    at_limit = "é" * BODY_LIMIT

    response = put_note(client, at_limit)

    assert response.status_code == 200
    assert response.json()["body"] == at_limit
    assert len(response.json()["body"]) == BODY_LIMIT


def test_put_is_an_upsert(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    put_note(client, "primeira versão")
    put_note(client, "segunda versão")

    assert get_note(client).json()["body"] == "segunda versão"
    assert len(sqlite_rows("SELECT * FROM notes")) == 1


def test_notes_are_independent_per_chapter(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    put_note(client, "nota do capítulo 4")
    put_note(client, "nota do capítulo 5", chapter_id=OTHER_CHAPTER)

    assert get_note(client).json()["body"] == "nota do capítulo 4"
    assert get_note(client, chapter_id=OTHER_CHAPTER).json()["body"] == "nota do capítulo 5"
    assert len(sqlite_rows("SELECT * FROM notes")) == 2


def test_markdown_and_accents_round_trip(client: TestClient) -> None:
    body = "## Solução sólida\n\n- **difusão** substitucional\n- $D = D_0 e^{-Q/RT}$\n"

    put_note(client, body)

    assert get_note(client).json()["body"] == body


def test_missing_chapter_id_is_422(client: TestClient) -> None:
    assert client.get("/api/notes", params={"guideId": GUIDE}).status_code == 422
    assert (
        client.put("/api/notes", json={"guideId": GUIDE, "body": "x"}).status_code == 422
    )


def test_missing_guide_id_is_422(client: TestClient) -> None:
    assert client.get("/api/notes", params={"chapterId": CHAPTER}).status_code == 422
    assert (
        client.put("/api/notes", json={"chapterId": CHAPTER, "body": "x"}).status_code
        == 422
    )


def test_null_body_is_422(client: TestClient) -> None:
    response = client.put(
        "/api/notes",
        json={"guideId": GUIDE, "chapterId": CHAPTER, "body": None},
    )

    assert response.status_code == 422


def test_blank_chapter_id_is_422(client: TestClient) -> None:
    assert put_note(client, "x", chapter_id="   ").status_code == 422
