"""POST/GET/PATCH/DELETE /api/flashcards/notes: authored items and their cards.

One note yields one or more cards: ``basic`` -> 1, ``basic-reverse`` -> 2,
``cloze`` -> one per distinct ``{{cN::...}}`` lacuna. Editing a note re-syncs the
cards: missing templates are created, templates that no longer exist are marked
``deprecated`` (their revlog is kept) and everything else is left untouched, so a
removed lacuna can never lose its history.
"""

from __future__ import annotations

import sqlite3
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.api.flashcards_common import Connection, card_summary, note_payload
from app.db import utcnow
from app.flashcards import cloze
from app.flashcards import db as fdb

router = APIRouter(prefix="/api/flashcards", tags=["flashcards-notes"])

MAX_TEXT_CHARS = 20000
MAX_ID_CHARS = 200
MAX_TAGS_CHARS = 500

Kind = Literal["basic", "basic-reverse", "cloze"]
StateName = Literal["new", "learning", "review", "suspended", "deprecated"]


class CardOut(BaseModel):
    """One card of a note, without the answer."""

    model_config = ConfigDict(populate_by_name=True)

    id: int
    template: str
    state: StateName
    due: str | None = None
    deprecated_at: str | None = Field(default=None, alias="deprecatedAt")


class NoteOut(BaseModel):
    """A note with its cards."""

    model_config = ConfigDict(populate_by_name=True)

    id: int
    kind: Kind
    front: str
    back: str
    guide_id: str | None = Field(default=None, alias="guideId")
    chapter_slug: str | None = Field(default=None, alias="chapterSlug")
    section_id: str | None = Field(default=None, alias="sectionId")
    source_snippet: str | None = Field(default=None, alias="sourceSnippet")
    tags: str = ""
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    cards: list[CardOut] = Field(default_factory=list)


class NoteList(BaseModel):
    """GET /notes."""

    count: int
    notes: list[NoteOut]


class DeletedNote(BaseModel):
    """DELETE /notes/<id>."""

    id: int
    deleted: bool


class NoteFields(BaseModel):
    """Fields shared by create and patch payloads."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    guide_id: str | None = Field(default=None, alias="guideId", max_length=MAX_ID_CHARS)
    chapter_slug: str | None = Field(default=None, alias="chapterSlug", max_length=MAX_ID_CHARS)
    section_id: str | None = Field(default=None, alias="sectionId", max_length=MAX_ID_CHARS)
    source_snippet: str | None = Field(
        default=None, alias="sourceSnippet", max_length=MAX_TEXT_CHARS
    )
    tags: str = Field(default="", max_length=MAX_TAGS_CHARS)

    @field_validator("guide_id", "chapter_slug", "section_id")
    @classmethod
    def _clean_id(cls, value: str | None, info: Any) -> str | None:
        if value is None:
            return None
        if value != value.strip() or not value:
            raise ValueError(f"{info.field_name} must be a non-empty, unpadded id")
        return value


class NoteCreate(NoteFields):
    """Body of POST /notes."""

    kind: Kind
    front: str
    back: str = ""

    @field_validator("front", "back")
    @classmethod
    def _strip_text(cls, value: str, info: Any) -> str:
        if value != value.strip():
            value = value.strip()
        return value

    @model_validator(mode="after")
    def _check_content(self) -> NoteCreate:
        _require_content(self.kind, self.front, self.back)
        _require_anchor(self.guide_id, self.chapter_slug, self.section_id)
        return self


class NoteUpdate(NoteFields):
    """Body of PATCH /notes/<id>; absent keys keep their stored value."""

    kind: Kind | None = None
    front: str | None = None
    back: str | None = None


def _require_content(kind: str, front: str | None, back: str | None) -> None:
    """Reject blank text and cloze notes without a lacuna, naming the field."""
    if front is None or not front.strip():
        raise HTTPException(
            status_code=422, detail={"field": "front", "message": "front must not be blank"}
        )
    if kind in ("basic", "basic-reverse") and (back is None or not back.strip()):
        raise HTTPException(
            status_code=422,
            detail={"field": "back", "message": "back must not be blank for basic cards"},
        )
    if kind == "cloze":
        try:
            gaps = cloze.parse_cloze(front)
        except cloze.ClozeSyntaxError as exc:
            raise HTTPException(
                status_code=422, detail={"field": "front", "message": str(exc)}
            ) from exc
        if not gaps:
            raise HTTPException(
                status_code=422,
                detail={
                    "field": "front",
                    "message": "front must contain at least one {{c1::...}} lacuna",
                },
            )


def _require_anchor(
    guide_id: str | None, chapter_slug: str | None, section_id: str | None
) -> None:
    """A chapter/section anchor needs its parent guide."""
    if guide_id is None and (chapter_slug or section_id):
        raise HTTPException(
            status_code=422,
            detail={
                "field": "guideId",
                "message": "guideId is required when chapterSlug or sectionId is set",
            },
        )


def _sync_cards(
    connection: sqlite3.Connection, note_id: int, kind: str, front: str
) -> list[sqlite3.Row]:
    """Create missing templates and deprecate templates the note no longer uses."""
    wanted = cloze.card_templates(kind, front)
    existing = fdb.list_cards(connection, note_id=note_id)
    present = {row["template"] for row in existing}
    stamp = utcnow()
    for template in wanted:
        if template not in present:
            fdb.create_card(connection, note_id=note_id, template=template, now=stamp)
    stale = [row["id"] for row in existing if row["template"] not in wanted]
    if stale:
        fdb.deprecate_cards(connection, stale, now=stamp)
    return fdb.list_cards(connection, note_id=note_id)


def _note_out(connection: sqlite3.Connection, note_id: int) -> NoteOut:
    note = fdb.get_note(connection, note_id)
    if note is None:  # pragma: no cover - callers check first
        raise HTTPException(status_code=404, detail="note not found")
    cards = fdb.list_cards(connection, note_id=note_id)
    return NoteOut.model_validate(note_payload(note, cards))


@router.post("/notes", status_code=201, response_model=NoteOut)
def create_note(payload: NoteCreate, connection: Connection) -> NoteOut:
    """Create a note and the cards its kind requires."""
    stamp = utcnow()
    note_id = fdb.create_note(
        connection,
        kind=payload.kind,
        front=payload.front,
        back=payload.back,
        guide_id=payload.guide_id,
        chapter_slug=payload.chapter_slug,
        section_id=payload.section_id,
        source_snippet=payload.source_snippet,
        tags=payload.tags,
        now=stamp,
    )
    _sync_cards(connection, note_id, payload.kind, payload.front)
    return _note_out(connection, note_id)


@router.get("/notes", response_model=NoteList)
def list_notes(
    connection: Connection,
    guide_id: str | None = Query(default=None, alias="guideId", min_length=1, max_length=MAX_ID_CHARS),
) -> NoteList:
    """List notes, optionally narrowed to one guide."""
    notes = [
        _note_out(connection, note["id"])
        for note in fdb.list_notes(connection, guide_id=guide_id)
    ]
    return NoteList(count=len(notes), notes=notes)


@router.get("/notes/{note_id}", response_model=NoteOut)
def read_note(note_id: int, connection: Connection) -> NoteOut:
    """Return one note."""
    return _note_out(connection, note_id)


@router.patch("/notes/{note_id}", response_model=NoteOut)
def patch_note(note_id: int, payload: NoteUpdate, connection: Connection) -> NoteOut:
    """Update a note and re-sync its cards."""
    note = fdb.get_note(connection, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")
    changes = payload.model_dump(exclude_unset=True)
    for guarded in ("kind", "front", "back"):
        if guarded in changes and changes[guarded] is None:
            raise HTTPException(
                status_code=422,
                detail={"field": guarded, "message": f"{guarded} must not be null"},
            )
    kind = str(changes.get("kind") or note["kind"])
    front = str(changes["front"] if changes.get("front") is not None else note["front"])
    back = str(changes["back"] if changes.get("back") is not None else note["back"])
    _require_content(kind, front, back)
    _require_anchor(
        changes.get("guide_id", note["guide_id"]),
        changes.get("chapter_slug", note["chapter_slug"]),
        changes.get("section_id", note["section_id"]),
    )
    if changes:
        fdb.update_note(connection, note_id, changes, now=utcnow())
    _sync_cards(connection, note_id, kind, front)
    return _note_out(connection, note_id)


@router.post("/notes/{note_id}/cards", response_model=NoteOut)
def regenerate_cards(note_id: int, connection: Connection) -> NoteOut:
    """Re-sync the note's cards from its current text."""
    note = fdb.get_note(connection, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")
    _require_content(note["kind"], note["front"], note["back"])
    _sync_cards(connection, note_id, note["kind"], note["front"])
    return _note_out(connection, note_id)


@router.delete("/notes/{note_id}", response_model=DeletedNote)
def delete_note(note_id: int, connection: Connection) -> DeletedNote:
    """Delete a note; its cards and revlog go with it."""
    if not fdb.delete_note(connection, note_id):
        raise HTTPException(status_code=404, detail="note not found")
    return DeletedNote(id=note_id, deleted=True)
