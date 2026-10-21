import { render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ChapterJson, GuideJson } from "@/lib/content"
import { resetContentCache } from "@/lib/content"
import { resetProgressStore } from "@/features/progress/useProgress"
import { Chapter } from "./Chapter"

const GUIDE: GuideJson = {
  id: "aluminio",
  title: "Alumínio",
  subject: "metalurgia",
  type: "teoria",
  meta: {
    discipline: "EET 428",
    professor: "Luiz Henrique de Almeida",
    sources: ["aula 1.pdf"],
    generated: "2026-09-21",
  },
  cover: { markdown: "# Alumínio\n\n## Índice\n" },
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
      id: "02-classificacao",
      kind: "teoria",
      number: 2,
      part: null,
      sections: [],
      slug: "02-classificacao",
      title: "Classificação das ligas de alumínio",
    },
    {
      id: "03-nomenclatura",
      kind: "teoria",
      number: 3,
      part: null,
      sections: [],
      slug: "03-nomenclatura",
      title: "Nomenclatura das ligas de alumínio",
    },
  ],
}

const CHAPTER: ChapterJson = {
  ...GUIDE.chapters[0],
  guideId: "aluminio",
  id: "01-o-aluminio",
  images: [],
  markdown: [
    "## 1. O alumínio como metal de engenharia",
    "",
    "O alumínio é o metal não ferroso mais usado depois do ferro.",
    "",
    "### 1.1 Obtenção",
    "",
    "A obtenção parte da bauxita.",
  ].join("\n"),
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
      if (path === "/content/guides/aluminio/chapters/01-o-aluminio.json") {
        return jsonResponse(CHAPTER)
      }
      if (path.startsWith("/api/progress")) {
        return jsonResponse({ count: 0, guideId: "aluminio", units: {} })
      }
      return jsonResponse({}, 404)
    }),
  )
}

function renderChapter(path = "/g/aluminio/c/01-o-aluminio") {
  const router = createMemoryRouter(
    [
      { path: "/g/:guideId", element: <div>guia</div> },
      { path: "/g/:guideId/c/:chapterSlug", element: <Chapter /> },
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

describe("Chapter route", () => {
  it("renders the chapter number kicker, the h1 and the markdown body", async () => {
    const { container } = renderChapter()

    expect(await screen.findByRole("heading", { level: 1, name: GUIDE.chapters[0].title })).toBeInTheDocument()
    expect(screen.getByText(/capítulo 1/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(container.querySelector('[data-slot="reader-prose"]')).not.toBeNull()
    })
    expect(screen.getByText(/metal não ferroso mais usado/i)).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "1.1 Obtenção" })).toBeInTheDocument()
  })

  it("keeps the heading hierarchy sequential from the page h1 down", async () => {
    const { container } = renderChapter()

    await waitFor(() => {
      expect(container.querySelector('[data-slot="reader-prose"]')).not.toBeNull()
    })

    const levels = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
      Number(heading.tagName.slice(1)),
    )
    expect(levels[0]).toBe(1)
    // No heading on the page is more than one level deeper than the one before it.
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1)
    }
  })

  it("does not repeat the chapter title inside the body", async () => {
    const { container } = renderChapter()

    await waitFor(() => {
      expect(container.querySelector('[data-slot="reader-prose"]')).not.toBeNull()
    })

    const h1s = screen.getAllByRole("heading", { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(screen.queryByRole("heading", { level: 2, name: /^1\. O alumínio/ })).not.toBeInTheDocument()
  })

  it("links back to the guide and to the neighbouring chapters with their titles", async () => {
    renderChapter()

    await screen.findByRole("heading", { level: 1, name: GUIDE.chapters[0].title })

    const back = screen.getByRole("link", { name: /voltar ao guia/i })
    expect(back).toHaveAttribute("href", "/g/aluminio")

    const next = await screen.findByRole("link", { name: /classificação das ligas/i })
    expect(next).toHaveAttribute("href", "/g/aluminio/c/02-classificacao")

    expect(screen.getByText(/^anterior$/i)).toBeInTheDocument()
  })

  it("shows the in-page table of contents at 1280px and up", async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes("1280px"),
      media: query,
    })) as typeof window.matchMedia

    try {
      renderChapter()

      const nav = await screen.findByRole("navigation", { name: /neste capítulo/i })
      const links = within(nav).getAllByRole("link")

      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "#11-obtencao",
        "#12-propriedades",
      ])
    } finally {
      window.matchMedia = original
    }
  })

  it("reports a chapter that does not exist without inventing content", async () => {
    const { container } = renderChapter("/g/aluminio/c/99-inexistente")

    expect(await screen.findByRole("status")).toHaveTextContent(/não encontrado/i)
    expect(screen.queryByText("99-inexistente")).not.toBeNull()
    expect(container.querySelector('[data-slot="reader-prose"]')).toBeNull()
  })
})
