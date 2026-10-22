"""T04: HTTP contract for /api/flashcards/notes."""

from __future__ import annotations

import sqlite3
from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient

BASE = "/api/flashcards/notes"
CLOZE = "A {{c1::perlita}} e formada por {{c2::ferrita}} e {{c3::cementita}}."


def new_note(client: TestClient, **payload: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "kind": "basic",
        "front": "O que e perlita?",
        "back": "Lamelas de ferrita e cementita.",
    }
    body.update(payload)
    return client.post(BASE, json=body)


def test_create_basic_note_creates_one_card(client: TestClient) -> None:
    response = new_note(
        client,
        guideId="magnesio",
        chapterSlug="01-estrutura",
        sectionId="31-perlita",
        sourceSnippet="A perlita e ...",
        tags="metal,estrutura",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["kind"] == "basic"
    assert body["guideId"] == "magnesio"
    assert body["chapterSlug"] == "01-estrutura"
    assert body["sectionId"] == "31-perlita"
    assert body["sourceSnippet"] == "A perlita e ..."
    assert body["tags"] == "metal,estrutura"
    assert body["createdAt"].endswith("Z")
    assert [card["template"] for card in body["cards"]] == ["basic"]
    assert body["cards"][0]["state"] == "new"
    assert body["cards"][0]["due"].endswith("Z")


def test_create_standalone_note_has_null_anchors(client: TestClient) -> None:
    body = new_note(client).json()

    assert body["guideId"] is None
    assert body["chapterSlug"] is None
    assert body["sectionId"] is None
    assert body["sourceSnippet"] is None
    assert body["tags"] == ""


def test_create_reverse_note_creates_two_cards(client: TestClient) -> None:
    response = new_note(client, kind="basic-reverse", front="F", back="B")

    assert response.status_code == 201
    assert [card["template"] for card in response.json()["cards"]] == ["basic", "reverse"]


def test_create_cloze_note_creates_one_card_per_lacuna(client: TestClient) -> None:
    response = new_note(client, kind="cloze", front=CLOZE, back="")

    assert response.status_code == 201
    body = response.json()
    assert [card["template"] for card in body["cards"]] == ["cloze:c1", "cloze:c2", "cloze:c3"]


def test_create_cloze_dedupes_repeated_lacunas(client: TestClient) -> None:
    body = new_note(client, kind="cloze", front="{{c1::A}} e {{c1::B}}", back="").json()

    assert [card["template"] for card in body["cards"]] == ["cloze:c1"]


def test_create_note_accepts_snake_case_keys(client: TestClient) -> None:
    response = client.post(
        BASE,
        json={"kind": "basic", "front": "F", "back": "B", "guide_id": "magnesio"},
    )

    assert response.status_code == 201
    assert response.json()["guideId"] == "magnesio"


def test_invalid_kind_is_422_naming_the_field(client: TestClient) -> None:
    response = new_note(client, kind="typo")

    assert response.status_code == 422
    assert "kind" in response.text


def test_cloze_without_a_lacuna_is_422_naming_front(client: TestClient) -> None:
    response = new_note(client, kind="cloze", front="sem lacunas", back="")

    assert response.status_code == 422
    assert "front" in response.text


def test_malformed_cloze_is_422(client: TestClient) -> None:
    response = new_note(client, kind="cloze", front="{{c1::}}", back="")

    assert response.status_code == 422
    assert "front" in response.text


def test_blank_front_is_422(client: TestClient) -> None:
    response = new_note(client, front="   ")

    assert response.status_code == 422
    assert "front" in response.text


def test_blank_back_is_422_for_basic_cards(client: TestClient) -> None:
    response = new_note(client, back="  ")

    assert response.status_code == 422
    assert "back" in response.text


def test_chapter_anchor_without_a_guide_is_422(client: TestClient) -> None:
    response = new_note(client, chapterSlug="01-estrutura")

    assert response.status_code == 422
    assert "guideId" in response.text


def test_unknown_field_is_422(client: TestClient) -> None:
    assert new_note(client, colour="blue").status_code == 422


def test_get_notes_lists_every_note(client: TestClient) -> None:
    new_note(client)
    new_note(client, guideId="dsa", front="O que e uma BST?", back="Arvore binaria de busca.")

    body = client.get(BASE).json()

    assert body["count"] == 2
    assert [note["id"] for note in body["notes"]] == [1, 2]
    assert body["notes"][1]["guideId"] == "dsa"


def test_get_notes_filters_by_guide(client: TestClient) -> None:
    new_note(client, guideId="magnesio")
    new_note(client, guideId="dsa")

    body = client.get(BASE, params={"guideId": "dsa"}).json()

    assert body["count"] == 1
    assert body["notes"][0]["guideId"] == "dsa"


def test_get_single_note(client: TestClient) -> None:
    created = new_note(client).json()

    response = client.get(f"{BASE}/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_missing_note_is_404(client: TestClient) -> None:
    assert client.get(f"{BASE}/404").status_code == 404


def test_patch_updates_the_note_and_keeps_the_card(client: TestClient) -> None:
    created = new_note(client).json()
    card_id = created["cards"][0]["id"]

    response = client.patch(
        f"{BASE}/{created['id']}",
        json={"front": "O que e cementita?", "tags": "metal"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["front"] == "O que e cementita?"
    assert body["tags"] == "metal"
    assert [card["id"] for card in body["cards"]] == [card_id]


def test_patch_to_reverse_adds_a_card(client: TestClient) -> None:
    created = new_note(client).json()

    body = client.patch(f"{BASE}/{created['id']}", json={"kind": "basic-reverse"}).json()

    assert [card["template"] for card in body["cards"]] == ["basic", "reverse"]


def test_patch_cloze_deprecates_removed_lacunas_and_keeps_their_revlog(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
    execute: Callable[..., None],
) -> None:
    created = new_note(client, kind="cloze", front=CLOZE, back="").json()
    cards = {card["template"]: card for card in created["cards"]}
    assert set(cards) == {"cloze:c1", "cloze:c2", "cloze:c3"}
    execute(
        """INSERT INTO fc_revlog
           (card_id, reviewed_at, rating, state_before, interval_before, interval_after, elapsed_ms)
           VALUES (?, '2026-10-20T10:00:00Z', 3, 'new', 0, 1, 900)""",
        (cards["cloze:c2"]["id"],),
    )

    body = client.patch(
        f"{BASE}/{created['id']}",
        json={"front": "A {{c1::perlita}} e formada por {{c3::cementita}}."},
    ).json()

    by_template = {card["template"]: card for card in body["cards"]}
    assert set(by_template) == {"cloze:c1", "cloze:c2", "cloze:c3"}
    assert by_template["cloze:c2"]["state"] == "deprecated"
    assert by_template["cloze:c2"]["deprecatedAt"] is not None
    assert by_template["cloze:c1"]["state"] == "new"
    assert by_template["cloze:c1"]["id"] == cards["cloze:c1"]["id"]
    assert by_template["cloze:c3"]["id"] == cards["cloze:c3"]["id"]
    kept = rows("SELECT * FROM fc_revlog WHERE card_id = ?", (cards["cloze:c2"]["id"],))
    assert len(kept) == 1


def test_patch_cloze_adding_a_lacuna_creates_a_card(client: TestClient) -> None:
    created = new_note(client, kind="cloze", front="{{c1::A}}", back="").json()

    body = client.patch(f"{BASE}/{created['id']}", json={"front": "{{c1::A}} e {{c2::B}}"}).json()

    by_template = {card["template"]: card for card in body["cards"]}
    assert set(by_template) == {"cloze:c1", "cloze:c2"}
    assert by_template["cloze:c2"]["id"] != by_template["cloze:c1"]["id"]
    assert by_template["cloze:c1"]["id"] == created["cards"][0]["id"]


def test_patch_cloze_without_lacunas_is_422(client: TestClient) -> None:
    created = new_note(client, kind="cloze", front="{{c1::A}}", back="").json()

    response = client.patch(f"{BASE}/{created['id']}", json={"front": "sem lacunas"})

    assert response.status_code == 422
    assert "front" in response.text


def test_patch_missing_note_is_404(client: TestClient) -> None:
    assert client.patch(f"{BASE}/404", json={"front": "x"}).status_code == 404


def test_regenerate_endpoint_restores_missing_cards(client: TestClient) -> None:
    created = new_note(client, kind="cloze", front=CLOZE, back="").json()

    response = client.post(f"{BASE}/{created['id']}/cards")

    assert response.status_code == 200
    assert len(response.json()["cards"]) == 3


def test_delete_note_cascades(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
) -> None:
    created = new_note(client, kind="basic-reverse").json()

    response = client.delete(f"{BASE}/{created['id']}")

    assert response.status_code == 200
    assert response.json() == {"id": created["id"], "deleted": True}
    assert rows("SELECT * FROM fc_notes") == []
    assert rows("SELECT * FROM fc_cards") == []
    assert client.get(BASE).json()["count"] == 0


def test_delete_missing_note_is_404(client: TestClient) -> None:
    assert client.delete(f"{BASE}/404").status_code == 404


def test_notes_survive_a_new_app_instance(client: TestClient, web_dist, content_dir) -> None:
    created = new_note(client, guideId="magnesio").json()

    from app.main import create_app

    with TestClient(create_app(web_dist=web_dist, content_dir=content_dir)) as second:
        body = second.get(BASE).json()

    assert body["count"] == 1
    assert body["notes"][0]["front"] == created["front"]
