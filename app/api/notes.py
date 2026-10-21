"""PUT/GET /api/notes: one free-text note per chapter.

A note is empty by default. Writing an empty (or whitespace-only) body deletes the
row, so "no note" has exactly one representation in the store. Bodies longer than
20000 characters are truncated, not rejected: the reader autosaves whatever the user
typed and the API keeps the first 20000 characters of it.
"""

from __future__ import annotations

import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db import get_connection, utcnow

router = APIRouter(prefix="/api", tags=["notes"])

MAX_BODY_CHARS = 20000
MAX_ID_CHARS = 200

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]
IdQuery = Annotated[str, Query(min_length=1, max_length=MAX_ID_CHARS)]


def _require_clean_id(value: str, field: str) -> str:
    if value != value.strip():
        raise HTTPException(
            status_code=422,
            detail=f"{field} must not carry leading or trailing whitespace",
        )
    return value


class NoteWrite(BaseModel):
    """Body of PUT /api/notes."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    guide_id: str = Field(alias="guideId", min_length=1, max_length=MAX_ID_CHARS)
    chapter_id: str = Field(alias="chapterId", min_length=1, max_length=MAX_ID_CHARS)
    body: str

    @model_validator(mode="after")
    def _check_ids(self) -> NoteWrite:
        for field, value in (("guideId", self.guide_id), ("chapterId", self.chapter_id)):
            if value != value.strip():
                raise ValueError(f"{field} must not carry leading or trailing whitespace")
        return self


class Note(BaseModel):
    """A stored note; ``body`` is empty and ``updatedAt`` is null when absent."""

    model_config = ConfigDict(populate_by_name=True)

    guide_id: str = Field(alias="guideId")
    chapter_id: str = Field(alias="chapterId")
    body: str
    updated_at: str | None = Field(default=None, alias="updatedAt")


@router.put("/notes", response_model=Note)
def write_note(payload: NoteWrite, connection: Connection) -> Note:
    """Save the chapter note, or delete it when the body is blank."""
    if not payload.body.strip():
        with connection:
            connection.execute(
                "DELETE FROM notes WHERE guide_id = ? AND chapter_id = ?",
                (payload.guide_id, payload.chapter_id),
            )
        return Note(
            guideId=payload.guide_id,
            chapterId=payload.chapter_id,
            body="",
            updatedAt=None,
        )

    body = payload.body[:MAX_BODY_CHARS]
    timestamp = utcnow()
    with connection:
        connection.execute(
            """
            INSERT INTO notes (guide_id, chapter_id, body, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (guide_id, chapter_id) DO UPDATE SET
                body = excluded.body,
                updated_at = excluded.updated_at
            """,
            (payload.guide_id, payload.chapter_id, body, timestamp),
        )
    return Note(
        guideId=payload.guide_id,
        chapterId=payload.chapter_id,
        body=body,
        updatedAt=timestamp,
    )


@router.get("/notes", response_model=Note)
def read_note(
    connection: Connection,
    guide_id: Annotated[IdQuery, Query(alias="guideId")],
    chapter_id: Annotated[IdQuery, Query(alias="chapterId")],
) -> Note:
    """Return the chapter note, empty when the user never wrote one."""
    _require_clean_id(guide_id, "guideId")
    _require_clean_id(chapter_id, "chapterId")
    row = connection.execute(
        "SELECT body, updated_at FROM notes WHERE guide_id = ? AND chapter_id = ?",
        (guide_id, chapter_id),
    ).fetchone()
    if row is None:
        return Note(guideId=guide_id, chapterId=chapter_id, body="", updatedAt=None)
    return Note(
        guideId=guide_id,
        chapterId=chapter_id,
        body=row["body"],
        updatedAt=row["updated_at"],
    )
