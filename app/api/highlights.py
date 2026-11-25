"""Colored study-guide highlights API.

Highlights are stored in SQLite keyed by `(guide_id, chapter_id, variant)` and
anchored with `TextQuoteSelector` (`exact`, `prefix`, `suffix`) plus article text
offsets (`start_offset`, `end_offset`) so canonical guide Markdown files are never
modified.
"""

from __future__ import annotations

import sqlite3
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.auth import CurrentUserId
from app.db import get_connection, utcnow

router = APIRouter(prefix="/api", tags=["highlights"])

HighlightColor = Literal["yellow", "green", "blue", "pink"]
HighlightVariant = Literal["full", "resumo"]

MAX_ID_CHARS = 200
MAX_EXACT_CHARS = 4000
MAX_CONTEXT_CHARS = 200

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]
RequiredIdQuery = Annotated[str, Query(min_length=1, max_length=MAX_ID_CHARS)]


def _require_trimmed(value: str, field_name: str) -> str:
    if not value or value != value.strip():
        raise ValueError(f"{field_name} must be non-empty without leading/trailing whitespace")
    return value


class HighlightCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    guide_id: str = Field(alias="guideId", min_length=1, max_length=MAX_ID_CHARS)
    chapter_id: str = Field(alias="chapterId", min_length=1, max_length=MAX_ID_CHARS)
    variant: HighlightVariant = "full"
    section_id: str | None = Field(default=None, alias="sectionId", max_length=MAX_ID_CHARS)
    exact: str = Field(min_length=1, max_length=MAX_EXACT_CHARS)
    prefix: str = Field(default="", max_length=MAX_CONTEXT_CHARS)
    suffix: str = Field(default="", max_length=MAX_CONTEXT_CHARS)
    start_offset: int = Field(alias="startOffset", ge=0)
    end_offset: int = Field(alias="endOffset", gt=0)
    color: HighlightColor

    @field_validator("guide_id")
    @classmethod
    def _clean_guide_id(cls, value: str) -> str:
        return _require_trimmed(value, "guideId")

    @field_validator("chapter_id")
    @classmethod
    def _clean_chapter_id(cls, value: str) -> str:
        return _require_trimmed(value, "chapterId")

    @field_validator("section_id")
    @classmethod
    def _clean_section_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            return None
        if value != stripped:
            raise ValueError("sectionId must not carry leading/trailing whitespace")
        return stripped

    @field_validator("exact")
    @classmethod
    def _non_blank_exact(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("exact must not be blank")
        return value

    @model_validator(mode="after")
    def _check_offsets(self) -> HighlightCreate:
        if self.end_offset <= self.start_offset:
            raise ValueError("endOffset must be greater than startOffset")
        return self


class HighlightPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    color: HighlightColor


class Highlight(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    guide_id: str = Field(alias="guideId")
    chapter_id: str = Field(alias="chapterId")
    variant: HighlightVariant
    section_id: str | None = Field(default=None, alias="sectionId")
    exact: str
    prefix: str
    suffix: str
    start_offset: int = Field(alias="startOffset")
    end_offset: int = Field(alias="endOffset")
    color: HighlightColor
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


class HighlightList(BaseModel):
    highlights: list[Highlight]


def _row_to_highlight(row: sqlite3.Row) -> Highlight:
    return Highlight(
        id=row["id"],
        guideId=row["guide_id"],
        chapterId=row["chapter_id"],
        variant=row["variant"],
        sectionId=row["section_id"],
        exact=row["exact"],
        prefix=row["prefix"],
        suffix=row["suffix"],
        startOffset=row["start_offset"],
        endOffset=row["end_offset"],
        color=row["color"],
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


def _require_clean_query_id(value: str, field_name: str) -> str:
    if value != value.strip():
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must not carry leading or trailing whitespace",
        )
    return value


@router.get("/highlights", response_model=HighlightList)
def list_highlights(
    connection: Connection,
    user_id: CurrentUserId,
    guide_id: Annotated[RequiredIdQuery, Query(alias="guideId")],
    chapter_id: Annotated[RequiredIdQuery, Query(alias="chapterId")],
    variant: HighlightVariant = "full",
) -> HighlightList:
    guide_id = _require_clean_query_id(guide_id, "guideId")
    chapter_id = _require_clean_query_id(chapter_id, "chapterId")
    rows = connection.execute(
        """
        SELECT id, guide_id, chapter_id, variant, section_id,
               exact, prefix, suffix, start_offset, end_offset,
               color, created_at, updated_at
        FROM highlights
        WHERE user_id = ? AND guide_id = ? AND chapter_id = ? AND variant = ?
        ORDER BY start_offset ASC, id ASC
        """,
        (user_id, guide_id, chapter_id, variant),
    ).fetchall()
    return HighlightList(highlights=[_row_to_highlight(row) for row in rows])


@router.post("/highlights", response_model=Highlight, status_code=status.HTTP_201_CREATED)
def create_highlight(
    payload: HighlightCreate, connection: Connection, user_id: CurrentUserId
) -> Highlight:
    timestamp = utcnow()
    with connection:
        cursor = connection.execute(
            """
            INSERT INTO highlights (
                user_id, guide_id, chapter_id, variant, section_id,
                exact, prefix, suffix, start_offset, end_offset,
                color, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                payload.guide_id,
                payload.chapter_id,
                payload.variant,
                payload.section_id,
                payload.exact,
                payload.prefix,
                payload.suffix,
                payload.start_offset,
                payload.end_offset,
                payload.color,
                timestamp,
                timestamp,
            ),
        )
        highlight_id = int(cursor.lastrowid)
    return Highlight(
        id=highlight_id,
        guideId=payload.guide_id,
        chapterId=payload.chapter_id,
        variant=payload.variant,
        sectionId=payload.section_id,
        exact=payload.exact,
        prefix=payload.prefix,
        suffix=payload.suffix,
        startOffset=payload.start_offset,
        endOffset=payload.end_offset,
        color=payload.color,
        createdAt=timestamp,
        updatedAt=timestamp,
    )


@router.patch("/highlights/{highlight_id}", response_model=Highlight)
def update_highlight_color(
    highlight_id: int,
    payload: HighlightPatch,
    connection: Connection,
    user_id: CurrentUserId,
) -> Highlight:
    timestamp = utcnow()
    with connection:
        cursor = connection.execute(
            """
            UPDATE highlights
            SET color = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (payload.color, timestamp, highlight_id, user_id),
        )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Destaque não encontrado.")
    row = connection.execute(
        """
        SELECT id, guide_id, chapter_id, variant, section_id,
               exact, prefix, suffix, start_offset, end_offset,
               color, created_at, updated_at
        FROM highlights
        WHERE id = ? AND user_id = ?
        """,
        (highlight_id, user_id),
    ).fetchone()
    assert row is not None
    return _row_to_highlight(row)


@router.delete("/highlights/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_highlight(
    highlight_id: int, connection: Connection, user_id: CurrentUserId
) -> Response:
    with connection:
        cursor = connection.execute(
            "DELETE FROM highlights WHERE id = ? AND user_id = ?", (highlight_id, user_id)
        )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Destaque não encontrado.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
