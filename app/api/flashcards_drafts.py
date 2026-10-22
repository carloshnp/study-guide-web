"""Draft decks: list and import the YAML card drafts (pilot content).

Drafts are authored as YAML in ``data/flashcards/drafts/`` (their own git
history) and imported by hand: the import creates the notes and their cards
through the same code path as ``POST /notes``, so a draft goes through exactly
the same validation as a card typed in the editor. Import is idempotent per
(kind, front, guide, chapter): re-importing an unchanged file skips existing
notes.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Annotated, Any

import yaml
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.api.flashcards_notes import NoteCreate, create_note
from app.db import ROOT, get_connection

router = APIRouter(prefix="/api/flashcards", tags=["flashcards-drafts"])

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]

DEFAULT_DRAFTS_DIR = ROOT / "data" / "flashcards" / "drafts"
DRAFTS_DIR_ENV = "FLASHCARDS_DRAFTS_DIR"

DRAFT_REQUIRED = ("kind", "front", "back")


def drafts_dir() -> Path:
    override = os.environ.get(DRAFTS_DIR_ENV)
    return Path(override).expanduser() if override else DEFAULT_DRAFTS_DIR


class DraftSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file: str
    count: int
    guide_id: str | None = Field(default=None, alias="guideId")
    tags: list[str] = []


class DraftList(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    drafts: list[DraftSummary]


class DraftImportResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file: str
    created: int
    skipped: int


def _safe_draft_path(file: str) -> Path:
    """Only a bare ``<name>.yaml`` inside the drafts dir is accepted."""
    name = Path(file).name
    if name != file or not name.endswith(".yaml") or name.startswith("."):
        raise HTTPException(status_code=422, detail="draft file name must be a .yaml basename")
    path = drafts_dir() / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"draft file not found: {name}")
    return path


def _load_drafts(path: Path) -> list[dict[str, Any]]:
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise HTTPException(status_code=422, detail=f"invalid YAML in {path.name}: {exc}") from exc
    if not isinstance(raw, dict) or not isinstance(raw.get("drafts"), list):
        raise HTTPException(status_code=422, detail=f"{path.name}: expected a 'drafts' list")
    drafts: list[dict[str, Any]] = []
    for index, item in enumerate(raw["drafts"]):
        if not isinstance(item, dict):
            raise HTTPException(status_code=422, detail=f"{path.name}: drafts[{index}] is not a mapping")
        for field in DRAFT_REQUIRED:
            if not isinstance(item.get(field), str) or not item[field].strip():
                raise HTTPException(
                    status_code=422,
                    detail=f"{path.name}: drafts[{index}] missing non-empty '{field}'",
                )
        drafts.append(item)
    return drafts


@router.get("/drafts", response_model=DraftList)
def list_drafts() -> DraftList:
    directory = drafts_dir()
    if not directory.is_dir():
        return DraftList(drafts=[])
    summaries: list[DraftSummary] = []
    for path in sorted(directory.glob("*.yaml")):
        drafts = _load_drafts(path)
        guide_ids = {d.get("guide_id") for d in drafts if d.get("guide_id")}
        tags = sorted(
            {tag for d in drafts for tag in (d.get("tags") or "").split(",") if tag.strip()}
        )
        summaries.append(
            DraftSummary(
                file=path.name,
                count=len(drafts),
                guide_id=next(iter(guide_ids), None),
                tags=tags,
            )
        )
    return DraftList(drafts=summaries)


def _note_exists(connection: sqlite3.Connection, draft: dict[str, Any]) -> bool:
    row = connection.execute(
        """
        SELECT 1 FROM fc_notes
         WHERE kind = ? AND front = ? AND guide_id IS ?
           AND chapter_slug IS ? AND section_id IS ?
         LIMIT 1
        """,
        (
            draft["kind"],
            draft["front"].strip(),
            draft.get("guide_id"),
            draft.get("chapter_slug"),
            draft.get("section_id"),
        ),
    ).fetchone()
    return row is not None


@router.post("/drafts/{file}/import", response_model=DraftImportResult)
def import_drafts(file: str, connection: Connection) -> DraftImportResult:
    path = _safe_draft_path(file)
    drafts = _load_drafts(path)
    created = 0
    skipped = 0
    for draft in drafts:
        if _note_exists(connection, draft):
            skipped += 1
            continue
        payload = NoteCreate(
            kind=draft["kind"],
            front=draft["front"],
            back=draft["back"],
            guideId=draft.get("guide_id"),
            chapterSlug=draft.get("chapter_slug"),
            sectionId=draft.get("section_id"),
            sourceSnippet=draft.get("source_snippet"),
            tags=draft.get("tags") or "",
        )
        create_note(payload, connection)
        created += 1
    return DraftImportResult(file=path.name, created=created, skipped=skipped)
