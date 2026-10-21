"""PUT/GET /api/progress: per-heading-unit reading state.

A unit id is ``<guideId>/<chapterSlug>/<sectionId>``; a chapter without sections is
its own unit (``<guideId>/<chapterSlug>``). States are ``done``, ``review``, or
absent. ``absent`` means "no row": writing it deletes the unit, which keeps the map
returned by GET small and makes the store the single source of truth.
"""

from __future__ import annotations

import sqlite3
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db import get_connection, utcnow

router = APIRouter(prefix="/api", tags=["progress"])

StoredStatus = Literal["done", "review"]
ProgressStatus = Literal["done", "review", "absent"]
MAX_GUIDE_ID_CHARS = 120
MAX_UNIT_ID_CHARS = 512
MIN_UNIT_SEGMENTS = 2

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]


class ProgressWrite(BaseModel):
    """Body of PUT /api/progress."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    guide_id: str = Field(alias="guideId", min_length=1, max_length=MAX_GUIDE_ID_CHARS)
    unit_id: str = Field(alias="unitId", min_length=3, max_length=MAX_UNIT_ID_CHARS)
    status: ProgressStatus

    @model_validator(mode="after")
    def _check_unit_id(self) -> ProgressWrite:
        if self.guide_id != self.guide_id.strip():
            raise ValueError("guideId must not carry leading or trailing whitespace")
        segments = self.unit_id.split("/")
        if len(segments) < MIN_UNIT_SEGMENTS:
            raise ValueError(
                f"unitId {self.unit_id!r} must look like "
                "'<guideId>/<chapterSlug>/<sectionId>'"
            )
        if any(not segment or segment != segment.strip() for segment in segments):
            raise ValueError(
                f"unitId {self.unit_id!r} has an empty or padded path segment"
            )
        if segments[0] != self.guide_id:
            raise ValueError(
                f"unitId {self.unit_id!r} must start with guideId {self.guide_id!r}"
            )
        return self


class ProgressUnit(BaseModel):
    """One unit as stored, echoed back after a write."""

    model_config = ConfigDict(populate_by_name=True)

    guide_id: str = Field(alias="guideId")
    unit_id: str = Field(alias="unitId")
    status: ProgressStatus
    updated_at: str | None = Field(default=None, alias="updatedAt")


class ProgressMap(BaseModel):
    """GET /api/progress: every stored unit, keyed by unit id."""

    model_config = ConfigDict(populate_by_name=True)

    guide_id: str | None = Field(default=None, alias="guideId")
    count: int
    units: dict[str, StoredStatus]


@router.put("/progress", response_model=ProgressUnit)
def write_progress(payload: ProgressWrite, connection: Connection) -> ProgressUnit:
    """Upsert one unit; ``absent`` deletes it."""
    if payload.status == "absent":
        with connection:
            connection.execute(
                "DELETE FROM progress WHERE guide_id = ? AND unit_id = ?",
                (payload.guide_id, payload.unit_id),
            )
        return ProgressUnit(
            guideId=payload.guide_id,
            unitId=payload.unit_id,
            status="absent",
            updatedAt=None,
        )

    timestamp = utcnow()
    with connection:
        connection.execute(
            """
            INSERT INTO progress (guide_id, unit_id, status, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (guide_id, unit_id) DO UPDATE SET
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (payload.guide_id, payload.unit_id, payload.status, timestamp),
        )
    return ProgressUnit(
        guideId=payload.guide_id,
        unitId=payload.unit_id,
        status=payload.status,
        updatedAt=timestamp,
    )


@router.get("/progress", response_model=ProgressMap)
def read_progress(
    connection: Connection,
    guide_id: Annotated[
        str | None, Query(alias="guideId", min_length=1, max_length=MAX_GUIDE_ID_CHARS)
    ] = None,
) -> ProgressMap:
    """Return the unit map, optionally narrowed to one guide."""
    if guide_id is None:
        rows = connection.execute(
            "SELECT unit_id, status FROM progress ORDER BY unit_id"
        ).fetchall()
    else:
        rows = connection.execute(
            "SELECT unit_id, status FROM progress WHERE guide_id = ? ORDER BY unit_id",
            (guide_id,),
        ).fetchall()
    units: dict[str, StoredStatus] = {row["unit_id"]: row["status"] for row in rows}
    return ProgressMap(guideId=guide_id, count=len(units), units=units)
