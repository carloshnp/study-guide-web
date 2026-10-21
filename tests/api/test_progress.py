"""T15: HTTP contract for PUT/GET /api/progress."""

from __future__ import annotations

import sqlite3
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

GUIDE = "aluminio"
UNIT = "aluminio/01-o-aluminio-como-metal-de-engenharia/11-obtencao-e-viabilidade-comercial"
OTHER_UNIT = "aluminio/02-propriedades/21-leveza"
DSA_UNIT = "dsa/03-arvores/31-bst"


def put_progress(
    client: TestClient,
    status: str = "done",
    unit_id: str = UNIT,
    guide_id: str = GUIDE,
) -> Any:
    return client.put(
        "/api/progress",
        json={"guideId": guide_id, "unitId": unit_id, "status": status},
    )


def test_get_progress_is_an_empty_map_by_default(client: TestClient) -> None:
    response = client.get("/api/progress")

    assert response.status_code == 200
    assert response.json() == {"guideId": None, "count": 0, "units": {}}


def test_put_progress_returns_the_stored_unit(client: TestClient) -> None:
    response = put_progress(client)

    assert response.status_code == 200
    body = response.json()
    assert body["guideId"] == GUIDE
    assert body["unitId"] == UNIT
    assert body["status"] == "done"
    assert isinstance(body["updatedAt"], str) and body["updatedAt"].endswith("Z")


def test_get_progress_returns_the_map(client: TestClient) -> None:
    put_progress(client)
    put_progress(client, status="review", unit_id=OTHER_UNIT)

    response = client.get("/api/progress")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    assert body["units"] == {UNIT: "done", OTHER_UNIT: "review"}


def test_get_progress_can_be_filtered_by_guide(client: TestClient) -> None:
    put_progress(client)
    put_progress(client, guide_id="dsa", unit_id=DSA_UNIT)

    filtered = client.get("/api/progress", params={"guideId": "dsa"})

    assert filtered.status_code == 200
    body = filtered.json()
    assert body["guideId"] == "dsa"
    assert body["count"] == 1
    assert body["units"] == {DSA_UNIT: "done"}


def test_blank_guide_filter_is_422(client: TestClient) -> None:
    assert client.get("/api/progress", params={"guideId": ""}).status_code == 422


def test_unknown_guide_filter_returns_an_empty_map(client: TestClient) -> None:
    put_progress(client)

    body = client.get("/api/progress", params={"guideId": "nao-existe"}).json()

    assert body == {"guideId": "nao-existe", "count": 0, "units": {}}


def test_repeated_writes_are_idempotent(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    first = put_progress(client)
    second = put_progress(client)

    assert first.status_code == second.status_code == 200
    without_timestamp = [
        {key: value for key, value in response.json().items() if key != "updatedAt"}
        for response in (first, second)
    ]
    assert without_timestamp[0] == without_timestamp[1]
    rows = sqlite_rows("SELECT guide_id, unit_id, status FROM progress")
    assert len(rows) == 1
    assert rows[0]["status"] == "done"
    assert client.get("/api/progress").json()["count"] == 1


def test_upsert_replaces_the_previous_status(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    put_progress(client, status="done")
    response = put_progress(client, status="review")

    assert response.status_code == 200
    assert response.json()["status"] == "review"
    body = client.get("/api/progress").json()
    assert body["units"] == {UNIT: "review"}
    assert len(sqlite_rows("SELECT * FROM progress")) == 1


def test_absent_status_deletes_the_unit(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    put_progress(client, status="done")

    response = put_progress(client, status="absent")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "absent"
    assert body["updatedAt"] is None
    assert client.get("/api/progress").json() == {"guideId": None, "count": 0, "units": {}}
    assert sqlite_rows("SELECT * FROM progress") == []


def test_absent_on_a_missing_unit_is_a_no_op(client: TestClient) -> None:
    response = put_progress(client, status="absent")

    assert response.status_code == 200
    assert response.json()["status"] == "absent"
    assert client.get("/api/progress").json()["count"] == 0


@pytest.mark.parametrize("status", ["lido", "DONE", "", "done ", "pending", None, 3])
def test_invalid_status_is_422(client: TestClient, status: object) -> None:
    response = client.put(
        "/api/progress",
        json={"guideId": GUIDE, "unitId": UNIT, "status": status},
    )

    assert response.status_code == 422
    assert client.get("/api/progress").json()["count"] == 0


def test_missing_fields_are_422(client: TestClient) -> None:
    assert client.put("/api/progress", json={"unitId": UNIT, "status": "done"}).status_code == 422
    assert client.put("/api/progress", json={"guideId": GUIDE, "status": "done"}).status_code == 422


def test_unit_id_without_chapter_segment_is_422(client: TestClient) -> None:
    response = put_progress(client, unit_id="aluminio")

    assert response.status_code == 422
    assert "unitId" in response.text


def test_unit_id_must_belong_to_the_guide(client: TestClient) -> None:
    response = put_progress(client, unit_id=DSA_UNIT)

    assert response.status_code == 422
    assert "unitId" in response.text


def test_unit_id_with_empty_segment_is_422(client: TestClient) -> None:
    response = put_progress(client, unit_id="aluminio//11-secao")

    assert response.status_code == 422
    assert "unitId" in response.text


def test_guide_id_must_not_be_blank(client: TestClient) -> None:
    response = client.put(
        "/api/progress",
        json={"guideId": "   ", "unitId": UNIT, "status": "done"},
    )

    assert response.status_code == 422


def test_progress_survives_a_new_app_instance(
    client: TestClient,
    db_file: Path,
    web_dist: Path,
    content_dir: Path,
) -> None:
    put_progress(client, status="review")

    from app.main import create_app

    with TestClient(create_app(web_dist=web_dist, content_dir=content_dir)) as second_client:
        body = second_client.get("/api/progress").json()

    assert body["units"] == {UNIT: "review"}


def test_store_uses_wal_journal(
    client: TestClient,
    sqlite_rows: Callable[..., list[sqlite3.Row]],
) -> None:
    put_progress(client)

    mode = sqlite_rows("PRAGMA journal_mode")[0][0]

    assert str(mode).lower() == "wal"
