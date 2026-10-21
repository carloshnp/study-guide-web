import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, api } from "@/lib/api"

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
    ...init,
  })
}

function mockFetch(response: Response | Promise<Response>) {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function mockFetchReject(error: unknown) {
  const fetchMock = vi.fn().mockRejectedValue(error)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function callOf(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit]
  return { init, url }
}

const GUIDE = "aluminio"
const UNIT = "aluminio/01-o-aluminio/11-obtencao"

describe("api client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads the progress map for one guide with a query string", async () => {
    const fetchMock = mockFetch(
      jsonResponse({
        count: 1,
        guideId: GUIDE,
        units: { [UNIT]: "done" },
      }),
    )

    const result = await api.getProgress(GUIDE)

    expect(result).toEqual({ count: 1, guideId: GUIDE, units: { [UNIT]: "done" } })
    const { init, url } = callOf(fetchMock)
    expect(url).toBe(`/api/progress?guideId=${GUIDE}`)
    expect(init.method).toBe("GET")
    expect(init.headers).toMatchObject({ Accept: "application/json" })
  })

  it("writes one unit with the camelCase body the API expects", async () => {
    const fetchMock = mockFetch(
      jsonResponse({
        guideId: GUIDE,
        status: "done",
        unitId: UNIT,
        updatedAt: "2026-10-21T02:00:00Z",
      }),
    )

    await api.putProgress({ guideId: GUIDE, status: "done", unitId: UNIT })

    const { init, url } = callOf(fetchMock)
    expect(url).toBe("/api/progress")
    expect(init.method).toBe("PUT")
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" })
    expect(JSON.parse(String(init.body))).toEqual({
      guideId: GUIDE,
      status: "done",
      unitId: UNIT,
    })
  })

  it("sends an absent write as status absent, never as a DELETE", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ guideId: GUIDE, status: "absent", unitId: UNIT, updatedAt: null }),
    )

    await api.putProgress({ guideId: GUIDE, status: "absent", unitId: UNIT })

    const { init } = callOf(fetchMock)
    expect(init.method).toBe("PUT")
    expect(JSON.parse(String(init.body))).toMatchObject({ status: "absent" })
  })

  it("raises ApiError with the status and the server detail", async () => {
    mockFetch(
      jsonResponse(
        { detail: "unitId 'aluminio/x' must look like '<guideId>/<chapterSlug>/<sectionId>'" },
        { status: 422 },
      ),
    )

    const failure = await api
      .putProgress({ guideId: GUIDE, status: "done", unitId: "aluminio/x" })
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    const apiError = failure as ApiError
    expect(apiError.status).toBe(422)
    expect(apiError.message).toContain("unitId 'aluminio/x' must look like")
  })

  it("raises ApiError with status 0 when the network itself fails", async () => {
    mockFetchReject(new TypeError("Failed to fetch"))

    const failure = await api.getProgress(GUIDE).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).status).toBe(0)
    expect((failure as ApiError).message).toMatch(/rede|conex/i)
  })

  it("rejects a progress payload whose units are not a status map", async () => {
    mockFetch(jsonResponse({ count: 1, guideId: GUIDE, units: { [UNIT]: "lido" } }))

    const failure = await api.getProgress(GUIDE).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).message).toMatch(/resposta|payload|units/i)
  })

  it("reads a note with both ids encoded and accepts the empty 200 body", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ body: "", chapterId: "cap 01/2", guideId: GUIDE, updatedAt: null }),
    )

    const note = await api.getNote(GUIDE, "cap 01/2")

    expect(note.body).toBe("")
    expect(note.updatedAt).toBeNull()
    const { init, url } = callOf(fetchMock)
    expect(url.startsWith("/api/notes?")).toBe(true)
    expect(new URLSearchParams(url.slice("/api/notes?".length)).get("guideId")).toBe(GUIDE)
    expect(new URLSearchParams(url.slice("/api/notes?".length)).get("chapterId")).toBe(
      "cap 01/2",
    )
    expect(init.method).toBe("GET")
  })

  it("saves a blank note body as an empty string so the API deletes the row", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ body: "", chapterId: "01-x", guideId: GUIDE, updatedAt: null }),
    )

    await api.putNote({ body: "   ", chapterId: "01-x", guideId: GUIDE })

    const { init } = callOf(fetchMock)
    expect(init.method).toBe("PUT")
    expect(JSON.parse(String(init.body))).toEqual({
      body: "   ",
      chapterId: "01-x",
      guideId: GUIDE,
    })
  })
})
