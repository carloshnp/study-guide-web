"""Standalone study notes API with automatic guide/chapter/section link extraction.

Notes exist independently of any study guide. When a note's markdown body contains
internal reader links (`/g/<guideId>/c/<chapterId>[?query][#<sectionId>]`), those
references are extracted on write into `study_note_links` so the sidebar can filter
notes associated with the current chapter or section.
"""

from __future__ import annotations

import re
import sqlite3
from typing import Annotated
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.auth import CurrentUserId
from app.db import get_connection, utcnow

router = APIRouter(prefix="/api", tags=["study-notes"])

MAX_TITLE_CHARS = 200
MAX_ID_CHARS = 200
EXCERPT_CHARS = 180

# Matches internal reader links like /g/torcao/c/02-distribuicao?snippet=foo#tensao
_READER_LINK_RE = re.compile(
    r"/g/(?P<guide>[A-Za-z0-9._~%-]+)/c/(?P<chapter>[A-Za-z0-9._~%-]+)"
    r"(?:\?[^\s)\]\"'#<>]*)?"
    r"(?:#(?P<section>[A-Za-z0-9._~%-]+))?"
)

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]
OptionalIdQuery = Annotated[str | None, Query(min_length=1, max_length=MAX_ID_CHARS)]


class NoteLink(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    guide_id: str = Field(alias="guideId")
    chapter_id: str = Field(alias="chapterId")
    section_id: str | None = Field(default=None, alias="sectionId")


class StudyNoteCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    title: str = Field(min_length=1, max_length=MAX_TITLE_CHARS)
    body: str = ""
    links: list[NoteLink] | None = None

    @field_validator("title")
    @classmethod
    def _clean_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("title must not be blank")
        return stripped


class StudyNoteUpdate(StudyNoteCreate):
    body: str


class StudyNote(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    title: str
    body: str
    links: list[NoteLink]
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


class StudyNoteSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    title: str
    excerpt: str
    links: list[NoteLink]
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


class StudyNoteList(BaseModel):
    notes: list[StudyNoteSummary]


def _extract_links(body: str) -> list[NoteLink]:
    seen: set[tuple[str, str, str | None]] = set()
    links: list[NoteLink] = []
    for match in _READER_LINK_RE.finditer(body):
        guide_id = unquote(match.group("guide")).strip()
        chapter_id = unquote(match.group("chapter")).strip()
        raw_section = match.group("section")
        section_id = unquote(raw_section).strip() if raw_section else None
        if section_id == "":
            section_id = None
        if not guide_id or not chapter_id:
            continue
        key = (guide_id, chapter_id, section_id)
        if key in seen:
            continue
        seen.add(key)
        links.append(NoteLink(guideId=guide_id, chapterId=chapter_id, sectionId=section_id))
    return links


def _make_excerpt(body: str) -> str:
    collapsed = " ".join(body.split())
    if len(collapsed) <= EXCERPT_CHARS:
        return collapsed
    return f"{collapsed[: EXCERPT_CHARS - 1].rstrip()}…"


def _sync_links(connection: sqlite3.Connection, note_id: int, links: list[NoteLink]) -> None:
    connection.execute("DELETE FROM study_note_links WHERE note_id = ?", (note_id,))
    if not links:
        return
    connection.executemany(
        """
        INSERT OR IGNORE INTO study_note_links (note_id, guide_id, chapter_id, section_id)
        VALUES (?, ?, ?, ?)
        """,
        [
            (note_id, link.guide_id, link.chapter_id, link.section_id or "")
            for link in links
        ],
    )


def _fetch_links_by_note(
    connection: sqlite3.Connection, note_ids: list[int]
) -> dict[int, list[NoteLink]]:
    if not note_ids:
        return {}
    placeholders = ",".join("?" for _ in note_ids)
    rows = connection.execute(
        f"""
        SELECT note_id, guide_id, chapter_id, section_id
        FROM study_note_links
        WHERE note_id IN ({placeholders})
        ORDER BY guide_id, chapter_id, section_id
        """,
        tuple(note_ids),
    ).fetchall()
    grouped: dict[int, list[NoteLink]] = {nid: [] for nid in note_ids}
    for row in rows:
        grouped[row["note_id"]].append(
            NoteLink(
                guideId=row["guide_id"],
                chapterId=row["chapter_id"],
                sectionId=row["section_id"] or None,
            )
        )
    return grouped


def _require_clean_optional_id(value: str | None, field: str) -> str | None:
    if value is None:
        return None
    if value != value.strip():
        raise HTTPException(
            status_code=422,
            detail=f"{field} must not carry leading or trailing whitespace",
        )
    return value


@router.get("/study-notes", response_model=StudyNoteList)
def list_study_notes(
    connection: Connection,
    user_id: CurrentUserId,
    guide_id: Annotated[OptionalIdQuery, Query(alias="guideId")] = None,
    chapter_id: Annotated[OptionalIdQuery, Query(alias="chapterId")] = None,
    section_id: Annotated[OptionalIdQuery, Query(alias="sectionId")] = None,
) -> StudyNoteList:
    guide_id = _require_clean_optional_id(guide_id, "guideId")
    chapter_id = _require_clean_optional_id(chapter_id, "chapterId")
    section_id = _require_clean_optional_id(section_id, "sectionId")

    clauses: list[str] = ["n.user_id = ?"]
    params: list[object] = [user_id]
    if guide_id is not None:
        clauses.append("l.guide_id = ?")
        params.append(guide_id)
    if chapter_id is not None:
        clauses.append("l.chapter_id = ?")
        params.append(chapter_id)
    if section_id is not None:
        clauses.append("l.section_id = ?")
        params.append(section_id)

    if len(clauses) > 1:
        where_sql = " AND ".join(clauses)
        rows = connection.execute(
            f"""
            SELECT DISTINCT n.id, n.title, n.body, n.created_at, n.updated_at
            FROM study_notes n
            JOIN study_note_links l ON l.note_id = n.id
            WHERE {where_sql}
            ORDER BY n.updated_at DESC, n.id DESC
            """,
            tuple(params),
        ).fetchall()
    else:
        rows = connection.execute(
            """
            SELECT id, title, body, created_at, updated_at
            FROM study_notes
            WHERE user_id = ?
            ORDER BY updated_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()

    links_map = _fetch_links_by_note(connection, [row["id"] for row in rows])
    return StudyNoteList(
        notes=[
            StudyNoteSummary(
                id=row["id"],
                title=row["title"],
                excerpt=_make_excerpt(row["body"]),
                links=links_map.get(row["id"], []),
                createdAt=row["created_at"],
                updatedAt=row["updated_at"],
            )
            for row in rows
        ]
    )


def _dedupe_links(links: list[NoteLink]) -> list[NoteLink]:
    seen: set[tuple[str, str, str | None]] = set()
    unique: list[NoteLink] = []
    for link in links:
        guide_id = link.guide_id.strip()
        chapter_id = link.chapter_id.strip()
        section_id = link.section_id.strip() if link.section_id else None
        if section_id == "":
            section_id = None
        if not guide_id or not chapter_id:
            continue
        key = (guide_id, chapter_id, section_id)
        if key in seen:
            continue
        seen.add(key)
        unique.append(NoteLink(guideId=guide_id, chapterId=chapter_id, sectionId=section_id))
    return unique


@router.post("/study-notes", response_model=StudyNote, status_code=status.HTTP_201_CREATED)
def create_study_note(
    payload: StudyNoteCreate, connection: Connection, user_id: CurrentUserId
) -> StudyNote:
    timestamp = utcnow()
    links = (
        _dedupe_links(payload.links)
        if payload.links is not None
        else _extract_links(payload.body)
    )
    with connection:
        cursor = connection.execute(
            """
            INSERT INTO study_notes (user_id, title, body, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, payload.title, payload.body, timestamp, timestamp),
        )
        note_id = int(cursor.lastrowid)
        _sync_links(connection, note_id, links)
    return StudyNote(
        id=note_id,
        title=payload.title,
        body=payload.body,
        links=links,
        createdAt=timestamp,
        updatedAt=timestamp,
    )


@router.get("/study-notes/{note_id}", response_model=StudyNote)
def get_study_note(note_id: int, connection: Connection, user_id: CurrentUserId) -> StudyNote:
    row = connection.execute(
        "SELECT id, title, body, created_at, updated_at FROM study_notes WHERE id = ? AND user_id = ?",
        (note_id, user_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")
    links = _fetch_links_by_note(connection, [note_id]).get(note_id, [])
    return StudyNote(
        id=row["id"],
        title=row["title"],
        body=row["body"],
        links=links,
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


@router.put("/study-notes/{note_id}", response_model=StudyNote)
def update_study_note(
    note_id: int, payload: StudyNoteUpdate, connection: Connection, user_id: CurrentUserId
) -> StudyNote:
    existing = connection.execute(
        "SELECT created_at FROM study_notes WHERE id = ? AND user_id = ?",
        (note_id, user_id),
    ).fetchone()
    if existing is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")

    timestamp = utcnow()
    links = (
        _dedupe_links(payload.links)
        if payload.links is not None
        else _extract_links(payload.body)
    )
    with connection:
        connection.execute(
            """
            UPDATE study_notes
            SET title = ?, body = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (payload.title, payload.body, timestamp, note_id, user_id),
        )
        _sync_links(connection, note_id, links)
    return StudyNote(
        id=note_id,
        title=payload.title,
        body=payload.body,
        links=links,
        createdAt=existing["created_at"],
        updatedAt=timestamp,
    )


@router.delete("/study-notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_study_note(note_id: int, connection: Connection, user_id: CurrentUserId) -> Response:
    with connection:
        cursor = connection.execute(
            "DELETE FROM study_notes WHERE id = ? AND user_id = ?", (note_id, user_id)
        )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Nota não encontrada.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
