"""SRS core: per-card difficulty/stability transitions and interval scheduling.

The model is FSRS-shaped (difficulty D, stability S, retrievability R) with simple
growth constants for v1, exactly as approved in ``docs/spec-flashcards.md``:

* memory decays as ``R(t) = exp(-t / S)`` (t in days);
* the interval for a target retention ``r`` solves ``R(t) = r``, so
  ``t = -S * ln(r)`` days;
* a fresh card is ``new``, due now, with S=1.0 and D=5.0;
* learning steps live inside the day (Again +1 min, Hard +5 min), so their
  scheduled interval is 0 days;
* a lapse halves stability, raises difficulty by 0.8 and returns the card to
  learning; at 8 lapses the card is flagged as a leech and suspended.

Everything is pure except :func:`apply_review` and :func:`retention_for`; the clock
is always injected (``now``/``today``), never read inside the transition.
"""

from __future__ import annotations

import hashlib
import math
import sqlite3
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from app.flashcards import db as fdb

#: Default desired retention (Anki's documented product default).
DEFAULT_RETENTION = 0.90
MIN_RETENTION = 0.85
MAX_RETENTION = 0.97

#: D/S for a brand-new card.
NEW_STABILITY = 1.0
NEW_DIFFICULTY = 5.0
MIN_STABILITY = 0.1
MIN_DIFFICULTY = 1.0
MAX_DIFFICULTY = 10.0

#: Learning/relearning steps, inside the day (minutes).
AGAIN_MINUTES = 1
HARD_MINUTES = 5

#: Stability multipliers and difficulty deltas per rating on a review card.
HARD_FACTOR = 1.2
GOOD_FACTOR = 1.8
EASY_FACTOR = 2.5
LAPSE_FACTOR = 0.5
GRADUATE_GOOD_STABILITY = 1.0
GRADUATE_EASY_STABILITY = 4.0
DIFFICULTY_DELTA = {1: 0.8, 2: 0.3, 3: -0.15, 4: -0.4}

#: Lapses before a card is flagged as a leech and suspended.
LEECH_THRESHOLD = 8

#: Deterministic fuzz: at most +-5% of the base interval, only above one day.
FUZZ_RATIO = 0.05
FUZZ_MIN_INTERVAL = 2

#: A card as read from the store (``sqlite3.Row``) or a plain mapping in tests.
CardRow = Mapping[str, Any] | sqlite3.Row

RATINGS = (1, 2, 3, 4)
LEARNABLE_STATES = ("new", "learning", "review")


class CardNotReviewable(ValueError):
    """Raised when a suspended/deprecated card is sent to the scheduler."""


@dataclass(frozen=True)
class Transition:
    """Outcome of applying one rating to one card (pure data, no I/O)."""

    card_id: int
    rating: int
    state_before: str
    state_after: str
    interval_before: int
    interval_after: int
    difficulty: float
    stability: float
    retrievability: float | None
    due: str
    reps: int
    lapses: int
    leech: int
    last_review: str

    @property
    def correct(self) -> bool:
        """Ratings 3 (Good) and 4 (Easy) count as a correct recall."""
        return self.rating >= 3

    def card_changes(self) -> dict[str, Any]:
        """Column values to persist on ``fc_cards``."""
        return {
            "state": self.state_after,
            "difficulty": self.difficulty,
            "stability": self.stability,
            "retrievability": self.retrievability,
            "due": self.due,
            "reps": self.reps,
            "lapses": self.lapses,
            "leech": self.leech,
            "last_review": self.last_review,
        }


# ----------------------------------------------------------------------- clock i/o


def utcnow() -> datetime:
    """Aware UTC ``datetime`` for this instant (seconds resolution)."""
    return datetime.now(UTC).replace(microsecond=0)


def as_datetime(value: datetime | str | None, *, default: datetime | None = None) -> datetime:
    """Coerce an injected clock or a stored timestamp into an aware UTC datetime."""
    if value is None:
        return default if default is not None else utcnow()
    if isinstance(value, datetime):
        return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    moment = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return moment if moment.tzinfo is not None else moment.replace(tzinfo=UTC)


def iso(moment: datetime) -> str:
    """Format an aware datetime as the store's ISO-8601 UTC ``Z`` string."""
    aware = moment if moment.tzinfo is not None else moment.replace(tzinfo=UTC)
    return aware.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_due(value: str | datetime | None) -> datetime | None:
    """Parse a stored ``due`` value, or ``None`` when unset."""
    if value is None:
        return None
    return as_datetime(value)


# ------------------------------------------------------------------------- memory


def interval_days(stability: float, retention: float = DEFAULT_RETENTION) -> int:
    """Days until ``R`` falls to ``retention``: ``max(1, round(-S * ln(r)))``."""
    safe_retention = _clamp_retention(retention)
    safe_stability = max(float(stability), MIN_STABILITY)
    if safe_retention >= 1.0:
        return 1
    return max(1, round(-safe_stability * math.log(safe_retention)))


def retrievability(stability: float, elapsed_days: float) -> float:
    """``R(t) = exp(-t / S)``; 1.0 at review time, decaying towards 0."""
    safe_stability = max(float(stability), MIN_STABILITY)
    return math.exp(-max(float(elapsed_days), 0.0) / safe_stability)


def fuzz_interval(card_id: int, interval: int, day: str) -> int:
    """Deterministic +-5% jitter for ``interval``, keyed by card id and day.

    Same card, same day, same interval always yields the same result, which is what
    makes the scheduler reproducible in tests. Intervals of one day or less are
    returned unchanged (a card can never become due in the past).
    """
    if interval < FUZZ_MIN_INTERVAL:
        return max(1, int(interval))
    digest = hashlib.sha256(f"{int(card_id)}:{day}".encode("utf-8")).digest()
    unit = int.from_bytes(digest[:8], "big") / float(1 << 64)  # 0..1
    factor = 1.0 + (unit * 2.0 - 1.0) * FUZZ_RATIO
    return max(1, round(interval * factor))


def _clamp_retention(retention: float) -> float:
    return min(max(float(retention), MIN_RETENTION), MAX_RETENTION)


def clamp_difficulty(difficulty: float) -> float:
    """Keep D in its documented 1..10 range."""
    return min(max(float(difficulty), MIN_DIFFICULTY), MAX_DIFFICULTY)


def interval_before_days(card: CardRow) -> int:
    """The interval the card was scheduled with, in whole days (0 for steps).

    Reconstructed from ``due - last_review`` so fuzzed intervals are reported as
    they were actually scheduled (learning steps are inside the day, so 0).
    """
    due = parse_due(_field(card, "due"))
    last = parse_due(_field(card, "last_review"))
    if due is None or last is None:
        return 0
    gap = due - last
    return max(0, int(gap.total_seconds() // 86400))


def _field(card: CardRow, name: str) -> Any:
    """Read a column from a dict-like card or an ``sqlite3.Row``."""
    try:
        return card[name]
    except (KeyError, IndexError):
        return None


def _elapsed_days(card: CardRow, now: datetime) -> float:
    last = parse_due(_field(card, "last_review"))
    if last is None:
        return 0.0
    return max(0.0, (now - last).total_seconds() / 86400.0)


# --------------------------------------------------------------------- transition


def transition(
    card: CardRow,
    rating: int,
    *,
    now: datetime | None = None,
    today: datetime | None = None,
    retention: float = DEFAULT_RETENTION,
) -> Transition:
    """Apply one rating to one card and return the resulting scheduler state.

    Pure: it reads the card mapping and the injected clock, and computes the next
    ``due``/D/S. Persisting is :func:`apply_review`'s job.
    """
    if rating not in RATINGS:
        raise ValueError(f"rating must be one of {RATINGS}, got {rating!r}")
    moment = as_datetime(now if now is not None else today)
    state_before = str(card["state"])
    if state_before not in LEARNABLE_STATES:
        raise CardNotReviewable(f"card {card['id']} is {state_before} and cannot be reviewed")

    raw_difficulty = _field(card, "difficulty")
    raw_stability = _field(card, "stability")
    difficulty = float(raw_difficulty if raw_difficulty is not None else NEW_DIFFICULTY)
    stability = float(raw_stability if raw_stability is not None else NEW_STABILITY)
    reps = int(card["reps"] or 0)
    lapses = int(card["lapses"] or 0)
    leech = int(card["leech"] or 0)
    interval_before = interval_before_days(card)
    current_retrievability = retrievability(stability, _elapsed_days(card, moment))
    target = _clamp_retention(retention)
    day_key = moment.date().isoformat()

    state_after = state_before
    interval_after = 0

    if state_before in ("new", "learning"):
        if rating == 1:
            state_after = "learning"
            due = moment + timedelta(minutes=AGAIN_MINUTES)
        elif rating == 2:
            state_after = "learning"
            due = moment + timedelta(minutes=HARD_MINUTES)
        else:
            state_after = "review"
            stability = (
                GRADUATE_GOOD_STABILITY if rating == 3 else GRADUATE_EASY_STABILITY
            )
            interval_after = _scheduled_interval(card, stability, target, moment, day_key)
            due = moment + timedelta(days=interval_after)
    else:  # review
        if rating == 1:
            lapses += 1
            stability = max(MIN_STABILITY, stability * LAPSE_FACTOR)
            difficulty = clamp_difficulty(difficulty + DIFFICULTY_DELTA[1])
            state_after = "learning"
            due = moment + timedelta(minutes=AGAIN_MINUTES)
            if lapses >= LEECH_THRESHOLD:
                state_after = "suspended"
                leech = 1
        else:
            stability = stability * {2: HARD_FACTOR, 3: GOOD_FACTOR, 4: EASY_FACTOR}[rating]
            difficulty = clamp_difficulty(difficulty + DIFFICULTY_DELTA[rating])
            base = _scheduled_interval(card, stability, target, moment, day_key)
            # Success never shrinks the interval (property test enforced).
            interval_after = max(base, interval_before)
            due = moment + timedelta(days=interval_after)

    return Transition(
        card_id=int(card["id"]),
        rating=rating,
        state_before=state_before,
        state_after=state_after,
        interval_before=interval_before,
        interval_after=interval_after,
        difficulty=round(difficulty, 6),
        stability=round(stability, 6),
        retrievability=round(current_retrievability, 6),
        due=iso(due),
        reps=reps + 1,
        lapses=lapses,
        leech=leech,
        last_review=iso(moment),
    )


def _scheduled_interval(
    card: CardRow, stability: float, retention: float, moment: datetime, day_key: str
) -> int:
    base = interval_days(stability, retention)
    return fuzz_interval(int(card["id"]), base, day_key)


# -------------------------------------------------------------------- persistence


def retention_for(conn: sqlite3.Connection, guide_id: str | None = None) -> float:
    """Desired retention for a guide, falling back to the global default."""
    settings = fdb.get_settings(conn)
    per_guide = settings.get("perGuide") or {}
    if guide_id and guide_id in per_guide:
        try:
            return _clamp_retention(float(per_guide[guide_id]))
        except (TypeError, ValueError):
            pass
    return _clamp_retention(float(settings["desiredRetentionDefault"]))


def apply_review(
    conn: sqlite3.Connection,
    card_id: int,
    rating: int,
    *,
    now: datetime | None = None,
    today: datetime | None = None,
    elapsed_ms: int = 0,
    retention: float | None = None,
) -> Transition:
    """Transition one stored card, persist it and append the revlog entry.

    The retention is resolved per guide from ``fc_settings`` unless passed in.
    """
    card = fdb.card_with_note(conn, card_id)
    if card is None:
        raise LookupError(f"card {card_id} does not exist")
    moment = as_datetime(now if now is not None else today)
    target = (
        retention
        if retention is not None
        else retention_for(conn, card["guide_id"])
    )
    result = transition(card, rating, now=moment, retention=target)
    fdb.update_card(conn, card_id, result.card_changes())
    fdb.append_revlog(
        conn,
        card_id=card_id,
        rating=rating,
        state_before=result.state_before,
        interval_before=result.interval_before,
        interval_after=result.interval_after,
        elapsed_ms=elapsed_ms,
        reviewed_at=result.last_review,
    )
    return result


def preview_intervals(
    card: CardRow,
    *,
    now: datetime | None = None,
    retention: float = DEFAULT_RETENTION,
) -> dict[int, int]:
    """Next interval in days for each rating (what the review buttons show)."""
    return {
        rating: transition(card, rating, now=now, retention=retention).interval_after
        for rating in RATINGS
    }
