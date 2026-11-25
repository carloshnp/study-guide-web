"""Contract tests for /api/auth, v1->v2 SQLite migration, and multi-user isolation."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app

V1_SCHEMA = """
CREATE TABLE progress (
    guide_id   TEXT NOT NULL,
    unit_id    TEXT NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('done', 'review')),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (guide_id, unit_id)
);
CREATE TABLE notes (
    guide_id   TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    body       TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (guide_id, chapter_id)
);
CREATE TABLE fc_notes (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('basic', 'basic-reverse', 'cloze')),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    guide_id TEXT,
    chapter_slug TEXT,
    section_id TEXT,
    source_snippet TEXT,
    tags TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE fc_cards (
    id INTEGER PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES fc_notes(id) ON DELETE CASCADE,
    template TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'new',
    deprecated_at TEXT,
    difficulty REAL NOT NULL DEFAULT 5.0,
    stability REAL NOT NULL DEFAULT 0.0,
    retrievability REAL,
    due TEXT,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    leech INTEGER NOT NULL DEFAULT 0,
    last_review TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE fc_revlog (
    id INTEGER PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES fc_cards(id) ON DELETE CASCADE,
    reviewed_at TEXT NOT NULL,
    rating INTEGER NOT NULL,
    state_before TEXT NOT NULL,
    interval_before INTEGER NOT NULL,
    interval_after INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL
);
CREATE TABLE fc_habits (
    day TEXT PRIMARY KEY,
    new_reviewed INTEGER NOT NULL DEFAULT 0,
    reviews_done INTEGER NOT NULL DEFAULT 0,
    streak_frozen INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE fc_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE study_notes (
    id         INTEGER PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE study_note_links (
    note_id    INTEGER NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    guide_id   TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    section_id TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (note_id, guide_id, chapter_id, section_id)
);
CREATE TABLE highlights (
    id           INTEGER PRIMARY KEY,
    guide_id     TEXT NOT NULL,
    chapter_id   TEXT NOT NULL,
    variant      TEXT NOT NULL DEFAULT 'full',
    section_id   TEXT,
    exact        TEXT NOT NULL,
    prefix       TEXT NOT NULL DEFAULT '',
    suffix       TEXT NOT NULL DEFAULT '',
    start_offset INTEGER NOT NULL,
    end_offset   INTEGER NOT NULL,
    color        TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
PRAGMA user_version = 1;
"""


def test_v1_to_v2_migration_preserves_all_owner_data(
    db_file: Path, web_dist: Path, content_dir: Path
) -> None:
    conn = sqlite3.connect(db_file)
    conn.executescript(V1_SCHEMA)
    with conn:
        conn.execute(
            "INSERT INTO progress VALUES ('torcao', 'torcao/01/11', 'done', '2026-11-20T10:00:00Z')"
        )
        conn.execute(
            "INSERT INTO notes VALUES ('torcao', '01', 'Nota legada', '2026-11-20T10:00:00Z')"
        )
        conn.execute(
            "INSERT INTO study_notes (id, title, body, created_at, updated_at) "
            "VALUES (5, 'Minha nota', 'Corpo preservado', '2026-11-20T10:00:00Z', '2026-11-20T10:00:00Z')"
        )
        conn.execute(
            "INSERT INTO study_note_links VALUES (5, 'torcao', '01', '11')"
        )
        conn.execute(
            "INSERT INTO highlights (id, guide_id, chapter_id, variant, section_id, exact, prefix, suffix, "
            "start_offset, end_offset, color, created_at, updated_at) "
            "VALUES (9, 'torcao', '01', 'full', '11', 'cisalhamento', 'de ', ' puro', 10, 22, 'yellow', "
            "'2026-11-20T10:00:00Z', '2026-11-20T10:00:00Z')"
        )
        conn.execute(
            "INSERT INTO fc_notes (id, kind, front, back, guide_id, tags, created_at, updated_at) "
            "VALUES (3, 'basic', 'O que é J?', 'Momento polar de inércia', 'torcao', '', "
            "'2026-11-20T10:00:00Z', '2026-11-20T10:00:00Z')"
        )
        conn.execute(
            "INSERT INTO fc_cards (id, note_id, template, state, due, created_at) "
            "VALUES (4, 3, 'front', 'review', '2026-11-20T10:00:00Z', '2026-11-20T10:00:00Z')"
        )
        conn.execute(
            "INSERT INTO fc_revlog (id, card_id, reviewed_at, rating, state_before, interval_before, "
            "interval_after, elapsed_ms) VALUES (1, 4, '2026-11-20T10:00:00Z', 3, 'new', 0, 1, 1500)"
        )
        conn.execute("INSERT INTO fc_habits VALUES ('2026-11-20', 1, 1, 0)")
        conn.execute("INSERT INTO fc_settings VALUES ('dailyNewLimit', '25')")
    conn.close()

    app = create_app(web_dist=web_dist, content_dir=content_dir)
    with TestClient(app) as client:
        reg = client.post(
            "/api/auth/register",
            json={"username": "carlos", "displayName": "Carlos", "password": "secret-password-1"},
        )
        assert reg.status_code == 201
        user = reg.json()["user"]
        assert user["id"] == 1
        assert user["role"] == "owner"

        assert client.get("/api/progress?guideId=torcao").json()["units"] == {
            "torcao/01/11": "done"
        }
        assert client.get("/api/notes?guideId=torcao&chapterId=01").json()["body"] == "Nota legada"
        assert client.get("/api/study-notes/5").json()["body"] == "Corpo preservado"
        assert len(client.get("/api/highlights?guideId=torcao&chapterId=01").json()["highlights"]) == 1
        assert client.get("/api/flashcards/notes/3").json()["front"] == "O que é J?"
        assert client.get("/api/flashcards/settings").json()["dailyNewLimit"] == 25
        assert "2026-11-20" in client.get("/api/flashcards/habits").json()["activeDays"]

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    conn.close()
    assert version == 2


def test_auth_register_login_logout_and_enforcement(
    client: TestClient, sqlite_rows
) -> None:
    initial = client.get("/api/auth/me")
    assert initial.status_code == 200
    assert initial.json() == {"user": None, "hasUsers": False, "authRequired": False}

    # Validation errors
    assert (
        client.post("/api/auth/register", json={"username": "ab", "password": "password123"}).status_code
        == 422
    )
    assert (
        client.post("/api/auth/register", json={"username": "valid_user", "password": "short"}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/auth/register", json={"username": "bad space", "password": "password123"}
        ).status_code
        == 422
    )

    reg = client.post(
        "/api/auth/register",
        json={"username": "Carlos", "displayName": "Carlos H", "password": "strong-password-1"},
    )
    assert reg.status_code == 201
    assert reg.json()["user"] == {
        "id": 1,
        "username": "Carlos",
        "displayName": "Carlos H",
        "role": "owner",
    }
    set_cookie = reg.headers.get("set-cookie", "")
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie or "SameSite=Lax" in set_cookie

    # Password is Argon2id hashed and raw session token is NOT stored in DB
    user_row = sqlite_rows("SELECT password_hash FROM users WHERE id = 1")[0]
    assert user_row["password_hash"].startswith("$argon2id$")
    assert "strong-password-1" not in user_row["password_hash"]

    raw_cookie = client.cookies.get("estudos_session")
    assert raw_cookie
    session_rows = sqlite_rows("SELECT token_hash FROM sessions WHERE user_id = 1")
    assert len(session_rows) == 1
    assert session_rows[0]["token_hash"] != raw_cookie

    # Duplicate username (case-insensitive) -> 409
    dup = client.post(
        "/api/auth/register",
        json={"username": "carlos", "password": "another-password"},
    )
    assert dup.status_code == 409

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["username"] == "Carlos"
    assert me.json()["hasUsers"] is True
    assert me.json()["authRequired"] is True

    # Logout clears cookie and revokes session
    out = client.post("/api/auth/logout")
    assert out.status_code == 204
    assert sqlite_rows("SELECT * FROM sessions") == []

    signed_out_me = client.get("/api/auth/me").json()
    assert signed_out_me == {"user": None, "hasUsers": True, "authRequired": True}

    # Once accounts exist, user-data APIs require auth (401) while public routes stay open
    assert client.get("/api/health").status_code == 200
    assert client.get("/content/index.json").status_code == 200
    assert client.get("/api/progress").status_code == 401
    assert client.get("/api/notes?guideId=torcao&chapterId=01").status_code == 401
    assert client.get("/api/study-notes").status_code == 401
    assert client.get("/api/highlights?guideId=torcao&chapterId=01").status_code == 401
    assert client.get("/api/flashcards/notes").status_code == 401
    assert client.get("/api/flashcards/queue").status_code == 401
    assert client.get("/api/flashcards/stats").status_code == 401
    assert client.get("/api/flashcards/settings").status_code == 401

    # Bad logins -> 401
    assert (
        client.post("/api/auth/login", json={"username": "carlos", "password": "wrong-password"}).status_code
        == 401
    )
    assert (
        client.post("/api/auth/login", json={"username": "nobody", "password": "wrong-password"}).status_code
        == 401
    )

    # Valid case-insensitive login restores session
    logged_in = client.post(
        "/api/auth/login", json={"username": "carlos", "password": "strong-password-1"}
    )
    assert logged_in.status_code == 200
    assert logged_in.json()["user"]["id"] == 1
    assert client.get("/api/progress").status_code == 200


def test_multi_user_isolation_across_all_features(
    db_file: Path, web_dist: Path, content_dir: Path
) -> None:
    app = create_app(web_dist=web_dist, content_dir=content_dir)

    with TestClient(app) as alice, TestClient(app) as bob:
        r_alice = alice.post(
            "/api/auth/register",
            json={"username": "alice", "password": "alice-password-1"},
        )
        assert r_alice.status_code == 201
        assert r_alice.json()["user"]["role"] == "owner"

        # Alice creates data in every user-scoped feature
        assert (
            alice.put(
                "/api/progress",
                json={"guideId": "torcao", "unitId": "torcao/01/11", "status": "done"},
            ).status_code
            == 200
        )
        assert (
            alice.put(
                "/api/notes",
                json={"guideId": "torcao", "chapterId": "01", "body": "Nota da Alice"},
            ).status_code
            == 200
        )
        alice_note = alice.post(
            "/api/study-notes",
            json={"title": "Caderno Alice", "body": "Privado da Alice"},
        ).json()
        alice_hl = alice.post(
            "/api/highlights",
            json={
                "guideId": "torcao",
                "chapterId": "01",
                "exact": "torque",
                "startOffset": 0,
                "endOffset": 6,
                "color": "yellow",
            },
        ).json()
        alice_fc = alice.post(
            "/api/flashcards/notes",
            json={
                "kind": "basic",
                "front": "Frente Alice",
                "back": "Verso Alice",
                "guideId": "torcao",
            },
        ).json()
        alice_card_id = alice_fc["cards"][0]["id"]
        assert (
            alice.post(
                f"/api/flashcards/cards/{alice_card_id}/review",
                json={"rating": 3, "elapsedMs": 1200},
            ).status_code
            == 200
        )
        assert (
            alice.post("/api/flashcards/settings", json={"dailyNewLimit": 30}).status_code == 200
        )

        # Bob registers as second user (member)
        r_bob = bob.post(
            "/api/auth/register",
            json={"username": "bob", "password": "bob-password-1"},
        )
        assert r_bob.status_code == 201
        assert r_bob.json()["user"]["id"] == 2
        assert r_bob.json()["user"]["role"] == "member"

        # Bob sees completely empty isolated state
        assert bob.get("/api/progress").json()["units"] == {}
        assert bob.get("/api/notes?guideId=torcao&chapterId=01").json()["body"] == ""
        assert bob.get("/api/study-notes").json()["notes"] == []
        assert bob.get("/api/highlights?guideId=torcao&chapterId=01").json()["highlights"] == []
        assert bob.get("/api/flashcards/notes").json()["notes"] == []
        assert bob.get("/api/flashcards/decks").json() == []
        assert bob.get("/api/flashcards/queue").json()["cards"] == []
        assert bob.get("/api/flashcards/habits").json()["activeDays"] == []
        assert bob.get("/api/flashcards/stats").json()["daily"] == []
        assert bob.get("/api/flashcards/settings").json()["dailyNewLimit"] == 10

        # Bob cannot read or mutate Alice's resources by ID (returns 404)
        assert bob.get(f"/api/study-notes/{alice_note['id']}").status_code == 404
        assert (
            bob.put(
                f"/api/study-notes/{alice_note['id']}",
                json={"title": "Hijack", "body": "Nope"},
            ).status_code
            == 404
        )
        assert bob.delete(f"/api/study-notes/{alice_note['id']}").status_code == 404
        assert (
            bob.patch(f"/api/highlights/{alice_hl['id']}", json={"color": "pink"}).status_code
            == 404
        )
        assert bob.delete(f"/api/highlights/{alice_hl['id']}").status_code == 404
        assert bob.get(f"/api/flashcards/notes/{alice_fc['id']}").status_code == 404
        assert (
            bob.patch(f"/api/flashcards/notes/{alice_fc['id']}", json={"front": "X"}).status_code
            == 404
        )
        assert bob.delete(f"/api/flashcards/notes/{alice_fc['id']}").status_code == 404
        assert bob.get(f"/api/flashcards/cards/{alice_card_id}").status_code == 404
        assert (
            bob.post(
                f"/api/flashcards/cards/{alice_card_id}/review",
                json={"rating": 4, "elapsedMs": 500},
            ).status_code
            == 404
        )

        # Bob writes on the SAME guide/chapter/unit without colliding with Alice
        assert (
            bob.put(
                "/api/progress",
                json={"guideId": "torcao", "unitId": "torcao/01/11", "status": "review"},
            ).status_code
            == 200
        )
        assert (
            bob.put(
                "/api/notes",
                json={"guideId": "torcao", "chapterId": "01", "body": "Nota do Bob"},
            ).status_code
            == 200
        )
        assert bob.post("/api/flashcards/settings", json={"dailyNewLimit": 15}).status_code == 200

        # Alice's data is untouched
        assert alice.get("/api/progress").json()["units"] == {"torcao/01/11": "done"}
        assert alice.get("/api/notes?guideId=torcao&chapterId=01").json()["body"] == "Nota da Alice"
        assert alice.get("/api/flashcards/settings").json()["dailyNewLimit"] == 30
        assert bob.get("/api/progress").json()["units"] == {"torcao/01/11": "review"}
        assert bob.get("/api/notes?guideId=torcao&chapterId=01").json()["body"] == "Nota do Bob"
        assert bob.get("/api/flashcards/settings").json()["dailyNewLimit"] == 15
