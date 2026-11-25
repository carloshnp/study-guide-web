"""Authentication API: register, login, logout, and current-session status."""

from __future__ import annotations

import re
import sqlite3
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.auth import (
    OWNER_USER_ID,
    SESSION_COOKIE_NAME,
    clear_session_cookie,
    create_session,
    delete_session,
    get_session_user,
    has_any_users,
    hash_password,
    set_session_cookie,
    verify_dummy_password,
    verify_password,
)
from app.db import get_connection, utcnow

router = APIRouter(prefix="/api/auth", tags=["auth"])

USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,40}$")
MIN_PASSWORD_LEN = 8
MAX_PASSWORD_LEN = 128
MAX_DISPLAY_NAME_LEN = 80

Connection = Annotated[sqlite3.Connection, Depends(get_connection)]


class AuthUser(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    username: str
    display_name: str = Field(alias="displayName")
    role: Literal["owner", "member"]


class AuthStatus(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user: AuthUser | None
    has_users: bool = Field(alias="hasUsers")
    auth_required: bool = Field(alias="authRequired")


class AuthResponse(BaseModel):
    user: AuthUser


class RegisterPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    username: str = Field(min_length=3, max_length=40)
    display_name: str | None = Field(default=None, alias="displayName", max_length=MAX_DISPLAY_NAME_LEN)
    password: str = Field(min_length=MIN_PASSWORD_LEN, max_length=MAX_PASSWORD_LEN)

    @field_validator("username")
    @classmethod
    def _validate_username(cls, value: str) -> str:
        trimmed = value.strip()
        if trimmed != value or not USERNAME_RE.match(trimmed):
            raise ValueError("Use 3–40 caracteres: letras, números, '.', '_' ou '-'.")
        return trimmed

    @field_validator("display_name")
    @classmethod
    def _clean_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class LoginPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    username: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LEN)


def _row_to_user(row: sqlite3.Row) -> AuthUser:
    return AuthUser(
        id=int(row["id"]),
        username=str(row["username"]),
        displayName=str(row["display_name"]),
        role=row["role"],
    )


@router.get("/me", response_model=AuthStatus)
def read_me(request: Request, connection: Connection) -> AuthStatus:
    user_row = get_session_user(request, connection)
    users_exist = has_any_users(connection)
    return AuthStatus(
        user=_row_to_user(user_row) if user_row is not None else None,
        hasUsers=users_exist,
        authRequired=users_exist,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterPayload,
    request: Request,
    response: Response,
    connection: Connection,
) -> AuthResponse:
    password_hash = hash_password(payload.password)
    display_name = payload.display_name or payload.username
    timestamp = utcnow()

    try:
        with connection:
            first_user = not has_any_users(connection)
            if first_user:
                connection.execute(
                    """
                    INSERT INTO users (id, username, display_name, password_hash, role, created_at)
                    VALUES (?, ?, ?, ?, 'owner', ?)
                    """,
                    (OWNER_USER_ID, payload.username, display_name, password_hash, timestamp),
                )
                user_id = OWNER_USER_ID
                role: Literal["owner", "member"] = "owner"
            else:
                cursor = connection.execute(
                    """
                    INSERT INTO users (username, display_name, password_hash, role, created_at)
                    VALUES (?, ?, ?, 'member', ?)
                    """,
                    (payload.username, display_name, password_hash, timestamp),
                )
                user_id = int(cursor.lastrowid)
                role = "member"
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esse nome de usuário já está em uso.",
        ) from exc

    raw_token = create_session(connection, user_id)
    set_session_cookie(response, request, raw_token)
    return AuthResponse(
        user=AuthUser(
            id=user_id,
            username=payload.username,
            displayName=display_name,
            role=role,
        )
    )


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginPayload,
    request: Request,
    response: Response,
    connection: Connection,
) -> AuthResponse:
    username = payload.username.strip()
    row = connection.execute(
        "SELECT id, username, display_name, password_hash, role FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if row is None:
        verify_dummy_password(payload.password)
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos.")
    if not verify_password(str(row["password_hash"]), payload.password):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos.")

    raw_token = create_session(connection, int(row["id"]))
    set_session_cookie(response, request, raw_token)
    return AuthResponse(user=_row_to_user(row))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, connection: Connection) -> Response:
    delete_session(connection, request.cookies.get(SESSION_COOKIE_NAME))
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response, request)
    return response
