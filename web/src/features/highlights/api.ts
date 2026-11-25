/**
 * Typed HTTP client for colored study-guide highlights (`/api/highlights`).
 */

import { ApiError } from "@/lib/api"

const HIGHLIGHTS_PATH = "/api/highlights"

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]
export type HighlightVariant = "full" | "resumo"

export type Highlight = {
  id: number
  guideId: string
  chapterId: string
  variant: HighlightVariant
  sectionId: string | null
  exact: string
  prefix: string
  suffix: string
  startOffset: number
  endOffset: number
  color: HighlightColor
  createdAt: string
  updatedAt: string
}

export type HighlightCreateInput = {
  guideId: string
  chapterId: string
  variant?: HighlightVariant
  sectionId?: string | null
  exact: string
  prefix?: string
  suffix?: string
  startOffset: number
  endOffset: number
  color: HighlightColor
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isHighlightColor(value: unknown): value is HighlightColor {
  return typeof value === "string" && (HIGHLIGHT_COLORS as readonly string[]).includes(value)
}

function isHighlightVariant(value: unknown): value is HighlightVariant {
  return value === "full" || value === "resumo"
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

function assertHighlight(value: unknown, path: string): Highlight {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.guideId !== "string" ||
    typeof value.chapterId !== "string" ||
    !isHighlightVariant(value.variant) ||
    typeof value.exact !== "string" ||
    typeof value.prefix !== "string" ||
    typeof value.suffix !== "string" ||
    typeof value.startOffset !== "number" ||
    typeof value.endOffset !== "number" ||
    !isHighlightColor(value.color) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new ApiError(`Resposta inválida de ${path}: destaque malformado.`, {
      path,
      status: 200,
    })
  }

  return {
    chapterId: value.chapterId,
    color: value.color,
    createdAt: value.createdAt,
    endOffset: value.endOffset,
    exact: value.exact,
    guideId: value.guideId,
    id: value.id,
    prefix: value.prefix,
    sectionId: typeof value.sectionId === "string" ? value.sectionId : null,
    startOffset: value.startOffset,
    suffix: value.suffix,
    updatedAt: value.updatedAt,
    variant: value.variant,
  }
}

export const highlightsApi = {
  async listHighlights(
    guideId: string,
    chapterId: string,
    variant: HighlightVariant = "full",
  ): Promise<Highlight[]> {
    const params = new URLSearchParams({ guideId, chapterId, variant })
    const path = `${HIGHLIGHTS_PATH}?${params.toString()}`
    const payload = await request<unknown>(path, {
      headers: { Accept: "application/json" },
      method: "GET",
    })
    if (!isRecord(payload) || !Array.isArray(payload.highlights)) {
      throw new ApiError(`Resposta inválida de ${path}: lista de destaques ausente.`, {
        path,
        status: 200,
      })
    }
    return payload.highlights.map((entry) => assertHighlight(entry, path))
  },

  async createHighlight(input: HighlightCreateInput): Promise<Highlight> {
    const payload = await request<unknown>(HIGHLIGHTS_PATH, {
      body: JSON.stringify({
        chapterId: input.chapterId,
        color: input.color,
        endOffset: input.endOffset,
        exact: input.exact,
        guideId: input.guideId,
        prefix: input.prefix ?? "",
        sectionId: input.sectionId ?? null,
        startOffset: input.startOffset,
        suffix: input.suffix ?? "",
        variant: input.variant ?? "full",
      }),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
    })
    return assertHighlight(payload, HIGHLIGHTS_PATH)
  },

  async updateHighlightColor(highlightId: number, color: HighlightColor): Promise<Highlight> {
    const path = `${HIGHLIGHTS_PATH}/${highlightId}`
    const payload = await request<unknown>(path, {
      body: JSON.stringify({ color }),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "PATCH",
    })
    return assertHighlight(payload, path)
  },

  async deleteHighlight(highlightId: number): Promise<void> {
    const path = `${HIGHLIGHTS_PATH}/${highlightId}`
    await request<void>(path, {
      headers: { Accept: "application/json" },
      method: "DELETE",
    })
  },
}
