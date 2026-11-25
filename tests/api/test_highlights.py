"""Contract tests for /api/highlights (colored study-guide highlights)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_highlights_crud_lifecycle_and_variant_isolation(client: TestClient) -> None:
    empty = client.get("/api/highlights?guideId=torcao&chapterId=02-distribuicao")
    assert empty.status_code == 200
    assert empty.json() == {"highlights": []}

    second_in_doc = client.post(
        "/api/highlights",
        json={
            "guideId": "torcao",
            "chapterId": "02-distribuicao",
            "sectionId": "tensao-maxima",
            "exact": "tensão cisalhante máxima",
            "prefix": "A ",
            "suffix": " ocorre na superfície externa.",
            "startOffset": 120,
            "endOffset": 144,
            "color": "yellow",
        },
    )
    assert second_in_doc.status_code == 201
    h_late = second_in_doc.json()
    assert isinstance(h_late["id"], int)
    assert h_late["guideId"] == "torcao"
    assert h_late["chapterId"] == "02-distribuicao"
    assert h_late["variant"] == "full"
    assert h_late["sectionId"] == "tensao-maxima"
    assert h_late["exact"] == "tensão cisalhante máxima"
    assert h_late["prefix"] == "A "
    assert h_late["suffix"] == " ocorre na superfície externa."
    assert h_late["startOffset"] == 120
    assert h_late["endOffset"] == 144
    assert h_late["color"] == "yellow"
    assert h_late["createdAt"].endswith("Z")
    assert h_late["updatedAt"].endswith("Z")

    first_in_doc = client.post(
        "/api/highlights",
        json={
            "guideId": "torcao",
            "chapterId": "02-distribuicao",
            "exact": "hipótese de seções planas",
            "startOffset": 20,
            "endOffset": 45,
            "color": "blue",
        },
    )
    assert first_in_doc.status_code == 201
    h_early = first_in_doc.json()
    assert h_early["sectionId"] is None
    assert h_early["prefix"] == ""
    assert h_early["suffix"] == ""

    resumo_hl = client.post(
        "/api/highlights",
        json={
            "guideId": "torcao",
            "chapterId": "02-distribuicao",
            "variant": "resumo",
            "exact": "resumo rápido",
            "startOffset": 5,
            "endOffset": 18,
            "color": "green",
        },
    )
    assert resumo_hl.status_code == 201
    h_resumo = resumo_hl.json()
    assert h_resumo["variant"] == "resumo"

    full_list = client.get("/api/highlights?guideId=torcao&chapterId=02-distribuicao")
    assert full_list.status_code == 200
    assert [item["id"] for item in full_list.json()["highlights"]] == [
        h_early["id"],
        h_late["id"],
    ]

    resumo_list = client.get(
        "/api/highlights?guideId=torcao&chapterId=02-distribuicao&variant=resumo"
    )
    assert resumo_list.status_code == 200
    assert [item["id"] for item in resumo_list.json()["highlights"]] == [h_resumo["id"]]

    recolored = client.patch(
        f"/api/highlights/{h_late['id']}",
        json={"color": "pink"},
    )
    assert recolored.status_code == 200
    updated = recolored.json()
    assert updated["id"] == h_late["id"]
    assert updated["color"] == "pink"
    assert updated["createdAt"] == h_late["createdAt"]
    assert updated["updatedAt"].endswith("Z")

    deleted = client.delete(f"/api/highlights/{h_late['id']}")
    assert deleted.status_code == 204
    remaining = client.get("/api/highlights?guideId=torcao&chapterId=02-distribuicao").json()
    assert [item["id"] for item in remaining["highlights"]] == [h_early["id"]]


def test_highlights_validation_and_not_found_errors(client: TestClient) -> None:
    valid = {
        "guideId": "torcao",
        "chapterId": "02-distribuicao",
        "exact": "momento torsor",
        "startOffset": 10,
        "endOffset": 24,
        "color": "yellow",
    }

    assert client.post("/api/highlights", json={**valid, "exact": "   "}).status_code == 422
    assert client.post("/api/highlights", json={**valid, "color": "purple"}).status_code == 422
    assert client.post("/api/highlights", json={**valid, "variant": "draft"}).status_code == 422
    assert client.post("/api/highlights", json={**valid, "endOffset": 10}).status_code == 422
    assert client.post("/api/highlights", json={**valid, "startOffset": -1}).status_code == 422
    assert client.post("/api/highlights", json={**valid, "guideId": " torcao"}).status_code == 422

    assert (
        client.get("/api/highlights?guideId=torcao&chapterId=02-distribuicao&variant=bad").status_code
        == 422
    )
    assert (
        client.get("/api/highlights?guideId=%20torcao&chapterId=02-distribuicao").status_code
        == 422
    )

    assert client.patch("/api/highlights/999999", json={"color": "green"}).status_code == 404
    assert client.delete("/api/highlights/999999").status_code == 404

    created = client.post("/api/highlights", json=valid).json()
    assert (
        client.patch(f"/api/highlights/{created['id']}", json={"color": "orange"}).status_code
        == 422
    )
