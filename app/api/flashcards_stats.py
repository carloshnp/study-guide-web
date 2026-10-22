"""Stats, habits/streak and derived-deck endpoints.

Aggregates are computed from ``fc_revlog``/``fc_cards`` on every request (the data
volume of a single user is tiny, and there is no cache to invalidate). Two rules are
enforced in SQL: ``deprecated`` cards are excluded from every number, and "true
retention" only counts reviews of mature cards (``interval_before >= 21`` days).

The streak deliberately has no punishment semantics: a missed day is forgiven by a
freeze token while one is available, tokens accrue one per seven active days (max
three), and the count never goes negative.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from app.api.flashcards_common import Connection, deck_card_payload, question_payload
from app.flashcards import db as fdb
from app.flashcards import queue as fqueue

router = APIRouter(prefix="/api/flashcards", tags=["flashcards-stats"])

DEFAULT_WINDOW_DAYS = 30
HABIT_WINDOW_DAYS = 365
FORECAST_DAYS = fqueue.FORECAST_DAYS
MATURE_INTERVAL_DAYS = 21
FREEZE_PER_ACTIVE_DAYS = 7
MAX_FREEZES = 3

Kind = Literal["basic", "basic-reverse", "cloze"]
StateName = Literal["new", "learning", "review", "suspended", "deprecated"]
SessionMode = Literal["review", "training"]




class DayCount(BaseModel):
    """Reviews on one day (``new`` counts cards that were new before the rating)."""

    day: str
    reviews: int
    new: int


class ForecastDay(BaseModel):
    """Cards due on one future day."""

    day: str
    due: int


class StatsOut(BaseModel):
    """GET /stats."""

    model_config = ConfigDict(populate_by_name=True)

    daily: list[DayCount]
    true_retention: float | None = Field(default=None, alias="trueRetention")
    mature_reviews: int = Field(default=0, alias="matureReviews")
    forecast: list[ForecastDay]
    day_from: str = Field(alias="from")
    day_to: str = Field(alias="to")


class HabitsOut(BaseModel):
    """GET /habits."""

    model_config = ConfigDict(populate_by_name=True)

    active_days: list[str] = Field(alias="activeDays")
    streak: int
    freezes: int
    freezes_earned: int = Field(default=0, alias="freezesEarned")
    freezes_used: int = Field(default=0, alias="freezesUsed")
    today: str
    day_from: str = Field(alias="from")
    day_to: str = Field(alias="to")


class ScopeMetaOut(BaseModel):
    """Source anchor of a card."""

    model_config = ConfigDict(populate_by_name=True)

    guide_id: str | None = Field(default=None, alias="guideId")
    chapter_slug: str | None = Field(default=None, alias="chapterSlug")
    section_id: str | None = Field(default=None, alias="sectionId")
    source_snippet: str | None = Field(default=None, alias="sourceSnippet")


class DeckSummary(BaseModel):
    """One derived deck."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: Literal["guide", "chapter", "section", "outras"]
    guide_id: str | None = Field(default=None, alias="guideId")
    chapter_slug: str | None = Field(default=None, alias="chapterSlug")
    section_id: str | None = Field(default=None, alias="sectionId")
    title: str
    card_count: int = Field(alias="cardCount")


class DeckCard(BaseModel):
    """One browsed card (prompt only)."""

    model_config = ConfigDict(populate_by_name=True)

    id: int
    note_id: int = Field(alias="noteId")
    kind: Kind
    template: str
    state: StateName
    front: str
    due: str | None = None
    scope_meta: ScopeMetaOut = Field(alias="scopeMeta")


class DeckDetail(DeckSummary):
    """GET /decks/<id>."""

    cards: list[DeckCard] = Field(default_factory=list)


class SessionCard(DeckCard):
    """A card in a session (no answer)."""


class SessionRequest(BaseModel):
    """Body of POST /decks/<id>/session."""

    mode: SessionMode = "review"
    reschedule: bool | None = None
    limit: int = Field(default=fqueue.DEFAULT_LIMIT, ge=1, le=fqueue.MAX_LIMIT)


class DeckSessionOut(BaseModel):
    """A deck session page, shaped like ``GET /queue``."""

    model_config = ConfigDict(populate_by_name=True)

    deck_id: str = Field(alias="deckId")
    cards: list[DeckCard]
    has_more: bool = Field(alias="hasMore")
    session_mode: SessionMode = Field(alias="sessionMode")
    next_cursor: int | None = Field(default=None, alias="nextCursor")
    scope: str
    reschedule: bool = True


def _parse_day(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail={"field": field, "message": f"{field} must be YYYY-MM-DD"}
        ) from exc


def _window(day_from: str | None, day_to: str | None, *, days: int) -> tuple[str, str]:
    """Resolve an inclusive day window, defaulting to the last ``days`` days."""
    end = _parse_day(day_to, "to") if day_to else datetime.now(UTC).date()
    start = _parse_day(day_from, "from") if day_from else end - timedelta(days=days - 1)
    if start > end:
        raise HTTPException(
            status_code=422, detail={"field": "from", "message": "from must be before to"}
        )
    return start.isoformat(), end.isoformat()


@router.get("/stats", response_model=StatsOut)
def read_stats(
    connection: Connection,
    day_from: str | None = Query(default=None, alias="from", max_length=10),
    day_to: str | None = Query(default=None, alias="to", max_length=10),
) -> StatsOut:
    """Daily reviews, true retention and the 14-day load forecast."""
    start, end = _window(day_from, day_to, days=DEFAULT_WINDOW_DAYS)

    daily_rows = connection.execute(
        """
        SELECT substr(r.reviewed_at, 1, 10) AS day,
               COUNT(*) AS reviews,
               SUM(CASE WHEN r.state_before = 'new' THEN 1 ELSE 0 END) AS new
          FROM fc_revlog r
          JOIN fc_cards c ON c.id = r.card_id
         WHERE c.state != 'deprecated'
           AND substr(r.reviewed_at, 1, 10) BETWEEN ? AND ?
         GROUP BY day
         ORDER BY day
        """,
        (start, end),
    ).fetchall()
    daily = [
        DayCount(day=row["day"], reviews=int(row["reviews"]), new=int(row["new"] or 0))
        for row in daily_rows
    ]

    retention_row = connection.execute(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN r.rating >= 3 THEN 1 ELSE 0 END) AS hits
          FROM fc_revlog r
          JOIN fc_cards c ON c.id = r.card_id
         WHERE c.state != 'deprecated'
           AND r.interval_before >= ?
           AND substr(r.reviewed_at, 1, 10) BETWEEN ? AND ?
        """,
        (MATURE_INTERVAL_DAYS, start, end),
    ).fetchone()
    mature = int(retention_row["total"] or 0)
    hits = int(retention_row["hits"] or 0)
    true_retention = round(hits / mature, 4) if mature else None

    today = datetime.now(UTC).date()
    last_forecast = today + timedelta(days=FORECAST_DAYS - 1)
    due_rows = connection.execute(
        """
        SELECT substr(due, 1, 10) AS day, COUNT(*) AS due
          FROM fc_cards
         WHERE state IN ('learning', 'review')
           AND due IS NOT NULL
           AND substr(due, 1, 10) BETWEEN ? AND ?
         GROUP BY day
        """,
        (today.isoformat(), last_forecast.isoformat()),
    ).fetchall()
    due_by_day = {row["day"]: int(row["due"]) for row in due_rows}
    forecast = [
        ForecastDay(day=day.isoformat(), due=due_by_day.get(day.isoformat(), 0))
        for day in (today + timedelta(days=offset) for offset in range(FORECAST_DAYS))
    ]

    return StatsOut.model_validate(
        {
            "daily": daily,
            "trueRetention": true_retention,
            "matureReviews": mature,
            "forecast": forecast,
            "from": start,
            "to": end,
        }
    )


def _streak(active_days: set[str], today_str: str) -> tuple[int, int, int]:
    """Return ``(streak, freezes_used, freezes_earned)`` walking back from today."""
    earned = min(MAX_FREEZES, len(active_days) // FREEZE_PER_ACTIVE_DAYS)
    used = 0
    streak = 0
    cursor = date.fromisoformat(today_str)
    if today_str not in active_days:
        # Today is not over: a missing day today never breaks the streak.
        cursor -= timedelta(days=1)
    earliest = date.fromisoformat(min(active_days)) if active_days else cursor
    while cursor >= earliest:
        if cursor.isoformat() in active_days:
            streak += 1
        elif used < earned:
            used += 1
        else:
            break
        cursor -= timedelta(days=1)
    return streak, used, earned


@router.get("/habits", response_model=HabitsOut)
def read_habits(
    connection: Connection,
    day_from: str | None = Query(default=None, alias="from", max_length=10),
    day_to: str | None = Query(default=None, alias="to", max_length=10),
) -> HabitsOut:
    """Active days (heatmap) plus the streak with its freeze tokens."""
    start, end = _window(day_from, day_to, days=HABIT_WINDOW_DAYS)
    habits = fdb.list_habits(connection, day_from=start, day_to=end)
    active_days = [row["day"] for row in habits if int(row["reviews_done"]) > 0]
    all_active = {
        row["day"]
        for row in fdb.list_habits(connection)
        if int(row["reviews_done"]) > 0
    }
    today_str = datetime.now(UTC).date().isoformat()
    streak, used, earned = _streak(all_active, today_str)
    return HabitsOut.model_validate(
        {
            "activeDays": active_days,
            "streak": streak,
            "freezes": max(0, earned - used),
            "freezesEarned": earned,
            "freezesUsed": used,
            "today": today_str,
            "from": start,
            "to": end,
        }
    )


@router.get("/decks", response_model=list[DeckSummary])
def list_decks(connection: Connection) -> list[DeckSummary]:
    """Every derived deck with its live card count."""
    return [DeckSummary.model_validate(deck) for deck in fqueue.list_decks(connection)]


def _deck_cards_or_404(connection: Connection, deck_id: str) -> list[Any]:
    try:
        cards = fqueue.deck_cards(connection, deck_id)
    except fqueue.InvalidScope as exc:
        raise HTTPException(status_code=404, detail="deck not found") from exc
    if not cards:
        raise HTTPException(status_code=404, detail="deck not found")
    return cards


@router.get("/decks/{deck_id}", response_model=DeckDetail)
def read_deck(deck_id: str, connection: Connection) -> DeckDetail:
    """Deck metadata plus every card, for browsing."""
    cards = _deck_cards_or_404(connection, deck_id)
    meta = fqueue.deck_meta(connection, deck_id)
    if meta is None:  # pragma: no cover - guarded by the call above
        raise HTTPException(status_code=404, detail="deck not found")
    payload = {**meta, "cards": [deck_card_payload(row) for row in cards]}
    return DeckDetail.model_validate(payload)


@router.post("/decks/{deck_id}/session", response_model=DeckSessionOut)
def start_deck_session(
    deck_id: str, payload: SessionRequest, connection: Connection
) -> DeckSessionOut:
    """Start (or continue) a session on one deck: training or scheduled review."""
    _deck_cards_or_404(connection, deck_id)
    scope = fqueue.parse_deck_id(deck_id)
    reschedule = (
        payload.reschedule
        if payload.reschedule is not None
        else payload.mode == "review"
    )
    session = fqueue.build_session(
        connection,
        scope=scope,
        limit=payload.limit,
        mode=payload.mode,
        reschedule=reschedule,
    )
    return DeckSessionOut(
        deckId=deck_id,
        cards=[DeckCard.model_validate(deck_card_payload(row)) for row in session.cards],
        hasMore=session.has_more,
        sessionMode=session.session_mode,  # type: ignore[arg-type]
        nextCursor=session.next_cursor,
        scope=session.scope,
        reschedule=session.reschedule,
    )
