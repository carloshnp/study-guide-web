import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Highlight } from "./api"
import { HighlightLayer } from "./HighlightLayer"

function makeResponse(payload: unknown, status = 200) {
  const body = status === 204 ? "" : JSON.stringify(payload)
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => body,
  } as unknown as Response
}

class FakeHighlight extends Set<AbstractRange> {
  constructor(...ranges: AbstractRange[]) {
    super(ranges)
  }
}

let highlightRegistry: Map<string, FakeHighlight>

beforeEach(() => {
  highlightRegistry = new Map<string, FakeHighlight>()
  vi.stubGlobal("Highlight", FakeHighlight)
  vi.stubGlobal("CSS", { highlights: highlightRegistry })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("HighlightLayer", () => {
  it("loads highlights, skips .katex-mathml duplicates, restores drifted quotes, and cleans up on unmount", async () => {
    const saved: Highlight[] = [
      {
        chapterId: "02-distribuicao",
        color: "yellow",
        createdAt: "2026-11-25T12:00:00Z",
        endOffset: 999, // intentionally stale offset so prefix+exact+suffix fallback runs
        exact: "máxima",
        guideId: "torcao",
        id: 1,
        prefix: "tensão ",
        sectionId: "tensao",
        startOffset: 993,
        suffix: " ocorre na borda.",
        updatedAt: "2026-11-25T12:00:00Z",
        variant: "full",
      },
    ]

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => makeResponse({ highlights: saved })),
    )

    const { unmount } = render(
      <HighlightLayer
        chapterId="02-distribuicao"
        contentKey="v1"
        guideId="torcao"
        onRequestCreateCard={vi.fn()}
        sections={[{ id: "tensao" }]}
        variant="full"
      >
        <article data-slot="reader-prose">
          <h2 id="tensao">Tensão</h2>
          <p>
            A fórmula{" "}
            <span className="katex">
              <span className="katex-mathml">{"\\tau = Tc/J máxima"}</span>
              <span className="katex-html">τ=Tc/J</span>
            </span>{" "}
            dá a tensão máxima ocorre na borda.
          </p>
        </article>
      </HighlightLayer>,
    )

    await waitFor(() => {
      const yellow = highlightRegistry.get("hl-yellow")
      expect(yellow?.size).toBe(1)
    })

    const range = Array.from(highlightRegistry.get("hl-yellow")!)[0] as Range
    expect(range.toString()).toBe("máxima")

    unmount()
    expect(highlightRegistry.has("hl-yellow")).toBe(false)
  })

  it("creates, recolors, and deletes a highlight via swatch bar and click popover", async () => {
    const user = userEvent.setup()
    let nextId = 10
    const createdBodies: Record<string, unknown>[] = []
    const patchedBodies: Record<string, unknown>[] = []
    const deletedIds: number[] = []

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith("/api/highlights?") && init?.method === "GET") {
        return makeResponse({ highlights: [] })
      }
      if (url === "/api/highlights" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>
        createdBodies.push(body)
        return makeResponse(
          {
            ...body,
            createdAt: "2026-11-25T12:00:00Z",
            id: nextId++,
            updatedAt: "2026-11-25T12:00:00Z",
          },
          201,
        )
      }
      const patchMatch = /^\/api\/highlights\/(\d+)$/.exec(url)
      if (patchMatch && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>
        patchedBodies.push(body)
        return makeResponse({
          ...(createdBodies[0] ?? {}),
          color: body.color,
          createdAt: "2026-11-25T12:00:00Z",
          id: Number(patchMatch[1]),
          updatedAt: "2026-11-25T12:01:00Z",
        })
      }
      if (patchMatch && init?.method === "DELETE") {
        deletedIds.push(Number(patchMatch[1]))
        return makeResponse(null, 204)
      }
      return makeResponse({ detail: "Unexpected" }, 500)
    })
    vi.stubGlobal("fetch", fetchMock)

    const { container } = render(
      <HighlightLayer
        chapterId="02-distribuicao"
        contentKey="v1"
        guideId="torcao"
        onRequestCreateCard={vi.fn()}
        sections={[{ id: "tensao" }]}
        variant="resumo"
      >
        <article data-slot="reader-prose">
          <h2 id="tensao">Tensão</h2>
          <p>A camada passiva protege o metal contra corrosão.</p>
        </article>
      </HighlightLayer>,
    )

    const paragraph = container.querySelector("p")!
    const textNode = paragraph.firstChild as Text
    const range = document.createRange()
    range.setStart(textNode, 2)
    range.setEnd(textNode, 16) // "camada passiva"

    // Give Ranges a non-zero hit rect in jsdom so click hit-testing works.
    const hitRect = {
      bottom: 140,
      height: 20,
      left: 50,
      right: 180,
      top: 120,
      width: 130,
      x: 50,
      y: 120,
      toJSON: () => ({}),
    } as DOMRect
    vi.spyOn(Range.prototype, "getClientRects").mockReturnValue([hitRect] as unknown as DOMRectList)
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(hitRect)

    const selectionSpy = vi.spyOn(window, "getSelection").mockReturnValue({
      anchorNode: textNode,
      focusNode: textNode,
      getRangeAt: () => range,
      isCollapsed: false,
      rangeCount: 1,
      removeAllRanges: vi.fn(),
      toString: () => "camada passiva",
    } as unknown as Selection)

    fireEvent.mouseUp(document)
    await user.click(await screen.findByRole("button", { name: /destacar em verde/i }))

    await waitFor(() => {
      expect(createdBodies).toHaveLength(1)
    })
    expect(createdBodies[0]).toMatchObject({
      chapterId: "02-distribuicao",
      color: "green",
      exact: "camada passiva",
      guideId: "torcao",
      sectionId: "tensao",
      variant: "resumo",
    })
    expect(highlightRegistry.get("hl-green")?.size).toBe(1)

    // Collapse selection so clicking the painted highlight opens the popover.
    selectionSpy.mockReturnValue({
      anchorNode: null,
      focusNode: null,
      isCollapsed: true,
      rangeCount: 0,
      removeAllRanges: vi.fn(),
      toString: () => "",
    } as unknown as Selection)

    fireEvent.click(paragraph, { clientX: 80, clientY: 130 })

    const dialog = await screen.findByRole("dialog", { name: /editar destaque/i })
    expect(dialog).toBeInTheDocument()

    // Recolor from green to blue.
    await user.click(screen.getByRole("button", { name: /mudar para azul/i }))
    await waitFor(() => {
      expect(patchedBodies).toEqual([{ color: "blue" }])
    })
    expect(highlightRegistry.has("hl-green")).toBe(false)
    expect(highlightRegistry.get("hl-blue")?.size).toBe(1)

    // Delete the highlight.
    fireEvent.click(paragraph, { clientX: 80, clientY: 130 })
    await screen.findByRole("dialog", { name: /editar destaque/i })
    await user.click(screen.getByRole("button", { name: /remover destaque/i }))

    await waitFor(() => {
      expect(deletedIds).toEqual([10])
    })
    expect(highlightRegistry.has("hl-blue")).toBe(false)
  })

  it("rolls back optimistic highlights when the API fails and degrades safely without CSS.highlights", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("CSS", {})
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.startsWith("/api/highlights?") && init?.method === "GET") {
          return makeResponse({ highlights: [] })
        }
        return makeResponse({ detail: "Erro interno" }, 500)
      }),
    )

    const { container } = render(
      <HighlightLayer
        chapterId="02-distribuicao"
        contentKey="v1"
        guideId="torcao"
        onRequestCreateCard={vi.fn()}
        variant="full"
      >
        <article data-slot="reader-prose">
          <p>Texto estável para teste de rollback.</p>
        </article>
      </HighlightLayer>,
    )

    const textNode = container.querySelector("p")!.firstChild as Text
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 13)
    vi.spyOn(window, "getSelection").mockReturnValue({
      anchorNode: textNode,
      focusNode: textNode,
      getRangeAt: () => range,
      isCollapsed: false,
      rangeCount: 1,
      removeAllRanges: vi.fn(),
      toString: () => "Texto estável",
    } as unknown as Selection)

    fireEvent.mouseUp(document)
    await user.click(await screen.findByRole("button", { name: /destacar em amarelo/i }))

    expect(await screen.findByRole("status")).toHaveTextContent(
      /não foi possível salvar o destaque/i,
    )
  })
})
