/**
 * Typed client for the JSON API (`app/api/progress.py`, `app/api/notes.py`).
 *
 * One place decides how a failure looks: every non-2xx response arrives as an
 * `ApiError` carrying the HTTP status and the server's `detail`, a network
 * failure as `ApiError` with status 0, and a 2xx body that is not JSON as an
 * `ApiError` too. Callers never see a raw `Response`, so optimistic updates can
 * roll back on any thrown value without inspecting the failure shape.
 *
 * Paths are relative (`/api/...`): Vite proxies them in dev and FastAPI serves
 * them in production.
 */

import {
  isProgressStatus,
  type ProgressStatus,
  type StoredProgressStatus,
} from "@/lib/progress"

const PROGRESS_PATH = "/api/progress"
const NOTES_PATH = "/api/notes"

export type { ProgressStatus, StoredProgressStatus }

/** GET /api/progress */
export type ProgressMapResponse = {
  guideId: string | null
  count: number
  units: Record<string, StoredProgressStatus>
}

/** PUT /api/progress */
export type ProgressWriteResponse = {
  guideId: string
  unitId: string
  status: ProgressStatus
  updatedAt: string | null
}

/** GET/PUT /api/notes; `body` is empty and `updatedAt` null when absent. */
export type NoteResponse = {
  guideId: string
  chapterId: string
  body: string
  updatedAt: string | null
}

export type ApiErrorOptions = {
  path: string
  status: number
  cause?: unknown
}

export class ApiError extends Error {
  readonly path: string
  readonly status: number

  constructor(message: string, options: ApiErrorOptions) {
    super(message, { cause: options.cause })
    this.name = "ApiError"
    this.path = options.path
    this.status = options.status
  }
}

/** Message for a toast or an inline error line; never empty. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Falha inesperada ao acessar a API."
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json()
    if (!isRecord(payload)) return null
    const detail = payload.detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) {
      const messages = detail
        .map((entry) => (isRecord(entry) && typeof entry.msg === "string" ? entry.msg : null))
        .filter((message): message is string => message !== null)
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
    response = await fetch(path, init)
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

function getInit(): RequestInit {
  return { headers: { Accept: "application/json" }, method: "GET" }
}

function putInit(body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "PUT",
  }
}

function assertProgressMap(value: unknown, path: string): ProgressMapResponse {
  if (!isRecord(value) || !isRecord(value.units) || typeof value.count !== "number") {
    throw new ApiError(
      `Resposta inválida de ${path}: units não é um mapa de estados.`,
      { path, status: 200 },
    )
  }
  const units: Record<string, StoredProgressStatus> = {}
  for (const [unitId, status] of Object.entries(value.units)) {
    if (status !== "done" && status !== "review") {
      throw new ApiError(
        `Resposta inválida de ${path}: units traz um estado desconhecido para ${unitId}.`,
        { path, status: 200 },
      )
    }
    units[unitId] = status
  }
  return {
    count: value.count,
    guideId: typeof value.guideId === "string" ? value.guideId : null,
    units,
  }
}

function assertNote(value: unknown, path: string): NoteResponse {
  if (!isRecord(value) || typeof value.body !== "string") {
    throw new ApiError(`Resposta inválida de ${path}: o corpo da nota não veio.`, {
      path,
      status: 200,
    })
  }
  return {
    body: value.body,
    chapterId: typeof value.chapterId === "string" ? value.chapterId : "",
    guideId: typeof value.guideId === "string" ? value.guideId : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  }
}

export const api = {
  /** Full unit map, optionally narrowed to one guide. */
  async getProgress(guideId?: string): Promise<ProgressMapResponse> {
    const query = guideId ? `?${new URLSearchParams({ guideId }).toString()}` : ""
    const path = `${PROGRESS_PATH}${query}`
    const payload = await request<unknown>(path, getInit())
    return assertProgressMap(payload, path)
  },

  /** Upsert one unit; `absent` deletes the row server-side. */
  async putProgress(input: {
    guideId: string
    unitId: string
    status: ProgressStatus
  }): Promise<ProgressWriteResponse> {
    const payload = await request<unknown>(PROGRESS_PATH, putInit(input))
    if (
      !isRecord(payload) ||
      typeof payload.unitId !== "string" ||
      !isProgressStatus(payload.status)
    ) {
      throw new ApiError(
        `Resposta inválida de ${PROGRESS_PATH}: a escrita não foi reconhecida.`,
        { path: PROGRESS_PATH, status: 200 },
      )
    }
    return {
      guideId: typeof payload.guideId === "string" ? payload.guideId : input.guideId,
      status: payload.status,
      unitId: payload.unitId,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    }
  },

  /** The chapter note; absent notes are 200 with an empty body. */
  async getNote(guideId: string, chapterId: string): Promise<NoteResponse> {
    const query = new URLSearchParams({ chapterId, guideId }).toString()
    const path = `${NOTES_PATH}?${query}`
    return assertNote(await request<unknown>(path, getInit()), path)
  },

  /** Save a note; a blank body deletes the row server-side. */
  async putNote(input: {
    guideId: string
    chapterId: string
    body: string
  }): Promise<NoteResponse> {
    return assertNote(await request<unknown>(NOTES_PATH, putInit(input)), NOTES_PATH)
  },
}

export type Api = typeof api
