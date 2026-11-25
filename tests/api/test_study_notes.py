"""Contract tests for /api/study-notes (standalone notes + derived quote links)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_standalone_note_crud_lifecycle(client: TestClient) -> None:
    created = client.post(
        "/api/study-notes",
        json={"title": "Transformada de Laplace", "body": "# Intro\n\nTexto livre."},
    )
    assert created.status_code == 201
    note = created.json()
    assert isinstance(note["id"], int)
    assert note["title"] == "Transformada de Laplace"
    assert note["body"] == "# Intro\n\nTexto livre."
    assert note["links"] == []
    assert note["createdAt"].endswith("Z")
    assert note["updatedAt"].endswith("Z")

    fetched = client.get(f"/api/study-notes/{note['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == note

    updated = client.put(
        f"/api/study-notes/{note['id']}",
        json={"title": "Laplace (revisado)", "body": "Nova versão"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Laplace (revisado)"
    assert updated.json()["body"] == "Nova versão"

    listed = client.get("/api/study-notes")
    assert listed.status_code == 200
    notes = listed.json()["notes"]
    assert len(notes) == 1
    assert notes[0]["id"] == note["id"]
    assert notes[0]["title"] == "Laplace (revisado)"
    assert "Nova versão" in notes[0]["excerpt"]

    deleted = client.delete(f"/api/study-notes/{note['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/study-notes/{note['id']}").status_code == 404


def test_quote_links_associate_notes_with_guides_chapters_and_sections(
    client: TestClient,
) -> None:
    standalone = client.post(
        "/api/study-notes",
        json={"title": "Ideia solta", "body": "Sem citação de guia."},
    ).json()

    linked = client.post(
        "/api/study-notes",
        json={
            "title": "Resumo de Torção e Alumínio",
            "body": (
                "> Tensão cisalhante máxima\n"
                "> — [Torção](/g/torcao/c/02-distribuicao?snippet=tensao#tensao-maxima)\n\n"
                "Ver também [Alumínio](/g/aluminio/c/01-intro) e de novo "
                "[Torção](/g/torcao/c/02-distribuicao#tensao-maxima)."
            ),
        },
    )
    assert linked.status_code == 201
    note = linked.json()
    assert note["links"] == [
        {"guideId": "torcao", "chapterId": "02-distribuicao", "sectionId": "tensao-maxima"},
        {"guideId": "aluminio", "chapterId": "01-intro", "sectionId": None},
    ]

    by_chapter = client.get("/api/study-notes?guideId=torcao&chapterId=02-distribuicao").json()
    assert [n["id"] for n in by_chapter["notes"]] == [note["id"]]

    by_section = client.get(
        "/api/study-notes?guideId=torcao&chapterId=02-distribuicao&sectionId=tensao-maxima"
    ).json()
    assert [n["id"] for n in by_section["notes"]] == [note["id"]]

    by_other = client.get("/api/study-notes?guideId=torcao&chapterId=99-outro").json()
    assert by_other["notes"] == []

    all_notes = client.get("/api/study-notes").json()
    assert {n["id"] for n in all_notes["notes"]} == {standalone["id"], note["id"]}

    # Removing the quote on update removes the association.
    updated = client.put(
        f"/api/study-notes/{note['id']}",
        json={"title": note["title"], "body": "Agora sem citações."},
    )
    assert updated.status_code == 200
    assert updated.json()["links"] == []
    assert (
        client.get("/api/study-notes?guideId=torcao&chapterId=02-distribuicao").json()["notes"]
        == []
    )


def test_study_notes_validation_and_not_found_errors(client: TestClient) -> None:
    assert client.post("/api/study-notes", json={"title": "   ", "body": "x"}).status_code == 422
    assert client.get("/api/study-notes?guideId=%20torcao").status_code == 422
    assert client.get("/api/study-notes/999999").status_code == 404
    assert (
        client.put("/api/study-notes/999999", json={"title": "Ok", "body": "x"}).status_code
        == 404
    )
    assert client.delete("/api/study-notes/999999").status_code == 404


def test_explicit_links_can_be_attached_and_removed_without_urls_in_body(
    client: TestClient,
) -> None:
    created = client.post(
        "/api/study-notes",
        json={
            "title": "Nota com vínculo explícito",
            "body": "Texto com $\\tau = Tc/J$ sem URL no corpo.",
            "links": [
                {"guideId": "torcao", "chapterId": "02-distribuicao", "sectionId": "tensao"}
            ],
        },
    )
    assert created.status_code == 201
    note = created.json()
    assert note["links"] == [
        {"guideId": "torcao", "chapterId": "02-distribuicao", "sectionId": "tensao"}
    ]
    assert [
        n["id"]
        for n in client.get("/api/study-notes?guideId=torcao&chapterId=02-distribuicao").json()[
            "notes"
        ]
    ] == [note["id"]]

    removed = client.put(
        f"/api/study-notes/{note['id']}",
        json={"title": note["title"], "body": note["body"], "links": []},
    )
    assert removed.status_code == 200
    assert removed.json()["links"] == []
    assert (
        client.get("/api/study-notes?guideId=torcao&chapterId=02-distribuicao").json()["notes"]
        == []
    )

