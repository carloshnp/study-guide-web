/**
 * Shared test scaffolding for the flashcards UI: a `Response`-shaped object and
 * a fetch router, so each test declares the endpoints it needs and nothing else
 * (the components never touch the real server).
 */

import { vi } from "vitest"

export function jsonResponse(payload: unknown, status = 200): Response {
  const body = JSON.stringify(payload)
  return {
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response
}

export type ApiRoute = {
  /** Matched with `String(input).startsWith`. */
  path: string
  method?: string
  respond: (init: RequestInit) => unknown
}

export function bodyOf(init: RequestInit | undefined): Record<string, unknown> {
  if (!init?.body || typeof init.body !== "string") return {}
  try {
    return JSON.parse(init.body) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** Install a fetch that answers from `routes`, 404 otherwise. */
export function stubApi(routes: ApiRoute[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    const method = (init.method ?? "GET").toUpperCase()
    const route = routes.find(
      (candidate) =>
        url.startsWith(candidate.path) && (candidate.method ?? "GET").toUpperCase() === method,
    )
    if (!route) return jsonResponse({ detail: `rota não stubada: ${method} ${url}` }, 404)
    return jsonResponse(route.respond(init))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

export const REVIEW_SAMPLE = {
  answer: "**Ferrita**",
  correct: false,
  nextIntervalDays: 0.0007,
  nextState: "learning",
}
