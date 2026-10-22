"""T05: queue, reveal, review and settings endpoints."""

from __future__ import annotations

import sqlite3
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.flashcards.scheduler import iso

NOTES = "/api/flashcards/notes"
QUEUE = "/api/flashcards/queue"
CARDS = "/api/flashcards/cards"
SETTINGS = "/api/flashcards/settings"


def create_note(client: TestClient, **payload: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "kind": "basic",
        "front": "O que e perlita?",
        "back": "Lamelas de ferrita e cementita.",
    }
    body.update(payload)
    response = client.post(NOTES, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def now() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def make_mature(execute: Callable[..., None], card_id: int, *, days: int = 20, lapses: int = 0) -> None:
    """Turn a fresh card into a review card scheduled ``days`` ago."""
    moment = now()
    execute(
        """UPDATE fc_cards
              SET state = 'review', stability = ?, difficulty = 6.0,
                  due = ?, last_review = ?, reps = 3, lapses = ?
            WHERE id = ?""",
        (
            190.0,
            iso(moment),
            iso(moment - timedelta(days=days)),
            lapses,
            card_id,
        ),
    )


# ------------------------------------------------------------------------- queue


def test_queue_returns_due_cards_without_the_answer(client: TestClient) -> None:
    created = create_note(client, guideId="magnesio", chapterSlug="01-estrutura")

    response = client.get(QUEUE)

    assert response.status_code == 200
    body = response.json()
    assert len(body["cards"]) == 1
    card = body["cards"][0]
    assert card["id"] == created["cards"][0]["id"]
    assert card["noteId"] == created["id"]
    assert card["kind"] == "basic"
    assert card["template"] == "basic"
    assert card["front"] == "O que e perlita?"
    assert card["scopeMeta"]["guideId"] == "magnesio"
    assert card["scopeMeta"]["chapterSlug"] == "01-estrutura"
    assert "back" not in card
    assert "Lamelas" not in response.text
    assert body["hasMore"] is False
    assert body["sessionMode"] == "review"


def test_queue_never_leaks_a_cloze_answer(client: TestClient) -> None:
    create_note(
        client,
        kind="cloze",
        front="A {{c1::perlita}} e formada por ferrita.",
        back="",
    )

    response = client.get(QUEUE)

    assert response.status_code == 200
    front = response.json()["cards"][0]["front"]
    assert front == "A [...] e formada por ferrita."
    assert "perlita" not in response.text


def test_queue_never_leaks_a_reverse_answer(client: TestClient) -> None:
    create_note(client, kind="basic-reverse", front="perlita", back="lamelas")

    body = client.get(QUEUE).json()

    prompts = {card["template"]: card["front"] for card in body["cards"]}
    assert prompts == {"basic": "perlita", "reverse": "lamelas"}


def test_queue_caps_the_session_and_reports_more(client: TestClient) -> None:
    for index in range(3):
        create_note(client, front=f"Pergunta {index}?", back=f"Resposta {index}")

    body = client.get(QUEUE, params={"limit": 2}).json()

    assert len(body["cards"]) == 2
    assert body["hasMore"] is True
    assert body["nextCursor"] == body["cards"][-1]["id"]


def test_queue_cursor_returns_the_next_page(client: TestClient) -> None:
    for index in range(3):
        create_note(client, front=f"Pergunta {index}?", back=f"Resposta {index}")
    first = client.get(QUEUE, params={"limit": 2}).json()

    second = client.get(QUEUE, params={"limit": 2, "cursor": first["nextCursor"]}).json()

    assert len(second["cards"]) == 1
    assert second["hasMore"] is False
    assert second["nextCursor"] is None
    assert {card["id"] for card in first["cards"]}.isdisjoint({card["id"] for card in second["cards"]})


def test_queue_scope_filters_by_guide(client: TestClient) -> None:
    create_note(client, guideId="magnesio")
    create_note(client, guideId="dsa", front="BST?", back="Arvore.")

    body = client.get(QUEUE, params={"scope": "guide:dsa"}).json()

    assert len(body["cards"]) == 1
    assert body["cards"][0]["scopeMeta"]["guideId"] == "dsa"


@pytest.mark.parametrize("scope", ["bogus", "guide:", "", "chapter:a"])
def test_invalid_scope_is_422(client: TestClient, scope: str) -> None:
    assert client.get(QUEUE, params={"scope": scope}).status_code == 422


@pytest.mark.parametrize("limit", [0, -1, 101])
def test_invalid_limit_is_422(client: TestClient, limit: int) -> None:
    assert client.get(QUEUE, params={"limit": limit}).status_code == 422


def test_training_queue_includes_cards_that_are_not_due(client: TestClient, execute: Callable[..., None]) -> None:
    created = create_note(client)
    execute(
        "UPDATE fc_cards SET due = ? WHERE id = ?",
        (iso(now() + timedelta(days=30)), created["cards"][0]["id"]),
    )

    assert client.get(QUEUE).json()["cards"] == []
    body = client.get(QUEUE, params={"mode": "training"}).json()

    assert body["sessionMode"] == "training"
    assert len(body["cards"]) == 1


# ---------------------------------------------------------------- prompt/reveal


def test_get_card_returns_the_prompt_only(client: TestClient) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]

    response = client.get(f"{CARDS}/{card_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == card_id
    assert body["front"] == "O que e perlita?"
    assert "back" not in body
    assert "Lamelas" not in response.text


def test_get_missing_card_is_404(client: TestClient) -> None:
    assert client.get(f"{CARDS}/404").status_code == 404


# ------------------------------------------------------------------------ review


def test_review_a_new_card_records_the_revlog_and_the_habit(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]

    response = client.post(f"{CARDS}/{card_id}/review", json={"rating": 3, "elapsedMs": 4200})

    assert response.status_code == 200
    body = response.json()
    assert body["cardId"] == card_id
    assert body["rating"] == 3
    assert body["correct"] is True
    assert body["answer"] == "Lamelas de ferrita e cementita."
    assert body["state"] == "review"
    assert body["nextIntervalDays"] == 1
    assert body["recorded"] is True
    assert body["sessionMode"] == "review"
    log = rows("SELECT * FROM fc_revlog WHERE card_id = ?", (card_id,))
    assert len(log) == 1
    assert log[0]["rating"] == 3
    assert log[0]["state_before"] == "new"
    assert log[0]["elapsed_ms"] == 4200
    habit = rows("SELECT * FROM fc_habits")
    assert len(habit) == 1
    assert habit[0]["reviews_done"] == 1
    assert habit[0]["new_reviewed"] == 1


def test_review_again_keeps_the_card_in_learning(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]

    body = client.post(f"{CARDS}/{card_id}/review", json={"rating": 1, "elapsedMs": 900}).json()

    assert body["correct"] is False
    assert body["state"] == "learning"
    assert body["nextIntervalDays"] == 0
    assert body["answer"] == "Lamelas de ferrita e cementita."
    card = rows("SELECT state, due FROM fc_cards WHERE id = ?", (card_id,))[0]
    assert card["state"] == "learning"


def test_review_a_mature_card_grows_the_interval(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
    execute: Callable[..., None],
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]
    make_mature(execute, card_id, days=20)

    body = client.post(f"{CARDS}/{card_id}/review", json={"rating": 3, "elapsedMs": 2500}).json()

    assert body["state"] == "review"
    assert body["nextIntervalDays"] > 20
    log = rows("SELECT * FROM fc_revlog WHERE card_id = ?", (card_id,))[0]
    assert log["state_before"] == "review"
    assert log["interval_before"] == 20
    assert log["interval_after"] == body["nextIntervalDays"]


def test_review_updates_the_habit_counters_without_double_counting_new(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
    execute: Callable[..., None],
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]
    client.post(f"{CARDS}/{card_id}/review", json={"rating": 3, "elapsedMs": 1000})
    make_mature(execute, card_id, days=3)

    client.post(f"{CARDS}/{card_id}/review", json={"rating": 3, "elapsedMs": 1000})

    habit = rows("SELECT * FROM fc_habits")[0]
    assert habit["reviews_done"] == 2
    assert habit["new_reviewed"] == 1


@pytest.mark.parametrize("rating", [0, 5, -1, 2.5, "3"])
def test_invalid_rating_is_422_and_writes_nothing(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
    rating: object,
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]

    response = client.post(f"{CARDS}/{card_id}/review", json={"rating": rating, "elapsedMs": 10})

    assert response.status_code == 422
    assert rows("SELECT * FROM fc_revlog") == []


def test_missing_elapsed_ms_is_422(client: TestClient) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]

    assert client.post(f"{CARDS}/{card_id}/review", json={"rating": 3}).status_code == 422


def test_negative_elapsed_ms_is_422(client: TestClient) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]

    assert (
        client.post(f"{CARDS}/{card_id}/review", json={"rating": 3, "elapsedMs": -5}).status_code
        == 422
    )


def test_review_missing_card_is_404(client: TestClient) -> None:
    assert client.post(f"{CARDS}/404/review", json={"rating": 3, "elapsedMs": 1}).status_code == 404


def test_review_a_suspended_card_is_409(client: TestClient, execute: Callable[..., None]) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]
    execute("UPDATE fc_cards SET state = 'suspended' WHERE id = ?", (card_id,))

    assert client.post(f"{CARDS}/{card_id}/review", json={"rating": 3, "elapsedMs": 1}).status_code == 409


def test_training_review_without_reschedule_writes_nothing(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]
    before = dict(rows("SELECT * FROM fc_cards WHERE id = ?", (card_id,))[0])

    response = client.post(
        f"{CARDS}/{card_id}/review",
        json={"rating": 3, "elapsedMs": 5000, "mode": "training", "reschedule": False},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["recorded"] is False
    assert body["sessionMode"] == "training"
    assert body["answer"] == "Lamelas de ferrita e cementita."
    assert body["nextIntervalDays"] >= 1
    after = dict(rows("SELECT * FROM fc_cards WHERE id = ?", (card_id,))[0])
    assert after == before
    assert rows("SELECT * FROM fc_revlog") == []
    assert rows("SELECT * FROM fc_habits") == []


def test_training_review_defaults_to_no_reschedule(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]

    body = client.post(
        f"{CARDS}/{card_id}/review",
        json={"rating": 3, "elapsedMs": 5000, "mode": "training"},
    ).json()

    assert body["recorded"] is False
    assert rows("SELECT * FROM fc_revlog") == []
    assert rows("SELECT state FROM fc_cards WHERE id = ?", (card_id,))[0]["state"] == "new"


def test_training_review_with_reschedule_persists(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]

    body = client.post(
        f"{CARDS}/{card_id}/review",
        json={"rating": 4, "elapsedMs": 5000, "mode": "training", "reschedule": True},
    ).json()

    assert body["recorded"] is True
    assert len(rows("SELECT * FROM fc_revlog")) == 1
    assert rows("SELECT state FROM fc_cards WHERE id = ?", (card_id,))[0]["state"] == "review"


def test_review_chain_leech_suspends_the_card(
    client: TestClient,
    rows: Callable[..., list[sqlite3.Row]],
    execute: Callable[..., None],
) -> None:
    created = create_note(client)
    card_id = created["cards"][0]["id"]
    make_mature(execute, card_id, days=10, lapses=7)

    body = client.post(f"{CARDS}/{card_id}/review", json={"rating": 1, "elapsedMs": 2000}).json()

    assert body["state"] == "suspended"
    assert body["leech"] == 1
    assert body["lapses"] == 8
    card = rows("SELECT state, leech FROM fc_cards WHERE id = ?", (card_id,))[0]
    assert card["state"] == "suspended"
    assert card["leech"] == 1


# ---------------------------------------------------------------------- settings


def test_get_settings_returns_the_defaults(client: TestClient) -> None:
    response = client.get(SETTINGS)

    assert response.status_code == 200
    body = response.json()
    assert body["dailyNewLimit"] == 10
    assert body["reviewCap"] == 200
    assert body["floor"] == 5
    assert body["desiredRetentionDefault"] == 0.9
    assert body["perGuide"] == {}
    assert body["warnHighRetention"] is False


def test_post_settings_updates_and_returns_the_state(client: TestClient) -> None:
    response = client.post(
        SETTINGS,
        json={
            "dailyNewLimit": 25,
            "reviewCap": 150,
            "floor": 3,
            "desiredRetentionDefault": 0.92,
            "perGuide": {"magnesio": 0.88},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["dailyNewLimit"] == 25
    assert body["reviewCap"] == 150
    assert body["floor"] == 3
    assert body["desiredRetentionDefault"] == 0.92
    assert body["perGuide"] == {"magnesio": 0.88}
    assert body["warnHighRetention"] is False
    assert client.get(SETTINGS).json()["dailyNewLimit"] == 25


def test_post_settings_is_a_partial_update(client: TestClient) -> None:
    client.post(SETTINGS, json={"dailyNewLimit": 30, "floor": 2})

    body = client.post(SETTINGS, json={"floor": 4}).json()

    assert body["dailyNewLimit"] == 30
    assert body["floor"] == 4


def test_settings_warn_above_95_percent(client: TestClient) -> None:
    body = client.post(SETTINGS, json={"perGuide": {"magnesio": 0.96}}).json()

    assert body["warnHighRetention"] is True
    assert body["warnings"]
    assert "magnesio" in body["warnings"][0]


@pytest.mark.parametrize(
    "payload",
    [
        {"desiredRetentionDefault": 0.84},
        {"desiredRetentionDefault": 0.98},
        {"perGuide": {"magnesio": 0.5}},
        {"perGuide": {"magnesio": 0.99}},
        {"dailyNewLimit": 0},
        {"reviewCap": -3},
        {"floor": -1},
    ],
)
def test_out_of_range_settings_are_422(client: TestClient, payload: dict[str, Any]) -> None:
    assert client.post(SETTINGS, json=payload).status_code == 422


def test_unknown_settings_field_is_422(client: TestClient) -> None:
    assert client.post(SETTINGS, json={"colour": "blue"}).status_code == 422


def test_guide_retention_changes_the_next_interval(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    first = create_note(client, guideId="magnesio")
    second = create_note(client, guideId="dsa", front="BST?", back="Arvore.")
    make_mature(execute, first["cards"][0]["id"], days=20)
    make_mature(execute, second["cards"][0]["id"], days=20)
    client.post(SETTINGS, json={"perGuide": {"magnesio": 0.85, "dsa": 0.95}})

    looser = client.post(
        f"{CARDS}/{first['cards'][0]['id']}/review", json={"rating": 3, "elapsedMs": 10}
    ).json()
    tighter = client.post(
        f"{CARDS}/{second['cards'][0]['id']}/review", json={"rating": 3, "elapsedMs": 10}
    ).json()

    assert looser["nextIntervalDays"] > tighter["nextIntervalDays"]
