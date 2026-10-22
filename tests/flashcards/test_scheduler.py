"""T01/T02: SRS core - transitions, intervals, fuzz, leech, deprecated exclusion."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime, timedelta

import pytest

from app.flashcards import db as fdb
from app.flashcards import scheduler as sched

NOW = datetime(2026, 10, 22, 12, 0, 0, tzinfo=UTC)


def review_card(
    *,
    stability: float = 100.0,
    difficulty: float = 5.0,
    interval: int | None = None,
    lapses: int = 0,
    card_id: int = 1,
    state: str = "review",
) -> dict[str, object]:
    """A review-state card whose ``due - last_review`` gap is ``interval`` days."""
    days = sched.interval_days(stability, 0.9) if interval is None else interval
    return {
        "id": card_id,
        "state": state,
        "difficulty": difficulty,
        "stability": stability,
        "due": sched.iso(NOW),
        "last_review": sched.iso(NOW - timedelta(days=days)),
        "reps": 4,
        "lapses": lapses,
        "leech": 0,
    }


def learning_card(*, stability: float = 1.0, difficulty: float = 5.0, minutes: int = 1) -> dict[str, object]:
    return {
        "id": 5,
        "state": "learning",
        "difficulty": difficulty,
        "stability": stability,
        "due": sched.iso(NOW - timedelta(minutes=minutes)),
        "last_review": sched.iso(NOW - timedelta(minutes=minutes)),
        "reps": 1,
        "lapses": 0,
        "leech": 0,
    }


# --------------------------------------------------------------------- new cards


def test_a_new_card_is_due_now_with_stability_one_and_difficulty_five(
    conn: sqlite3.Connection,
) -> None:
    note_id = fdb.create_note(conn, kind="basic", front="F", back="B", now=sched.iso(NOW))
    card_id = fdb.create_card(conn, note_id=note_id, template="basic", now=sched.iso(NOW))

    card = fdb.get_card(conn, card_id)

    assert card["state"] == "new"
    assert card["due"] == sched.iso(NOW)
    assert card["stability"] == 1.0
    assert card["difficulty"] == 5.0


def test_a_new_card_follows_the_learning_steps() -> None:
    card = {"id": 9, "state": "new", "difficulty": 5.0, "stability": 1.0, "due": sched.iso(NOW),
            "last_review": None, "reps": 0, "lapses": 0, "leech": 0}

    again = sched.transition(card, 1, now=NOW)
    hard = sched.transition(card, 2, now=NOW)
    good = sched.transition(card, 3, now=NOW)
    easy = sched.transition(card, 4, now=NOW)

    assert (again.state_after, again.due) == ("learning", sched.iso(NOW + timedelta(minutes=1)))
    assert (hard.state_after, hard.due) == ("learning", sched.iso(NOW + timedelta(minutes=5)))
    assert (good.state_after, good.stability) == ("review", 1.0)
    assert (easy.state_after, easy.stability) == ("review", 4.0)
    assert good.interval_after >= 1
    assert easy.interval_after >= good.interval_after


# ----------------------------------------------------------------------- learning


def test_learning_again_returns_in_one_minute() -> None:
    result = sched.transition(learning_card(), 1, now=NOW)

    assert result.state_after == "learning"
    assert result.due == sched.iso(NOW + timedelta(minutes=1))
    assert result.interval_after == 0


def test_learning_hard_returns_in_five_minutes() -> None:
    result = sched.transition(learning_card(), 2, now=NOW)

    assert result.state_after == "learning"
    assert result.due == sched.iso(NOW + timedelta(minutes=5))
    assert result.interval_after == 0


def test_learning_good_graduates_with_stability_one() -> None:
    result = sched.transition(learning_card(), 3, now=NOW)

    assert result.state_after == "review"
    assert result.stability == 1.0
    assert result.interval_after == sched.interval_days(1.0, 0.9)


def test_learning_easy_graduates_with_stability_four() -> None:
    result = sched.transition(learning_card(), 4, now=NOW)

    assert result.state_after == "review"
    assert result.stability == 4.0
    assert result.interval_after == sched.interval_days(4.0, 0.9)


# ------------------------------------------------------------------------- review


def test_review_again_lapses_halves_stability_and_relearns() -> None:
    card = review_card(stability=100.0, difficulty=5.0, lapses=2)

    result = sched.transition(card, 1, now=NOW)

    assert result.lapses == 3
    assert result.stability == 50.0
    assert result.difficulty == pytest.approx(5.8)
    assert result.state_after == "learning"
    assert result.interval_after == 0
    assert result.due == sched.iso(NOW + timedelta(minutes=1))
    assert result.leech == 0


@pytest.mark.parametrize(
    ("rating", "factor", "delta"),
    [(2, 1.2, 0.3), (3, 1.8, -0.15), (4, 2.5, -0.4)],
)
def test_review_success_scales_stability_and_difficulty(
    rating: int, factor: float, delta: float
) -> None:
    card = review_card(stability=100.0, difficulty=5.0)

    result = sched.transition(card, rating, now=NOW)

    assert result.state_after == "review"
    assert result.stability == pytest.approx(100.0 * factor)
    assert result.difficulty == pytest.approx(5.0 + delta)
    assert result.interval_after >= result.interval_before


def test_difficulty_is_clamped_between_one_and_ten() -> None:
    high = review_card(stability=50.0, difficulty=9.9)
    low = review_card(stability=50.0, difficulty=1.05)

    assert sched.transition(high, 2, now=NOW).difficulty == 10.0
    assert sched.transition(low, 4, now=NOW).difficulty == 1.0


def test_reps_and_last_review_are_stamped() -> None:
    card = review_card()

    result = sched.transition(card, 3, now=NOW)

    assert result.reps == 5
    assert result.last_review == sched.iso(NOW)
    assert result.retrievability is not None


# ------------------------------------------------------------------------ leeches


@pytest.mark.parametrize(("lapses_before", "state_after", "leech"), [(5, "learning", 0), (6, "learning", 0), (7, "suspended", 1)])
def test_leech_suspends_at_exactly_eight_lapses(
    lapses_before: int, state_after: str, leech: int
) -> None:
    card = review_card(lapses=lapses_before)

    result = sched.transition(card, 1, now=NOW)

    assert result.lapses == lapses_before + 1
    assert result.state_after == state_after
    assert result.leech == leech


def test_a_suspended_card_is_never_reviewed() -> None:
    card = review_card(state="suspended")

    with pytest.raises(sched.CardNotReviewable):
        sched.transition(card, 3, now=NOW)


def test_a_deprecated_card_is_never_reviewed() -> None:
    card = review_card(state="deprecated")

    with pytest.raises(sched.CardNotReviewable):
        sched.transition(card, 3, now=NOW)


def test_an_invalid_rating_is_rejected() -> None:
    with pytest.raises(ValueError):
        sched.transition(review_card(), 5, now=NOW)
    with pytest.raises(ValueError):
        sched.transition(review_card(), 0, now=NOW)


# ------------------------------------------------------------ intervals and fuzz


def test_interval_follows_the_desired_retention_formula() -> None:
    stability = 200.0

    for retention in (0.85, 0.9, 0.95):
        expected = max(1, round(-stability * __import__("math").log(retention)))
        assert sched.interval_days(stability, retention) == expected
    # A higher desired retention means shorter intervals.
    assert sched.interval_days(stability, 0.95) < sched.interval_days(stability, 0.9)
    assert sched.interval_days(stability, 0.9) < sched.interval_days(stability, 0.85)


def test_interval_is_never_shorter_than_one_day() -> None:
    assert sched.interval_days(0.1, 0.9) == 1
    assert sched.interval_days(1.0, 0.9) == 1


def test_fuzz_is_deterministic_and_within_five_percent() -> None:
    for card_id in range(1, 40):
        first = sched.fuzz_interval(card_id, 100, "2026-10-22")
        second = sched.fuzz_interval(card_id, 100, "2026-10-22")
        assert first == second
        assert abs(first - 100) <= 5


def test_fuzz_varies_with_card_and_day() -> None:
    values = {sched.fuzz_interval(card_id, 200, "2026-10-22") for card_id in range(1, 30)}

    assert len(values) > 1
    assert sched.fuzz_interval(1, 200, "2026-10-22") != sched.fuzz_interval(1, 200, "2026-10-23")


def test_fuzz_is_not_applied_to_single_day_intervals() -> None:
    assert sched.fuzz_interval(7, 1, "2026-10-22") == 1
    assert sched.fuzz_interval(7, 0, "2026-10-22") == 1


def test_good_never_shrinks_the_interval() -> None:
    for stability in (1.0, 3.0, 10.0, 50.0, 200.0, 500.0, 2000.0):
        card = review_card(stability=stability)
        result = sched.transition(card, 3, now=NOW)
        assert result.interval_after >= result.interval_before, stability


def test_easy_never_shrinks_the_interval() -> None:
    for stability in (1.0, 5.0, 60.0, 400.0):
        card = review_card(stability=stability)
        result = sched.transition(card, 4, now=NOW)
        assert result.interval_after >= result.interval_before


def test_again_always_shortens_the_interval() -> None:
    for stability in (1.0, 5.0, 60.0, 400.0, 5000.0):
        card = review_card(stability=stability)
        result = sched.transition(card, 1, now=NOW)
        assert result.interval_after < result.interval_before, stability


def test_intervals_are_non_decreasing_in_rating() -> None:
    for stability in (1.0, 4.0, 25.0, 300.0):
        card = review_card(stability=stability)
        intervals = [sched.transition(card, rating, now=NOW).interval_after for rating in (1, 2, 3, 4)]
        assert intervals == sorted(intervals), (stability, intervals)


def test_interval_before_reads_the_scheduled_gap() -> None:
    assert sched.interval_before_days(review_card(interval=23)) == 23
    assert sched.interval_before_days(learning_card()) == 0
    assert sched.interval_before_days({"due": None, "last_review": None}) == 0


# ---------------------------------------------------------- retrieval and settings


def test_retrievability_decays_exponentially() -> None:
    assert sched.retrievability(10.0, 0.0) == pytest.approx(1.0)
    assert sched.retrievability(10.0, 10.0) == pytest.approx(0.36787944, rel=1e-6)
    assert sched.retrievability(10.0, 20.0) < sched.retrievability(10.0, 5.0)


def test_retention_for_reads_the_global_default(conn: sqlite3.Connection) -> None:
    assert sched.retention_for(conn) == 0.9
    assert sched.retention_for(conn, "magnesio") == 0.9

    fdb.save_settings(conn, {"desiredRetentionDefault": 0.88})

    assert sched.retention_for(conn) == 0.88
    assert sched.retention_for(conn, "magnesio") == 0.88


def test_retention_for_prefers_the_per_guide_override(conn: sqlite3.Connection) -> None:
    fdb.save_settings(conn, {"desiredRetentionDefault": 0.9, "perGuide": {"magnesio": 0.93}})

    assert sched.retention_for(conn, "magnesio") == 0.93
    assert sched.retention_for(conn, "dsa") == 0.9
    assert sched.retention_for(conn) == 0.9


# ------------------------------------------------------------------ apply_review


def test_apply_review_writes_the_card_and_appends_the_revlog(conn: sqlite3.Connection) -> None:
    note_id = fdb.create_note(conn, kind="basic", front="F", back="B", guide_id="magnesio", now=sched.iso(NOW))
    card_id = fdb.create_card(conn, note_id=note_id, template="basic", now=sched.iso(NOW))

    result = sched.apply_review(conn, card_id, 3, now=NOW, elapsed_ms=4200)

    card = fdb.get_card(conn, card_id)
    assert card["state"] == "review"
    assert card["reps"] == 1
    assert card["last_review"] == sched.iso(NOW)
    assert card["due"] == result.due
    assert card["stability"] == result.stability == 1.0
    log = fdb.list_revlog(conn, card_id=card_id)
    assert len(log) == 1
    assert log[0]["rating"] == 3
    assert log[0]["state_before"] == "new"
    assert log[0]["interval_before"] == 0
    assert log[0]["interval_after"] == result.interval_after
    assert log[0]["elapsed_ms"] == 4200
    assert log[0]["reviewed_at"] == sched.iso(NOW)


def test_apply_review_uses_the_guide_retention(conn: sqlite3.Connection) -> None:
    fdb.save_settings(conn, {"perGuide": {"magnesio": 0.85, "dsa": 0.95}})
    magnesio = fdb.create_note(conn, kind="basic", front="F", back="B", guide_id="magnesio", now=sched.iso(NOW))
    dsa = fdb.create_note(conn, kind="basic", front="F", back="B", guide_id="dsa", now=sched.iso(NOW))
    first = fdb.create_card(conn, note_id=magnesio, template="basic", stability=200.0, state="review", now=sched.iso(NOW))
    second = fdb.create_card(conn, note_id=dsa, template="basic", stability=200.0, state="review", now=sched.iso(NOW))
    fdb.update_card(conn, first, {"last_review": sched.iso(NOW - timedelta(days=20))})
    fdb.update_card(conn, second, {"last_review": sched.iso(NOW - timedelta(days=20))})

    looser = sched.apply_review(conn, first, 3, now=NOW)
    tighter = sched.apply_review(conn, second, 3, now=NOW)

    assert looser.interval_after > tighter.interval_after


def test_apply_review_rejects_a_suspended_card(conn: sqlite3.Connection) -> None:
    note_id = fdb.create_note(conn, kind="basic", front="F", back="B", now=sched.iso(NOW))
    card_id = fdb.create_card(conn, note_id=note_id, template="basic", state="suspended", now=sched.iso(NOW))

    with pytest.raises(sched.CardNotReviewable):
        sched.apply_review(conn, card_id, 3, now=NOW)
    assert fdb.list_revlog(conn, card_id=card_id) == []


def test_apply_review_reports_a_missing_card(conn: sqlite3.Connection) -> None:
    with pytest.raises(LookupError):
        sched.apply_review(conn, 404, 3, now=NOW)
