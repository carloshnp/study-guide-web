"""T06: stats, habits/streak and deck endpoints."""

from __future__ import annotations

import sqlite3
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.flashcards.scheduler import iso

NOTES = "/api/flashcards/notes"
STATS = "/api/flashcards/stats"
HABITS = "/api/flashcards/habits"
DECKS = "/api/flashcards/decks"


def today() -> date:
    return datetime.now(UTC).date()


def day(offset: int) -> str:
    return (today() + timedelta(days=offset)).isoformat()


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


def seed_review(
    execute: Callable[..., None],
    card_id: int,
    *,
    on: str,
    rating: int = 3,
    state_before: str = "review",
    interval_before: int = 30,
    interval_after: int = 60,
) -> None:
    execute(
        """INSERT INTO fc_revlog
           (card_id, reviewed_at, rating, state_before, interval_before, interval_after, elapsed_ms)
           VALUES (?, ?, ?, ?, ?, ?, 1000)""",
        (card_id, f"{on}T10:00:00Z", rating, state_before, interval_before, interval_after),
    )


def seed_habit(execute: Callable[..., None], on: str, reviews: int = 1) -> None:
    execute(
        """INSERT INTO fc_habits (day, new_reviewed, reviews_done, streak_frozen)
           VALUES (?, 0, ?, 0)
           ON CONFLICT (day) DO UPDATE SET reviews_done = excluded.reviews_done""",
        (on, reviews),
    )


# ------------------------------------------------------------------------- stats


def test_stats_daily_counts_reviews_and_new_cards(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    first = create_note(client)["cards"][0]["id"]
    second = create_note(client, front="O que e cementita?", back="Fe3C.")["cards"][0]["id"]
    seed_review(execute, first, on=day(-2))
    seed_review(execute, first, on=day(-1), state_before="new", interval_before=0)
    seed_review(execute, second, on=day(-1))

    body = client.get(STATS, params={"from": day(-2), "to": day(-1)}).json()

    assert body["daily"] == [
        {"day": day(-2), "reviews": 1, "new": 0},
        {"day": day(-1), "reviews": 2, "new": 1},
    ]


def test_stats_daily_respects_the_window(client: TestClient, execute: Callable[..., None]) -> None:
    card = create_note(client)["cards"][0]["id"]
    seed_review(execute, card, on=day(-10))
    seed_review(execute, card, on=day(-1))

    body = client.get(STATS, params={"from": day(-2), "to": day(0)}).json()

    assert [row["day"] for row in body["daily"]] == [day(-1)]


def test_stats_true_retention_only_counts_mature_cards(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    card = create_note(client)["cards"][0]["id"]
    seed_review(execute, card, on=day(-5), rating=3, interval_before=30)
    seed_review(execute, card, on=day(-4), rating=4, interval_before=25)
    seed_review(execute, card, on=day(-3), rating=1, interval_before=40)
    seed_review(execute, card, on=day(-2), rating=3, interval_before=5)

    body = client.get(STATS, params={"from": day(-6), "to": day(0)}).json()

    assert body["trueRetention"] == pytest.approx(2 / 3, rel=1e-3)
    assert body["matureReviews"] == 3


def test_stats_true_retention_is_null_without_mature_reviews(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    card = create_note(client)["cards"][0]["id"]
    seed_review(execute, card, on=day(-1), interval_before=3)

    body = client.get(STATS, params={"from": day(-2), "to": day(0)}).json()

    assert body["trueRetention"] is None
    assert body["matureReviews"] == 0


def test_stats_forecast_covers_fourteen_days(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    due_today = create_note(client)["cards"][0]["id"]
    due_later = create_note(client, front="O que e cementita?", back="Fe3C.")["cards"][0]["id"]
    suspended = create_note(client, front="Suspenso?", back="Sim.")["cards"][0]["id"]
    execute(
        "UPDATE fc_cards SET due = ?, state = 'review' WHERE id = ?",
        (f"{day(3)}T09:00:00Z", due_later),
    )
    execute(
        "UPDATE fc_cards SET due = ?, state = 'suspended' WHERE id = ?",
        (f"{day(3)}T09:00:00Z", suspended),
    )
    execute(
        "UPDATE fc_cards SET due = ?, state = 'review' WHERE id = ?",
        (f"{day(0)}T23:00:00Z", due_today),
    )

    forecast = client.get(STATS).json()["forecast"]

    assert len(forecast) == 14
    assert forecast[0] == {"day": day(0), "due": 1}
    assert forecast[3] == {"day": day(3), "due": 1}


def test_stats_exclude_deprecated_cards(client: TestClient, execute: Callable[..., None]) -> None:
    card = create_note(client)["cards"][0]["id"]
    seed_review(execute, card, on=day(-1))
    execute("UPDATE fc_cards SET state = 'deprecated' WHERE id = ?", (card,))

    body = client.get(STATS, params={"from": day(-2), "to": day(0)}).json()

    assert body["daily"] == []
    assert body["trueRetention"] is None


@pytest.mark.parametrize("params", [{"from": "2026-13-01"}, {"to": "ontem"}, {"from": day(0), "to": day(-3)}])
def test_invalid_stats_window_is_422(client: TestClient, params: dict[str, str]) -> None:
    assert client.get(STATS, params=params).status_code == 422


# ------------------------------------------------------------------------ habits


def test_habits_lists_active_days_and_streak(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    for offset in (-2, -1, 0):
        seed_habit(execute, day(offset))

    body = client.get(HABITS, params={"from": day(-6), "to": day(0)}).json()

    assert body["activeDays"] == [day(-2), day(-1), day(0)]
    assert body["streak"] == 3
    assert body["freezes"] == 0
    assert body["freezesUsed"] == 0


def test_streak_stops_at_the_first_missing_day_without_a_freeze(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    for offset in (-1, 0, -3):
        seed_habit(execute, day(offset))

    body = client.get(HABITS).json()

    assert body["streak"] == 2
    assert body["freezesUsed"] == 0


def test_streak_consumes_a_freeze_and_keeps_counting(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    # 8 active days with one gap earn exactly one freeze, which bridges the gap.
    for offset in (0, -1, -3, -4, -5, -6, -7, -8):
        seed_habit(execute, day(offset))

    body = client.get(HABITS).json()

    assert body["freezesEarned"] == 1
    assert body["freezesUsed"] == 1
    assert body["freezes"] == 0
    assert body["streak"] == 8


def test_freeze_tokens_are_capped_at_three(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    for offset in range(0, -40, -1):
        seed_habit(execute, day(offset))

    body = client.get(HABITS).json()

    assert body["freezesEarned"] == 3
    assert body["streak"] == 40
    assert body["freezesUsed"] == 0
    assert body["freezes"] == 3


def test_streak_does_not_break_before_today_ends(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    for offset in (-1, -2):
        seed_habit(execute, day(offset))

    body = client.get(HABITS).json()

    assert body["streak"] == 2
    assert body["today"] == day(0)


def test_habits_window_filters_active_days_but_not_the_streak(
    client: TestClient,
    execute: Callable[..., None],
) -> None:
    for offset in (-3, -2, -1, 0):
        seed_habit(execute, day(offset))

    body = client.get(HABITS, params={"from": day(-1), "to": day(0)}).json()

    assert body["activeDays"] == [day(-1), day(0)]
    assert body["streak"] == 4


def test_habit_reviews_from_the_api_show_up_in_stats(client: TestClient) -> None:
    card = create_note(client)["cards"][0]["id"]

    client.post(f"/api/flashcards/cards/{card}/review", json={"rating": 3, "elapsedMs": 800})

    habits = client.get(HABITS).json()
    stats = client.get(STATS).json()
    assert habits["activeDays"] == [day(0)]
    assert habits["streak"] == 1
    assert stats["daily"] == [{"day": day(0), "reviews": 1, "new": 1}]


# ------------------------------------------------------------------------- decks


def build_decks(client: TestClient) -> dict[str, Any]:
    create_note(client, guideId="magnesio", chapterSlug="01-estrutura", sectionId="31-perlita")
    create_note(
        client,
        guideId="magnesio",
        chapterSlug="01-estrutura",
        sectionId="31-perlita",
        front="O que e cementita?",
        back="Fe3C.",
    )
    create_note(client, guideId="magnesio", chapterSlug="02-propriedades", sectionId="21-leveza")
    create_note(client, guideId="dsa", chapterSlug="03-arvores", sectionId="31-bst")
    create_note(client, front="Solto?", back="Sim.")
    return {"ok": True}


def test_deck_list_returns_the_derived_decks(client: TestClient) -> None:
    build_decks(client)

    body = client.get(DECKS).json()

    decks = {deck["id"]: deck for deck in body}
    assert decks["guide:magnesio"]["cardCount"] == 3
    assert decks["chapter:magnesio:01-estrutura"]["cardCount"] == 2
    assert decks["section:magnesio:01-estrutura:31-perlita"]["cardCount"] == 2
    assert decks["guide:dsa"]["cardCount"] == 1
    assert decks["outras"]["cardCount"] == 1
    assert decks["guide:magnesio"]["title"] == "Magnesio"


def test_deck_detail_lists_the_cards_without_answers(client: TestClient) -> None:
    build_decks(client)

    response = client.get(f"{DECKS}/section:magnesio:01-estrutura:31-perlita")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "section:magnesio:01-estrutura:31-perlita"
    assert body["cardCount"] == 2
    assert len(body["cards"]) == 2
    assert {"id", "front", "template", "state"} <= set(body["cards"][0])
    assert "Lamelas" not in response.text


def test_deck_detail_for_an_unknown_deck_is_404(client: TestClient) -> None:
    build_decks(client)

    assert client.get(f"{DECKS}/guide:nao-existe").status_code == 404
    assert client.get(f"{DECKS}/bogus").status_code == 404


def test_deck_session_training_does_not_reschedule_by_default(client: TestClient) -> None:
    build_decks(client)

    response = client.post(
        f"{DECKS}/guide:magnesio/session", json={"mode": "training", "limit": 20}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["deckId"] == "guide:magnesio"
    assert body["sessionMode"] == "training"
    assert body["reschedule"] is False
    assert len(body["cards"]) == 3
    assert "Lamelas" not in response.text


def test_deck_session_review_only_returns_due_cards(
    client: TestClient, execute: Callable[..., None]
) -> None:
    build_decks(client)
    first = client.get(DECKS).json()
    assert first
    execute("UPDATE fc_cards SET due = ?", (f"{day(5)}T10:00:00Z",))

    body = client.post(f"{DECKS}/guide:magnesio/session", json={"mode": "review"}).json()

    assert body["sessionMode"] == "review"
    assert body["cards"] == []


def test_deck_session_honours_the_limit(client: TestClient) -> None:
    build_decks(client)

    body = client.post(f"{DECKS}/guide:magnesio/session", json={"mode": "training", "limit": 2}).json()

    assert len(body["cards"]) == 2
    assert body["hasMore"] is True


def test_deck_session_for_an_unknown_deck_is_404(client: TestClient) -> None:
    build_decks(client)

    assert client.post(f"{DECKS}/guide:nao-existe/session", json={"mode": "training"}).status_code == 404


@pytest.mark.parametrize(
    "payload",
    [{"mode": "bogus"}, {"mode": "training", "limit": 0}, {"mode": "training", "limit": 101}],
)
def test_deck_session_validation(client: TestClient, payload: dict[str, Any]) -> None:
    build_decks(client)

    assert client.post(f"{DECKS}/guide:magnesio/session", json=payload).status_code == 422


def test_deck_session_with_reschedule_reports_it(client: TestClient) -> None:
    build_decks(client)

    body = client.post(
        f"{DECKS}/guide:magnesio/session",
        json={"mode": "training", "reschedule": True},
    ).json()

    assert body["reschedule"] is True


def test_api_reviewed_card_leaves_the_due_queue(client: TestClient) -> None:
    card = create_note(client)["cards"][0]["id"]

    assert len(client.get("/api/flashcards/queue").json()["cards"]) == 1
    client.post(f"/api/flashcards/cards/{card}/review", json={"rating": 3, "elapsedMs": 500})

    assert client.get("/api/flashcards/queue").json()["cards"] == []
