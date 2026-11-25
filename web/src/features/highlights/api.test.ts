import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api"

import { highlightsApi, type Highlight } from "./api"

function makeResponse(payload: unknown, status = 200) {
  const body = status === 204 ? "" : JSON.stringify(payload)
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => body,
  } as unknown as Response
}

const SAMPLE: Highlight = {
  chapterId: "02-distribuicao",
  color: "yellow",
  createdAt: "2026-11-25T12:00:00Z",
  endOffset: 144,
  exact: "tensão cisalhante máxima",
  guideId: "torcao",
  id: 7,
  prefix: "A ",
  sectionId: "tensao-maxima",
  startOffset: 120,
  suffix: " ocorre na superfície.",
  updatedAt: "2026-11-25T12:00:00Z",
  variant: "full",
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("highlightsApi", () => {
  it("lists, creates, recolors, and deletes highlights against /api/highlights", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/highlights?guideId=torcao&chapterId=02-distribuicao&variant=resumo") {
        expect(init?.method).toBe("GET")
        return makeResponse({ highlights: [{ ...SAMPLE, variant: "resumo" }] })
      }
      if (url === "/api/highlights" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          chapterId: "02-distribuicao",
          color: "yellow",
          endOffset: 144,
          exact: "tensão cisalhante máxima",
          guideId: "torcao",
          prefix: "A ",
          sectionId: "tensao-maxima",
          startOffset: 120,
          suffix: " ocorre na superfície.",
          variant: "full",
        })
        return makeResponse(SAMPLE, 201)
      }
      if (url === "/api/highlights/7" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({ color: "pink" })
        return makeResponse({ ...SAMPLE, color: "pink" })
      }
      if (url === "/api/highlights/7" && init?.method === "DELETE") {
        return makeResponse(null, 204)
      }
      return makeResponse({ detail: "Unexpected" }, 500)
    })
    vi.stubGlobal("fetch", fetchMock)

    const listed = await highlightsApi.listHighlights("torcao", "02-distribuicao", "resumo")
    expect(listed).toEqual([{ ...SAMPLE, variant: "resumo" }])

    const created = await highlightsApi.createHighlight({
      chapterId: "02-distribuicao",
      color: "yellow",
      endOffset: 144,
      exact: "tensão cisalhante máxima",
      guideId: "torcao",
      prefix: "A ",
      sectionId: "tensao-maxima",
      startOffset: 120,
      suffix: " ocorre na superfície.",
      variant: "full",
    })
    expect(created).toEqual(SAMPLE)

    const recolored = await highlightsApi.updateHighlightColor(7, "pink")
    expect(recolored.color).toBe("pink")

    await highlightsApi.deleteHighlight(7)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("throws ApiError on HTTP, network, or malformed payload failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(makeResponse({ detail: "Destaque não encontrado." }, 404)),
    )
    await expect(highlightsApi.deleteHighlight(999)).rejects.toMatchObject({
      message: "Destaque não encontrado.",
      name: "ApiError",
      status: 404,
    })

    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("offline")))
    await expect(highlightsApi.listHighlights("torcao", "02-distribuicao")).rejects.toBeInstanceOf(
      ApiError,
    )

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(makeResponse({ highlights: [{ bad: true }] })))
    await expect(highlightsApi.listHighlights("torcao", "02-distribuicao")).rejects.toBeInstanceOf(
      ApiError,
    )
  })
})
