"""Shared HTTP shaping for the flashcards routers.

Two rules live here so no router can get them wrong:

* the review prompt (:func:`question_payload`) never carries the answer - the
  answer only leaves the server in the response to ``POST /cards/<id>/review``
  (contract-tested);
* card rows flowing out of ``queue.py``/``db.py`` are serialised to the same
  camelCase shape everywhere (queue, deck browse, note cards).
"""

from __future__ import annotations

import sqlite3
from typing import Annotated, Any

from fastapi import Depends

from app.db import get_connection
from app.flashcards import cloze

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]

STATE_VALUES = ("new", "learning", "review", "suspended", "deprecated")


def scope_meta(row: sqlite3.Row) -> dict[str, Any]:
    """The source anchor of a card/note, for linking back to the guide."""
    return {
        "guideId": row["guide_id"],
        "chapterSlug": row["chapter_slug"],
        "sectionId": row["section_id"],
        "sourceSnippet": row["source_snippet"],
    }


def card_summary(row: sqlite3.Row) -> dict[str, Any]:
    """Compact card state, as listed under a note."""
    return {
        "id": row["id"],
        "template": row["template"],
        "state": row["state"],
        "due": row["due"],
        "deprecatedAt": row["deprecated_at"],
    }


def note_payload(note: sqlite3.Row, cards: list[sqlite3.Row]) -> dict[str, Any]:
    """Full note plus its cards."""
    return {
        "id": note["id"],
        "kind": note["kind"],
        "front": note["front"],
        "back": note["back"],
        "guideId": note["guide_id"],
        "chapterSlug": note["chapter_slug"],
        "sectionId": note["section_id"],
        "sourceSnippet": note["source_snippet"],
        "tags": note["tags"],
        "createdAt": note["created_at"],
        "updatedAt": note["updated_at"],
        "cards": [card_summary(card) for card in cards],
    }


def question_front(row: sqlite3.Row) -> str:
    """The prompt for one card: the answer stays on the server."""
    kind = row["kind"]
    if kind == "basic-reverse" and row["template"] == "reverse":
        return row["back"]
    if kind == "cloze":
        number = cloze.parse_template(row["template"])
        if number is not None:
            return cloze.render_question(row["front"], number)
    return row["front"]


def question_payload(row: sqlite3.Row) -> dict[str, Any]:
    """One queue/deck card, without the answer."""
    return {
        "id": row["id"],
        "noteId": row["note_id"],
        "kind": row["kind"],
        "template": row["template"],
        "state": row["state"],
        "front": question_front(row),
        "scopeMeta": scope_meta(row),
    }


def deck_card_payload(row: sqlite3.Row) -> dict[str, Any]:
    """One browsed deck card: prompt preview plus state, never the answer."""
    payload = question_payload(row)
    payload["due"] = row["due"]
    return payload


def answer_payload(row: sqlite3.Row) -> dict[str, str]:
    """The revealed card: the expected answer plus any extra note text."""
    kind = row["kind"]
    if kind == "basic-reverse" and row["template"] == "reverse":
        # The reverse prompt is the note back, so the answer is the note front.
        return {"answer": row["front"], "extra": ""}
    if kind == "cloze":
        number = cloze.parse_template(row["template"])
        answer = cloze.render_answer(row["front"]) if number is not None else row["back"]
        return {"answer": answer, "extra": row["back"]}
    return {"answer": row["back"], "extra": ""}
