"""Password hashing (Argon2id), HttpOnly cookie sessions, and request user resolution."""

from __future__ import annotations

import hashlib
import secrets
import sqlite3
from datetime import UTC, datetime, timedelta
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, HTTPException, Request, Response

from app.db import get_connection, utcnow

SESSION_COOKIE_NAME = "estudos_session"
SESSION_TTL_DAYS = 30
SESSION_MAX_AGE_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60
OWNER_USER_ID = 1

_hasher = PasswordHasher()
_DUMMY_HASH = _hasher.hash("estudos-dummy-timing-guard")

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return bool(_hasher.verify(password_hash, password))
    except (VerifyMismatchError, InvalidHashError):
        return False


def verify_dummy_password(password: str) -> None:
    """Spend the same Argon2id work on unknown usernames to reduce timing leaks."""
    verify_password(_DUMMY_HASH, password)


def hash_session_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def is_secure_request(request: Request) -> bool:
    forwarded = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
    if forwarded:
        return forwarded == "https"
    return request.url.scheme == "https"


def set_session_cookie(response: Response, request: Request, raw_token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=raw_token,
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=is_secure_request(request),
        path="/",
    )


def clear_session_cookie(response: Response, request: Request) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=is_secure_request(request),
        path="/",
    )


def create_session(connection: sqlite3.Connection, user_id: int) -> str:
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(raw_token)
    now = datetime.now(UTC).replace(microsecond=0)
    expires = now + timedelta(days=SESSION_TTL_DAYS)
    created_at = now.isoformat().replace("+00:00", "Z")
    expires_at = expires.isoformat().replace("+00:00", "Z")
    with connection:
        connection.execute(
            """
            INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (token_hash, user_id, created_at, expires_at),
        )
    return raw_token


def delete_session(connection: sqlite3.Connection, raw_token: str | None) -> None:
    if not raw_token:
        return
    token_hash = hash_session_token(raw_token)
    with connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))


def has_any_users(connection: sqlite3.Connection) -> bool:
    row = connection.execute("SELECT 1 FROM users LIMIT 1").fetchone()
    return row is not None


def get_session_user(request: Request, connection: sqlite3.Connection) -> sqlite3.Row | None:
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw_token:
        return None
    token_hash = hash_session_token(raw_token)
    row = connection.execute(
        """
        SELECT u.id, u.username, u.display_name, u.role, s.expires_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
        """,
        (token_hash,),
    ).fetchone()
    if row is None:
        return None
    if str(row["expires_at"]) <= utcnow():
        with connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
        return None
    return row


def get_current_user_id(request: Request, connection: Connection) -> int:
    """Resolve the active user_id for every user-scoped API endpoint.

    Before any account exists in ``users``, requests default to ``user_id = 1``
    so existing single-user tailnet installs and pre-auth tests keep working
    until the owner claims their account. Once at least one user is registered,
    unauthenticated requests receive ``401 Unauthorized``.
    """
    user = get_session_user(request, connection)
    if user is not None:
        return int(user["id"])
    if not has_any_users(connection):
        return OWNER_USER_ID
    raise HTTPException(status_code=401, detail="Faça login para continuar.")


CurrentUserId = Annotated[int, Depends(get_current_user_id)]
