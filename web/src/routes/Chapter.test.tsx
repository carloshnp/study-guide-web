import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ChapterJson, GuideJson } from "@/lib/content"
import { resetContentCache } from "@/lib/content"
import { resetLayoutStore, setLayoutReaderView } from "@/features/preferences/layout"
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

let chapterPayload: ChapterJson = CHAPTER

function stubContent() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === "/content/guides/aluminio/guide.json") {
        return jsonResponse(GUIDE)
      }
      if (path === "/api/flashcards/notes") {
        const payload =
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as Record<string, unknown>)
            : {}
        return jsonResponse({
          chapterSlug: "01-o-aluminio",
          guideId: "aluminio",
          id: 42,
          sectionId: null,
          sourceSnippet: null,
          tags: "",
          ...payload,
        })
      }
      if (path === "/content/guides/aluminio/chapters/01-o-aluminio.json") {
        return jsonResponse(chapterPayload)
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
  window.localStorage.clear()
  resetLayoutStore()
  chapterPayload = CHAPTER
  resetContentCache()
  resetProgressStore()
  stubContent()
})

afterEach(() => {
  window.localStorage.clear()
  resetLayoutStore()
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

  it("opens the pre-filled editor from a selected passage", async () => {
    const user = userEvent.setup()
    const { container } = renderChapter()

    await waitFor(() => {
      expect(container.querySelector('[data-slot="reader-prose"]')).not.toBeNull()
    })

    const paragraph = container.querySelector('[data-slot="reader-prose"] p')
    const selected = "O alumínio é o metal não ferroso mais usado depois do ferro."
    const range = {
      getBoundingClientRect: () => ({
        bottom: 220,
        height: 20,
        left: 60,
        right: 320,
        top: 200,
        width: 260,
      }),
    }
    vi.spyOn(window, "getSelection").mockReturnValue({
      anchorNode: paragraph?.firstChild,
      focusNode: paragraph?.firstChild,
      getRangeAt: () => range,
      isCollapsed: false,
      rangeCount: 1,
      removeAllRanges: vi.fn(),
      toString: () => selected,
    } as unknown as Selection)

    try {
      fireEvent.mouseUp(document)
      await user.click(await screen.findByRole("button", { name: /criar card/i }))

      const editor = await screen.findByRole("dialog")
      expect(within(editor).getByRole("textbox", { name: "Frente" })).toHaveValue(selected)
      expect(within(editor).getByText("Trecho de origem")).toBeInTheDocument()
      expect(within(editor).getByText(/aluminio › 01-o-aluminio/)).toBeInTheDocument()
      expect(within(editor).getAllByText(selected).length).toBeGreaterThan(0)

      // The selection fills the front; the answer is the user's own words.
      await user.type(
        within(editor).getByRole("textbox", { name: "Resposta" }),
        "Metal não ferroso mais usado depois do ferro.",
      )
      await user.click(within(editor).getByRole("button", { name: /salvar card/i }))
      expect(await screen.findByText(/Card criado/)).toBeInTheDocument()
    } finally {
      vi.restoreAllMocks()
    }
  })

  it("reports a chapter that does not exist without inventing content", async () => {
    const { container } = renderChapter("/g/aluminio/c/99-inexistente")

    expect(await screen.findByRole("status")).toHaveTextContent(/não encontrado/i)
    expect(screen.queryByText("99-inexistente")).not.toBeNull()
    expect(container.querySelector('[data-slot="reader-prose"]')).toBeNull()
  })

  describe("pinned image view", () => {
    const WITH_IMAGES: ChapterJson = {
      ...CHAPTER,
      sectionImages: {
        "11-obtencao": [
          {
            alt: "Infográfico da obtenção do alumínio",
            height: 720,
            original: "/media/abc/original.jpg",
            src: "/media/abc/1280.webp",
            srcset: null,
            width: 1280,
          },
        ],
      },
    }

    it("keeps the continuous text, without the picture, while the setting is off", async () => {
      chapterPayload = WITH_IMAGES
      const { container } = renderChapter()

      await waitFor(() => {
        expect(container.querySelector('[data-slot="reader-prose"]')).not.toBeNull()
      })
      expect(container.querySelector('[data-slot="pinned-reader"]')).toBeNull()
      expect(screen.queryByRole("img", { name: /infográfico da obtenção/i })).toBeNull()
    })

    it("pins the picture beside the text once the setting is on", async () => {
      setLayoutReaderView("pinned")
      chapterPayload = WITH_IMAGES
      const { container } = renderChapter()

      await waitFor(() => {
        expect(container.querySelector('[data-slot="reader-prose"]')).not.toBeNull()
      })
      expect(container.querySelector('[data-slot="pinned-reader"]')).not.toBeNull()
      expect(screen.getByRole("heading", { level: 1, name: GUIDE.chapters[0].title })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /voltar ao guia/i })).toHaveAttribute(
        "href",
        "/g/aluminio",
      )
      expect(await screen.findByRole("img", { name: /infográfico da obtenção/i })).toBeInTheDocument()
      // The same article as the classic view: heading, text and neighbour links.
      expect(screen.getByText(/a obtenção parte da bauxita/i)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /classificação das ligas/i })).toBeInTheDocument()
    })

    it("falls back to the continuous text for a chapter without pinned pictures", async () => {
      setLayoutReaderView("pinned")
      const { container } = renderChapter()

      await waitFor(() => {
        expect(container.querySelector('[data-slot="reader-prose"]')).not.toBeNull()
      })
      expect(container.querySelector('[data-slot="pinned-reader"]')).toBeNull()
      expect(screen.getByRole("heading", { level: 1, name: GUIDE.chapters[0].title })).toBeInTheDocument()
    })
  })
})
