/**
 * Typed HTTP client for standalone study notes (`/api/study-notes`).
 */

import { ApiError } from "@/lib/api"

const STUDY_NOTES_PATH = "/api/study-notes"

export type NoteLink = {
  guideId: string
  chapterId: string
  sectionId: string | null
}

export type StudyNoteSummary = {
  id: number
  title: string
  excerpt: string
  links: NoteLink[]
  createdAt: string
  updatedAt: string
}

export type StudyNote = {
  id: number
  title: string
  body: string
  links: NoteLink[]
  createdAt: string
  updatedAt: string
}

export type StudyNoteFilter = {
  guideId?: string
  chapterId?: string
  sectionId?: string
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

function assertLinks(value: unknown, path: string): NoteLink[] {
  if (!Array.isArray(value)) {
    throw new ApiError(`Resposta inválida de ${path}: links ausentes.`, { path, status: 200 })
  }
  return value.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.guideId !== "string" ||
      typeof entry.chapterId !== "string"
    ) {
      throw new ApiError(`Resposta inválida de ${path}: link malformado.`, { path, status: 200 })
    }
    return {
      chapterId: entry.chapterId,
      guideId: entry.guideId,
      sectionId: typeof entry.sectionId === "string" ? entry.sectionId : null,
    }
  })
}

function assertNote(value: unknown, path: string): StudyNote {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.title !== "string" ||
    typeof value.body !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new ApiError(`Resposta inválida de ${path}: nota malformada.`, { path, status: 200 })
  }
  return {
    body: value.body,
    createdAt: value.createdAt,
    id: value.id,
    links: assertLinks(value.links, path),
    title: value.title,
    updatedAt: value.updatedAt,
  }
}

function assertSummary(value: unknown, path: string): StudyNoteSummary {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.title !== "string" ||
    typeof value.excerpt !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new ApiError(`Resposta inválida de ${path}: resumo de nota malformado.`, {
      path,
      status: 200,
    })
  }
  return {
    createdAt: value.createdAt,
    excerpt: value.excerpt,
    id: value.id,
    links: assertLinks(value.links, path),
    title: value.title,
    updatedAt: value.updatedAt,
  }
}

export const studyNotesApi = {
  async listStudyNotes(filter?: StudyNoteFilter): Promise<StudyNoteSummary[]> {
    const params = new URLSearchParams()
    if (filter?.guideId) params.set("guideId", filter.guideId)
    if (filter?.chapterId) params.set("chapterId", filter.chapterId)
    if (filter?.sectionId) params.set("sectionId", filter.sectionId)
    const query = params.toString()
    const path = query ? `${STUDY_NOTES_PATH}?${query}` : STUDY_NOTES_PATH
    const payload = await request<unknown>(path, {
      headers: { Accept: "application/json" },
      method: "GET",
    })
    if (!isRecord(payload) || !Array.isArray(payload.notes)) {
      throw new ApiError(`Resposta inválida de ${path}: lista de notas ausente.`, {
        path,
        status: 200,
      })
    }
    return payload.notes.map((entry) => assertSummary(entry, path))
  },

  async getStudyNote(noteId: number): Promise<StudyNote> {
    const path = `${STUDY_NOTES_PATH}/${noteId}`
    const payload = await request<unknown>(path, {
      headers: { Accept: "application/json" },
      method: "GET",
    })
    return assertNote(payload, path)
  },

  async createStudyNote(input: {
    title: string
    body?: string
    links?: NoteLink[]
  }): Promise<StudyNote> {
    const bodyPayload: Record<string, unknown> = {
      body: input.body ?? "",
      title: input.title,
    }
    if (input.links !== undefined) bodyPayload.links = input.links
    const payload = await request<unknown>(STUDY_NOTES_PATH, {
      body: JSON.stringify(bodyPayload),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
    })
    return assertNote(payload, STUDY_NOTES_PATH)
  },

  async updateStudyNote(
    noteId: number,
    input: { title: string; body: string; links?: NoteLink[] },
  ): Promise<StudyNote> {
    const path = `${STUDY_NOTES_PATH}/${noteId}`
    const bodyPayload: Record<string, unknown> = {
      body: input.body,
      title: input.title,
    }
    if (input.links !== undefined) bodyPayload.links = input.links
    const payload = await request<unknown>(path, {
      body: JSON.stringify(bodyPayload),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "PUT",
    })
    return assertNote(payload, path)
  },

  async deleteStudyNote(noteId: number): Promise<void> {
    const path = `${STUDY_NOTES_PATH}/${noteId}`
    await request<void>(path, {
      headers: { Accept: "application/json" },
      method: "DELETE",
    })
  },
}
