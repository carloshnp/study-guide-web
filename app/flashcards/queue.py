"""Queue selection, sessions and derived decks.

A session is a list of cards plus the information the UI needs to page through it
(``has_more`` and a ``cursor`` equal to the last card id returned). Selection rules:

* review mode takes cards in ``learning``/``review`` whose ``due`` is in the past,
  interleaved by guide (round-robin, due order preserved inside each guide), and
  tops the session up with ``new`` cards up to the remaining daily new limit;
* training mode takes a whole deck in any state, shuffled deterministically with a
  seed derived from the day, and never touches the schedule by itself.

Decks are derived views (guide, chapter, section and the anchors "outras"), never
stored tables; ``deprecated`` cards are excluded from every query here.
"""

from __future__ import annotations

import random
import re
import sqlite3
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.flashcards import db as fdb
from app.flashcards.scheduler import as_datetime

DUE_STATES = ("learning", "review")
TRAINING_STATES = ("new", "learning", "review")
DEFAULT_LIMIT = 20
MAX_LIMIT = 100
FORECAST_DAYS = 14

CARD_COLUMNS = """
    c.id AS id,
    c.note_id AS note_id,
    c.template AS template,
    c.state AS state,
    c.due AS due,
    c.difficulty AS difficulty,
    c.stability AS stability,
    c.retrievability AS retrievability,
    c.reps AS reps,
    c.lapses AS lapses,
    c.leech AS leech,
    c.last_review AS last_review,
    c.deprecated_at AS deprecated_at,
    n.kind AS kind,
    n.front AS front,
    n.back AS back,
    n.guide_id AS guide_id,
    n.chapter_slug AS chapter_slug,
    n.section_id AS section_id,
    n.source_snippet AS source_snippet,
    n.tags AS tags
"""


class InvalidScope(ValueError):
    """Raised for a malformed scope or deck id."""


@dataclass(frozen=True)
class Scope:
    """A queue/deck filter: all cards, one guide, one chapter or one section."""

    kind: str = "all"
    guide_id: str | None = None
    chapter_slug: str | None = None
    section_id: str | None = None

    def clauses(self) -> tuple[list[str], list[Any]]:
        """SQL predicates over the joined note columns (``n.*``)."""
        parts: list[str] = []
        params: list[Any] = []
        if self.kind == "outras":
            parts.append("n.guide_id IS NULL")
        if self.kind in ("guide", "chapter", "section"):
            parts.append("n.guide_id = ?")
            params.append(self.guide_id)
        if self.kind in ("chapter", "section"):
            parts.append("n.chapter_slug = ?")
            params.append(self.chapter_slug)
        if self.kind == "section":
            parts.append("n.section_id = ?")
            params.append(self.section_id)
        return parts, params

    def label(self) -> str:
        if self.kind == "guide":
            return f"guide:{self.guide_id}"
        if self.kind == "chapter":
            return f"chapter:{self.guide_id}:{self.chapter_slug}"
        if self.kind == "section":
            return f"section:{self.guide_id}:{self.chapter_slug}:{self.section_id}"
        if self.kind == "outras":
            return "outras"
        return "all"


@dataclass(frozen=True)
class Session:
    """One page of a review/training session."""

    cards: list[sqlite3.Row] = field(default_factory=list)
    has_more: bool = False
    session_mode: str = "review"
    next_cursor: int | None = None
    scope: str = "all"
    reschedule: bool = True


def parse_scope(raw: str | None) -> Scope:
    """Parse ``all`` / ``guide:<id>`` / ``chapter:<id>:<slug>`` / ``section:<id>:<slug>:<sid>``."""
    if raw is None:
        return Scope()
    text = str(raw).strip()
    if not text:
        raise InvalidScope("empty scope")
    if text == "all":
        return Scope()
    kind, _, rest = text.partition(":")
    if kind == "guide":
        if not rest or ":" in rest:
            raise InvalidScope(f"invalid scope {raw!r}")
        return Scope(kind="guide", guide_id=rest)
    if kind == "chapter":
        parts = rest.split(":")
        if len(parts) != 2 or not all(parts):
            raise InvalidScope(f"invalid scope {raw!r}")
        return Scope(kind="chapter", guide_id=parts[0], chapter_slug=parts[1])
    if kind == "section":
        parts = rest.split(":")
        if len(parts) != 3 or not all(parts):
            raise InvalidScope(f"invalid scope {raw!r}")
        return Scope(kind="section", guide_id=parts[0], chapter_slug=parts[1], section_id=parts[2])
    raise InvalidScope(f"invalid scope {raw!r}")


def parse_deck_id(raw: str | None) -> Scope:
    """Parse a derived deck id (``guide:``/``chapter:``/``section:``/``outras``)."""
    if raw is None or not str(raw).strip():
        raise InvalidScope("missing deck id")
    text = str(raw).strip()
    if text == "outras":
        return Scope(kind="outras")
    scope = parse_scope(text)
    if scope.kind == "all":
        raise InvalidScope(f"invalid deck id {raw!r}")
    return scope


# ------------------------------------------------------------------- selection


def select_cards(
    conn: sqlite3.Connection,
    *,
    scope: Scope | None = None,
    states: Sequence[str] = DUE_STATES,
    now: datetime | None = None,
    after: tuple[str, int] | None = None,
    limit: int | None = None,
) -> list[sqlite3.Row]:
    """Cards matching scope/states, ordered by ``(due, id)``.

    ``now`` adds the due cut-off; ``after`` is an exclusive ``(due, id)`` cursor.
    """
    active = scope if scope is not None else Scope()
    scope_clauses, scope_params = active.clauses()
    placeholders = ",".join("?" for _ in states)
    where = " AND ".join([f"c.state IN ({placeholders})", *scope_clauses])
    sql = f"""
        SELECT {CARD_COLUMNS}
        FROM fc_cards c
        JOIN fc_notes n ON n.id = c.note_id
        WHERE {where}
    """
    params: list[Any] = [*states, *scope_params]
    if now is not None:
        sql += " AND c.due IS NOT NULL AND c.due <= ?"
        params.append(as_datetime(now).isoformat().replace("+00:00", "Z"))
    if after is not None:
        sql += " AND (c.due > ? OR (c.due = ? AND c.id > ?))"
        params.extend([after[0], after[0], after[1]])
    sql += " ORDER BY c.due, c.id"
    if limit is not None:
        sql += " LIMIT ?"
        params.append(int(limit))
    return conn.execute(sql, params).fetchall()


def due_cards(
    conn: sqlite3.Connection,
    *,
    scope: Scope | None = None,
    now: datetime | None = None,
) -> list[sqlite3.Row]:
    """Cards that are due now (learning/review only, suspended/deprecated excluded)."""
    return select_cards(conn, scope=scope, states=DUE_STATES, now=now)


def interleave(rows: Sequence[sqlite3.Row]) -> list[sqlite3.Row]:
    """Round-robin rows between guides, keeping due order inside each bucket."""
    buckets: dict[str | None, list[sqlite3.Row]] = {}
    for row in rows:
        buckets.setdefault(row["guide_id"], []).append(row)
    ordered: list[sqlite3.Row] = []
    queues = list(buckets.values())
    depth = 0
    while any(depth < len(queue) for queue in queues):
        for queue in queues:
            if depth < len(queue):
                ordered.append(queue[depth])
        depth += 1
    return ordered


def daily_new_allowance(conn: sqlite3.Connection, moment: datetime) -> int:
    """How many new cards may still be introduced today."""
    settings = fdb.get_settings(conn)
    habit = fdb.get_habit(conn, moment.date().isoformat())
    already = int(habit["new_reviewed"]) if habit is not None else 0
    return max(0, int(settings["dailyNewLimit"]) - already)


def _session_limit(conn: sqlite3.Connection, limit: int | None) -> int:
    settings = fdb.get_settings(conn)
    requested = DEFAULT_LIMIT if limit is None else int(limit)
    cap = int(settings["reviewCap"])
    return max(1, min(requested, MAX_LIMIT, max(cap, 1)))


def build_session(
    conn: sqlite3.Connection,
    *,
    scope: str | Scope | None = None,
    limit: int | None = None,
    mode: str = "review",
    reschedule: bool = True,
    cursor: int | None = None,
    now: datetime | None = None,
    today: datetime | None = None,
    seed: str | None = None,
) -> Session:
    """Build one page of a session; the only writer is :func:`apply_review`."""
    moment = as_datetime(now if now is not None else today)
    active = scope if isinstance(scope, Scope) else parse_scope(scope)
    size = _session_limit(conn, limit)
    if mode not in ("review", "training"):
        raise ValueError(f"unknown session mode {mode!r}")

    if mode == "training":
        rows = select_cards(conn, scope=active, states=TRAINING_STATES)
        rows.sort(key=lambda row: row["id"])
        random.Random(seed if seed is not None else moment.date().isoformat()).shuffle(rows)
        if cursor is not None:
            position = next((i for i, row in enumerate(rows) if row["id"] == cursor), None)
            rows = rows[position + 1 :] if position is not None else rows
        page = rows[:size]
        return Session(
            cards=page,
            has_more=len(rows) > size,
            session_mode="training",
            next_cursor=page[-1]["id"] if page and len(rows) > size else None,
            scope=active.label(),
            reschedule=bool(reschedule),
        )

    rows = due_cards(conn, scope=active, now=moment)
    allowance = daily_new_allowance(conn, moment)
    if allowance:
        rows = [*rows, *select_cards(conn, scope=active, states=("new",), now=moment, limit=allowance)]
    rows.sort(key=lambda row: (row["due"] or "", row["id"]))
    rows = interleave(rows)
    if cursor is not None:
        ids = [row["id"] for row in rows]
        if cursor in ids:
            rows = rows[ids.index(cursor) + 1 :]
        else:
            anchor = fdb.get_card(conn, cursor)
            if anchor is not None and anchor["due"] is not None:
                key = (anchor["due"], cursor)
                rows = [row for row in rows if (row["due"] or "", row["id"]) > key]
    page = rows[:size]
    return Session(
        cards=page,
        has_more=len(rows) > size,
        session_mode="review",
        next_cursor=page[-1]["id"] if page and len(rows) > size else None,
        scope=active.label(),
        reschedule=bool(reschedule),
    )


# ------------------------------------------------------------------------ decks


def humanize(value: str | None) -> str:
    """Turn ``01-estrutura`` into ``Estrutura`` (titles are derived, not stored)."""
    text = re.sub(r"^\d+[-_ ]+", "", value or "").replace("-", " ").replace("_", " ").strip()
    if not text:
        return ""
    return text[:1].upper() + text[1:]


def _deck_row_id(kind: str, guide_id: str | None, chapter: str | None, section: str | None) -> str:
    if kind == "guide":
        return f"guide:{guide_id}"
    if kind == "chapter":
        return f"chapter:{guide_id}:{chapter}"
    if kind == "section":
        return f"section:{guide_id}:{chapter}:{section}"
    return "outras"


def _deck_title(kind: str, guide_id: str | None, chapter: str | None, section: str | None) -> str:
    if kind == "outras":
        return "Outras"
    if kind == "guide":
        return humanize(guide_id)
    if kind == "chapter":
        return humanize(chapter)
    return humanize(section)


def _deck_payload(
    kind: str,
    guide_id: str | None,
    chapter: str | None,
    section: str | None,
    count: int,
) -> dict[str, Any]:
    return {
        "id": _deck_row_id(kind, guide_id, chapter, section),
        "type": kind,
        "guideId": guide_id,
        "chapterSlug": chapter,
        "sectionId": section,
        "title": _deck_title(kind, guide_id, chapter, section),
        "cardCount": count,
    }


def list_decks(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Derive the deck list (guide, chapter, section, outras) with live counts."""
    rows = conn.execute(
        """
        SELECT n.guide_id AS guide_id,
               n.chapter_slug AS chapter_slug,
               n.section_id AS section_id,
               COUNT(*) AS card_count
          FROM fc_cards c
          JOIN fc_notes n ON n.id = c.note_id
         WHERE c.state != 'deprecated'
         GROUP BY n.guide_id, n.chapter_slug, n.section_id
        """
    ).fetchall()

    guides: dict[str, int] = {}
    chapters: dict[tuple[str, str], int] = {}
    sections: dict[tuple[str, str, str], int] = {}
    outras = 0
    for row in rows:
        count = int(row["card_count"])
        guide_id = row["guide_id"]
        chapter = row["chapter_slug"]
        section = row["section_id"]
        if guide_id is None:
            outras += count
            continue
        guides[guide_id] = guides.get(guide_id, 0) + count
        if chapter:
            chapters[(guide_id, chapter)] = chapters.get((guide_id, chapter), 0) + count
            if section:
                key = (guide_id, chapter, section)
                sections[key] = sections.get(key, 0) + count

    decks: list[dict[str, Any]] = []
    for guide_id in sorted(guides):
        decks.append(_deck_payload("guide", guide_id, None, None, guides[guide_id]))
    for guide_id, chapter in sorted(chapters):
        decks.append(_deck_payload("chapter", guide_id, chapter, None, chapters[(guide_id, chapter)]))
    for guide_id, chapter, section in sorted(sections):
        decks.append(
            _deck_payload("section", guide_id, chapter, section, sections[(guide_id, chapter, section)])
        )
    if outras:
        decks.append(_deck_payload("outras", None, None, None, outras))
    return decks


def deck_cards(conn: sqlite3.Connection, deck_id: str | None) -> list[sqlite3.Row]:
    """Every non-deprecated card of a deck, ordered by anchor then id."""
    scope = parse_deck_id(deck_id)
    if scope.kind == "outras":
        sql = f"""
            SELECT {CARD_COLUMNS}
            FROM fc_cards c
            JOIN fc_notes n ON n.id = c.note_id
            WHERE c.state != 'deprecated' AND n.guide_id IS NULL
            ORDER BY c.id
        """
        return conn.execute(sql).fetchall()
    clauses, params = scope.clauses()
    where = " AND ".join(["c.state != 'deprecated'", *clauses])
    sql = f"""
        SELECT {CARD_COLUMNS}
        FROM fc_cards c
        JOIN fc_notes n ON n.id = c.note_id
        WHERE {where}
        ORDER BY n.chapter_slug, n.section_id, c.id
    """
    return conn.execute(sql, params).fetchall()


def deck_meta(conn: sqlite3.Connection, deck_id: str | None) -> dict[str, Any] | None:
    """Deck metadata with its live card count, or ``None`` when the deck is empty."""
    scope = parse_deck_id(deck_id)
    cards = deck_cards(conn, deck_id)
    if not cards:
        return None
    payload = _deck_payload(
        scope.kind, scope.guide_id, scope.chapter_slug, scope.section_id, len(cards)
    )
    return payload
