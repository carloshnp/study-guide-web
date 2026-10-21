import { render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { resetContentCache, type GuideJson } from "@/lib/content"
import { resetProgressStore } from "@/features/progress/useProgress"
import { Guide } from "./Guide"

const GUIDE: GuideJson = {
  id: "aluminio",
  title: "Alumínio",
  subject: "metalurgia",
  type: "teoria",
  meta: {
    discipline: "EET 428",
    professor: "Luiz Henrique de Almeida",
    sources: ["aula 1.pdf", "aula 2.pdf"],
    generated: "2026-09-21",
  },
  cover: {
    markdown: [
      "# Metalurgia Física das Ligas Não Ferrosas: Alumínio",
      "",
      "> Guia de estudo completo.",
      "",
      "## Índice",
      "",
      "1. [O alumínio como metal de engenharia](#1)",
    ].join("\n"),
  },
  chapters: [
    {
      id: "01-o-aluminio",
      kind: "teoria",
      number: 1,
      part: null,
      sections: [
        { id: "11-obtencao", level: 3, parentId: null, title: "1.1 Obtenção" },
        { id: "12-propriedades", level: 3, parentId: null, title: "1.2 Propriedades" },
      ],
      slug: "01-o-aluminio",
      title: "O alumínio como metal de engenharia",
    },
    {
      id: "02-banco",
      kind: "banco",
      number: 2,
      part: "Parte II: Exercícios",
      sections: [],
      slug: "02-banco",
      title: "Banco de Questões",
    },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  const body = JSON.stringify(payload)
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => body,
  }
}

function stubContent() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path === "/content/guides/aluminio/guide.json") {
        return jsonResponse(GUIDE)
      }
      if (path.startsWith("/api/progress")) {
        return jsonResponse({
          count: 1,
          guideId: "aluminio",
          units: { "aluminio/01-o-aluminio/11-obtencao": "done" },
        })
      }
      return jsonResponse({}, 404)
    }),
  )
}

function renderGuide(path = "/g/aluminio") {
  const router = createMemoryRouter(
    [
      { path: "/g/:guideId", element: <Guide /> },
      { path: "/g/:guideId/c/:chapterSlug", element: <div>capítulo</div> },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  resetContentCache()
  resetProgressStore()
  stubContent()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetContentCache()
  resetProgressStore()
})

describe("Guide route", () => {
  it("renders the title, source metadata and cover markdown", async () => {
    renderGuide()

    expect(await screen.findByRole("heading", { level: 1, name: "Alumínio" })).toBeInTheDocument()
    expect(screen.getByText("EET 428")).toBeInTheDocument()
    expect(screen.getByText(/Luiz Henrique de Almeida/)).toBeInTheDocument()

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /Metalurgia Física das Ligas Não Ferrosas/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Índice" })).toBeInTheDocument()
    expect(screen.getByText("Guia de estudo completo.")).toBeInTheDocument()
  })

  it("keeps a single h1 by demoting the cover's own heading", async () => {
    renderGuide()

    await screen.findByRole("heading", { level: 1, name: "Alumínio" })
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("lists chapters with kind labels and per-chapter progress", async () => {
    renderGuide()

    const list = await screen.findByRole("list", { name: /capítulos/i })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(2)

    const first = within(items[0])
    expect(first.getByRole("link")).toHaveAttribute("href", "/g/aluminio/c/01-o-aluminio")
    expect(first.getByText("Teoria")).toBeInTheDocument()
    expect(await first.findByText("1/2")).toBeInTheDocument()

    const second = within(items[1])
    expect(second.getByText("Banco de questões")).toBeInTheDocument()
    expect(await second.findByText("0/1")).toBeInTheDocument()
    expect(second.getByText(/Parte II/)).toBeInTheDocument()
  })

  it("shows the guide-wide meter from the same units", async () => {
    renderGuide()

    const meter = await screen.findByRole("meter")
    await waitFor(() => {
      expect(meter).toHaveAttribute("aria-valuenow", "1")
    })
    expect(meter).toHaveAttribute("aria-valuemax", "3")
  })

  it("reports a guide that does not exist and offers the shelf", async () => {
    renderGuide("/g/nao-existe")

    expect(await screen.findByRole("status")).toHaveTextContent(/não encontrado/i)
    expect(screen.getByRole("link", { name: /estantes/i })).toHaveAttribute("href", "/estantes")
  })
})
