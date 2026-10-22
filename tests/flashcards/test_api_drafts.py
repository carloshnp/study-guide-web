"""Draft deck API: listing and idempotent import of YAML drafts."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.flashcards_drafts import DRAFTS_DIR_ENV

DRAFT_YAML = """\
drafts:
  - kind: basic
    front: 'Frente um'
    back: 'Verso um'
    guide_id: magnesio
    chapter_slug: '01-o-mg-entre-as-ligas-nao-ferrosas'
    section_id: 'a-escala-de-densidade-dos-metais'
    source_snippet: 'trecho um'
    tags: 'magnesio,teste'

  - kind: cloze
    front: 'O Mg tem densidade {{c1::1,74 g/cm³}} e estrutura {{c2::HC}}.'
    back: 'Nota do cloze'
    guide_id: magnesio
    chapter_slug: '01-o-mg-entre-as-ligas-nao-ferrosas'
    section_id: 'a-estrutura-hexagonal-compacta-e-o-escorregamento-basal'
    tags: 'magnesio'
"""


@pytest.fixture()
def drafts_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    directory = tmp_path / "drafts"
    directory.mkdir()
    (directory / "magnesio.yaml").write_text(DRAFT_YAML, encoding="utf-8")
    (directory / "vazio.yaml").write_text("drafts: []\n", encoding="utf-8")
    monkeypatch.setenv(DRAFTS_DIR_ENV, str(directory))
    return directory


def test_list_drafts_reports_each_file_and_counts(client: TestClient, drafts_dir: Path) -> None:
    response = client.get("/api/flashcards/drafts")

    assert response.status_code == 200
    body = response.json()
    assert len(body["drafts"]) == 2
    by_file = {entry["file"]: entry for entry in body["drafts"]}
    assert by_file["magnesio.yaml"]["count"] == 2
    assert by_file["magnesio.yaml"]["guideId"] == "magnesio"
    assert "magnesio" in by_file["magnesio.yaml"]["tags"]
    assert by_file["vazio.yaml"]["count"] == 0


def test_import_creates_notes_and_cards(client: TestClient, drafts_dir: Path) -> None:
    response = client.post("/api/flashcards/drafts/magnesio.yaml/import")

    assert response.status_code == 200
    assert response.json() == {"file": "magnesio.yaml", "created": 2, "skipped": 0}

    notes = client.get("/api/flashcards/notes?guideId=magnesio").json()
    assert notes["count"] == 2
    first = notes["notes"][0]
    assert first["kind"] == "basic"
    assert first["front"] == "Frente um"
    assert first["guideId"] == "magnesio"
    assert first["chapterSlug"] == "01-o-mg-entre-as-ligas-nao-ferrosas"


def test_import_is_idempotent(client: TestClient, drafts_dir: Path) -> None:
    first = client.post("/api/flashcards/drafts/magnesio.yaml/import")
    second = client.post("/api/flashcards/drafts/magnesio.yaml/import")

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == {"file": "magnesio.yaml", "created": 0, "skipped": 2}


def test_cloze_draft_generates_one_card_per_lacuna(client: TestClient, drafts_dir: Path) -> None:
    client.post("/api/flashcards/drafts/magnesio.yaml/import")

    notes = client.get("/api/flashcards/notes?guideId=magnesio").json()
    cloze = next(note for note in notes["notes"] if note["kind"] == "cloze")
    assert len(cloze["cards"]) == 2


def test_import_rejects_a_path_traversal_name(client: TestClient, drafts_dir: Path) -> None:
    response = client.post("/api/flashcards/drafts/../magnesio.yaml/import")

    assert response.status_code in (405, 422)


def test_import_missing_file_is_404(client: TestClient, drafts_dir: Path) -> None:
    response = client.post("/api/flashcards/drafts/nao-existe.yaml/import")

    assert response.status_code == 404
