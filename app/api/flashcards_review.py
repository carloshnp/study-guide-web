"""Queue, reveal, review and settings endpoints for flashcards.

The prompt endpoints (``/queue`` and ``/cards/<id>``) never carry the answer: it is
only released by ``POST /cards/<id>/review`` (contract-tested). Every review that is
persisted goes through :mod:`app.flashcards.scheduler`, which is the only writer of
``fc_cards``/``fc_revlog``; the router only updates the daily habit counters.

``mode=training`` with ``reschedule=false`` (the default for training) computes the
feedback but deliberately persists nothing - no revlog, no card change, no habit.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.flashcards_common import Connection, answer_payload, question_payload
from app.flashcards import db as fdb
from app.flashcards import queue as fqueue
from app.flashcards import scheduler as sched

router = APIRouter(prefix="/api/flashcards", tags=["flashcards-review"])

MIN_RETENTION = sched.MIN_RETENTION
MAX_RETENTION = sched.MAX_RETENTION
WARN_RETENTION = 0.95
MAX_LIMIT = fqueue.MAX_LIMIT

Kind = Literal["basic", "basic-reverse", "cloze"]
StateName = Literal["new", "learning", "review", "suspended", "deprecated"]
SessionMode = Literal["review", "training"]


class ScopeMetaOut(BaseModel):
    """Where a card came from, so the UI can link back to the guide."""

    model_config = ConfigDict(populate_by_name=True)

    guide_id: str | None = Field(default=None, alias="guideId")
    chapter_slug: str | None = Field(default=None, alias="chapterSlug")
    section_id: str | None = Field(default=None, alias="sectionId")
    source_snippet: str | None = Field(default=None, alias="sourceSnippet")


class QueueCard(BaseModel):
    """One card prompt (no answer)."""

    model_config = ConfigDict(populate_by_name=True)

    id: int
    note_id: int = Field(alias="noteId")
    kind: Kind
    template: str
    state: StateName
    front: str
    scope_meta: ScopeMetaOut = Field(alias="scopeMeta")


class QueueOut(BaseModel):
    """GET /queue and POST /decks/<id>/session."""

    model_config = ConfigDict(populate_by_name=True)

    cards: list[QueueCard]
    has_more: bool = Field(alias="hasMore")
    session_mode: SessionMode = Field(alias="sessionMode")
    next_cursor: int | None = Field(default=None, alias="nextCursor")
    scope: str = "all"
    reschedule: bool = True


class CardPrompt(QueueCard):
    """GET /cards/<id>: the prompt, never the answer."""

    due: str | None = None


class ReviewRequest(BaseModel):
    """Body of POST /cards/<id>/review."""

    # ``strict`` keeps ``"3"`` from being coerced into a rating.
    model_config = ConfigDict(populate_by_name=True, extra="forbid", strict=True)

    rating: int = Field(ge=1, le=4)
    elapsed_ms: int = Field(alias="elapsedMs", ge=0)
    mode: SessionMode = "review"
    # Training never touches the schedule unless the client opts in explicitly.
    reschedule: bool | None = None


class ReviewOut(BaseModel):
    """Corrective feedback after a rating."""

    model_config = ConfigDict(populate_by_name=True)

    card_id: int = Field(alias="cardId")
    rating: int
    correct: bool
    answer: str
    extra: str = ""
    state: StateName
    due: str
    interval_before: int = Field(alias="intervalBefore")
    next_interval_days: int = Field(alias="nextIntervalDays")
    leech: int = 0
    lapses: int = 0
    recorded: bool = True
    session_mode: SessionMode = Field(alias="sessionMode")


class SettingsOut(BaseModel):
    """GET/POST /settings."""

    model_config = ConfigDict(populate_by_name=True)

    daily_new_limit: int = Field(alias="dailyNewLimit")
    review_cap: int = Field(alias="reviewCap")
    floor: int
    desired_retention_default: float = Field(alias="desiredRetentionDefault")
    per_guide: dict[str, float] = Field(default_factory=dict, alias="perGuide")
    warn_high_retention: bool = Field(default=False, alias="warnHighRetention")
    warnings: list[str] = Field(default_factory=list)


class SettingsPatch(BaseModel):
    """Body of POST /settings (partial)."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    daily_new_limit: int | None = Field(default=None, alias="dailyNewLimit", ge=1, le=500)
    review_cap: int | None = Field(default=None, alias="reviewCap", ge=1, le=2000)
    floor: int | None = Field(default=None, ge=0, le=100)
    desired_retention_default: float | None = Field(
        default=None, alias="desiredRetentionDefault", ge=MIN_RETENTION, le=MAX_RETENTION
    )
    per_guide: dict[str, float] | None = Field(default=None, alias="perGuide")

    @field_validator("per_guide")
    @classmethod
    def _check_per_guide(cls, value: dict[str, float] | None) -> dict[str, float] | None:
        if value is None:
            return None
        for guide_id, retention in value.items():
            if not guide_id or guide_id != guide_id.strip():
                raise ValueError("perGuide keys must be non-empty guide ids")
            if not MIN_RETENTION <= float(retention) <= MAX_RETENTION:
                raise ValueError(
                    f"perGuide.{guide_id} must be between {MIN_RETENTION} and {MAX_RETENTION}"
                )
        return {guide_id: float(retention) for guide_id, retention in value.items()}


#: API field -> stored settings key.
_SETTING_KEYS = {
    "daily_new_limit": "dailyNewLimit",
    "review_cap": "reviewCap",
    "floor": "floor",
    "desired_retention_default": "desiredRetentionDefault",
    "per_guide": "perGuide",
}


def _session_out(session: fqueue.Session) -> QueueOut:
    return QueueOut(
        cards=[QueueCard.model_validate(question_payload(row)) for row in session.cards],
        hasMore=session.has_more,
        sessionMode=session.session_mode,  # type: ignore[arg-type]
        nextCursor=session.next_cursor,
        scope=session.scope,
        reschedule=session.reschedule,
    )


def _settings_out(conn: Any) -> SettingsOut:
    settings = fdb.get_settings(conn)
    per_guide = {str(key): float(value) for key, value in (settings["perGuide"] or {}).items()}
    warnings: list[str] = []
    if float(settings["desiredRetentionDefault"]) > WARN_RETENTION:
        warnings.append(
            f"desiredRetentionDefault above {WARN_RETENTION} is hard to sustain"
        )
    for guide_id, retention in sorted(per_guide.items()):
        if retention > WARN_RETENTION:
            warnings.append(f"perGuide.{guide_id} above {WARN_RETENTION} is hard to sustain")
    return SettingsOut(
        dailyNewLimit=int(settings["dailyNewLimit"]),
        reviewCap=int(settings["reviewCap"]),
        floor=int(settings["floor"]),
        desiredRetentionDefault=float(settings["desiredRetentionDefault"]),
        perGuide=per_guide,
        warnHighRetention=bool(warnings),
        warnings=warnings,
    )


@router.get("/queue", response_model=QueueOut)
def read_queue(
    connection: Connection,
    scope: str | None = Query(default=None),
    limit: int = Query(default=fqueue.DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    mode: SessionMode = Query(default="review"),
    reschedule: bool | None = Query(default=None),
    cursor: int | None = Query(default=None, ge=1),
) -> QueueOut:
    """One page of the review (or training) queue, interleaved across guides."""
    try:
        session = fqueue.build_session(
            connection,
            scope=scope,
            limit=limit,
            mode=mode,
            reschedule=reschedule if reschedule is not None else mode == "review",
            cursor=cursor,
        )
    except fqueue.InvalidScope as exc:
        raise HTTPException(
            status_code=422, detail={"field": "scope", "message": str(exc)}
        ) from exc
    return _session_out(session)


@router.get("/cards/{card_id}", response_model=CardPrompt)
def read_card(card_id: int, connection: Connection) -> CardPrompt:
    """The card prompt; the answer is only released by a review."""
    card = fdb.card_with_note(connection, card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="card not found")
    payload = question_payload(card)
    payload["due"] = card["due"]
    return CardPrompt.model_validate(payload)


@router.post("/cards/{card_id}/review", response_model=ReviewOut)
def review_card(card_id: int, payload: ReviewRequest, connection: Connection) -> ReviewOut:
    """Apply one rating; training without reschedule records nothing."""
    card = fdb.card_with_note(connection, card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="card not found")
    record = payload.mode == "review" or bool(payload.reschedule)
    try:
        if record:
            result = sched.apply_review(
                connection, card_id, payload.rating, elapsed_ms=payload.elapsed_ms
            )
            fdb.record_review(
                connection,
                day=result.last_review[:10],
                is_new=result.state_before == "new",
            )
        else:
            retention = sched.retention_for(connection, card["guide_id"])
            result = sched.transition(card, payload.rating, retention=retention)
    except sched.CardNotReviewable as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    feedback = answer_payload(card)
    return ReviewOut(
        cardId=result.card_id,
        rating=result.rating,
        correct=result.correct,
        answer=feedback["answer"],
        extra=feedback["extra"],
        state=result.state_after,  # type: ignore[arg-type]
        due=result.due,
        intervalBefore=result.interval_before,
        nextIntervalDays=result.interval_after,
        leech=result.leech,
        lapses=result.lapses,
        recorded=record,
        sessionMode=payload.mode,
    )


@router.get("/settings", response_model=SettingsOut)
def read_settings(connection: Connection) -> SettingsOut:
    """Current limits, retention and per-guide overrides."""
    return _settings_out(connection)


@router.post("/settings", response_model=SettingsOut)
def write_settings(payload: SettingsPatch, connection: Connection) -> SettingsOut:
    """Partial update of the settings, validated against the documented ranges."""
    changes = {
        _SETTING_KEYS[field]: value
        for field, value in payload.model_dump(exclude_unset=True).items()
        if value is not None
    }
    if changes:
        fdb.save_settings(connection, changes)
    return _settings_out(connection)
