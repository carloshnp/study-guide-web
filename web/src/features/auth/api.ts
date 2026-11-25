/**
 * Typed HTTP client for cookie-based authentication (`/api/auth/*`).
 */

import { ApiError } from "@/lib/api"

const AUTH_BASE = "/api/auth"

export type AuthRole = "owner" | "member"

export type AuthUser = {
  id: number
  username: string
  displayName: string
  role: AuthRole
}

export type AuthStatus = {
  user: AuthUser | null
  hasUsers: boolean
  authRequired: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json()
    if (!isRecord(payload)) return null
    if (typeof payload.detail === "string") return payload.detail
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail
        .map((entry) => (isRecord(entry) && typeof entry.msg === "string" ? entry.msg : null))
        .filter((msg): msg is string => msg !== null)
      return messages.length > 0 ? messages.join("; ") : null
    }
    return null
  } catch {
    return null
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { credentials: "same-origin", ...init })
  } catch (cause) {
    throw new ApiError(
      `Falha de rede ao acessar ${path}. Verifique a conexão e tente de novo.`,
      { cause, path, status: 0 },
    )
  }

  if (!response.ok) {
    const detail = await readDetail(response)
    throw new ApiError(
      detail ?? `O servidor respondeu ${response.status} para ${path}.`,
      { path, status: response.status },
    )
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (text === "") return undefined as T

  try {
    return JSON.parse(text) as T
  } catch (cause) {
    throw new ApiError(`Resposta inválida de ${path}: o corpo não é JSON.`, {
      cause,
      path,
      status: response.status,
    })
  }
}

function assertUser(value: unknown, path: string): AuthUser {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.username !== "string" ||
    typeof value.displayName !== "string" ||
    (value.role !== "owner" && value.role !== "member")
  ) {
    throw new ApiError(`Resposta inválida de ${path}: usuário malformado.`, {
      path,
      status: 200,
    })
  }
  return {
    displayName: value.displayName,
    id: value.id,
    role: value.role,
    username: value.username,
  }
}

export const authApi = {
  async me(): Promise<AuthStatus> {
    const path = `${AUTH_BASE}/me`
    const payload = await request<unknown>(path, {
      headers: { Accept: "application/json" },
      method: "GET",
    })
    if (
      !isRecord(payload) ||
      typeof payload.hasUsers !== "boolean" ||
      typeof payload.authRequired !== "boolean"
    ) {
      throw new ApiError(`Resposta inválida de ${path}.`, { path, status: 200 })
    }
    return {
      authRequired: payload.authRequired,
      hasUsers: payload.hasUsers,
      user: payload.user === null ? null : assertUser(payload.user, path),
    }
  },

  async register(input: {
    username: string
    displayName?: string
    password: string
  }): Promise<AuthUser> {
    const path = `${AUTH_BASE}/register`
    const body: Record<string, string> = {
      password: input.password,
      username: input.username,
    }
    if (input.displayName?.trim()) body.displayName = input.displayName.trim()
    const payload = await request<unknown>(path, {
      body: JSON.stringify(body),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
    })
    if (!isRecord(payload)) {
      throw new ApiError(`Resposta inválida de ${path}.`, { path, status: 201 })
    }
    return assertUser(payload.user, path)
  },

  async login(input: { username: string; password: string }): Promise<AuthUser> {
    const path = `${AUTH_BASE}/login`
    const payload = await request<unknown>(path, {
      body: JSON.stringify({ password: input.password, username: input.username }),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
    })
    if (!isRecord(payload)) {
      throw new ApiError(`Resposta inválida de ${path}.`, { path, status: 200 })
    }
    return assertUser(payload.user, path)
  },

  async logout(): Promise<void> {
    const path = `${AUTH_BASE}/logout`
    await request<void>(path, {
      headers: { Accept: "application/json" },
      method: "POST",
    })
  },
}
