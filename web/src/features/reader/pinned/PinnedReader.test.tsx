import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ChapterImage, ChapterSection, SectionImages } from "@/lib/content"
import { PinnedReader } from "./PinnedReader"

const SECTIONS: ChapterSection[] = [
  { id: "s1", level: 2, parentId: null, title: "3.1 Primeira" },
  { id: "s2", level: 2, parentId: null, title: "3.2 Segunda" },
  { id: "termos-introduzidos", level: 2, parentId: null, title: "Termos introduzidos" },
]

function image(alt: string): ChapterImage {
  return {
    alt,
    height: 720,
    original: `/media/${alt}/original.jpg`,
    src: `/media/${alt}/1280.webp`,
    srcset: null,
    width: 1280,
  }
}

const IMAGES: SectionImages = {
  s1: [image("figura-3-1")],
  s2: [image("figura-3-2a"), image("figura-3-2b")],
}

// jsdom has no layout: every measurement comes from this table (px from the viewport top).
let tops: Record<string, number> = {}

function renderReader() {
  return render(
    <PinnedReader header={<header>cabeçalho</header>} sectionImages={IMAGES} sections={SECTIONS}>
      <article>
        <h2 id="s1">3.1 Primeira</h2>
        <h2 id="s2">3.2 Segunda</h2>
        <h2 id="termos-introduzidos">Termos introduzidos</h2>
      </article>
    </PinnedReader>,
  )
}

function scrollTo(next: Record<string, number>, container: HTMLElement) {
  tops = next
  const pane = container.querySelector('[data-slot="pinned-text"]') as HTMLElement
  act(() => {
    fireEvent.scroll(pane)
  })
}

beforeEach(() => {
  tops = { s1: 500, s2: 1500, "termos-introduzidos": 2500 }
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const top = this.dataset.slot === "pinned-text" ? 0 : (tops[this.id] ?? 0)
    return { bottom: top, height: 0, left: 0, right: 0, toJSON: () => ({}), top, width: 0, x: 0, y: top }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("PinnedReader", () => {
  it("hides the image pane in the intro, before the first section", () => {
    const { container } = renderReader()

    expect(container.querySelector('[data-slot="pinned-image-pane"]')).toBeNull()
    expect(container.querySelector('[data-slot="pinned-reader"]')).toHaveAttribute(
      "data-active-section",
      "",
    )
    expect(screen.getByText("cabeçalho")).toBeInTheDocument()
  })

  it("pins the picture of the section that reached the reading line", async () => {
    const { container } = renderReader()

    scrollTo({ s1: 10, s2: 1000, "termos-introduzidos": 2000 }, container)
    expect(await screen.findByRole("img", { name: "figura-3-1" })).toBeInTheDocument()

    scrollTo({ s1: -900, s2: 20, "termos-introduzidos": 1000 }, container)
    expect(await screen.findByRole("img", { name: "figura-3-2a" })).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "figura-3-1" })).toBeNull()
  })

  it("lists the subchapters beside the picture and marks the current one", async () => {
    const { container } = renderReader()
    scrollTo({ s1: -900, s2: 20, "termos-introduzidos": 1000 }, container)

    const nav = await screen.findByRole("navigation", { name: /subcapítulos deste capítulo/i })
    expect(nav.querySelectorAll("a")).toHaveLength(3)
    expect(screen.getByRole("link", { name: "3.2 Segunda" })).toHaveAttribute(
      "aria-current",
      "location",
    )
    expect(screen.getByRole("link", { name: "3.1 Primeira" })).not.toHaveAttribute("aria-current")
  })

  it("hides the picture again on a section without one", async () => {
    const { container } = renderReader()
    scrollTo({ s1: 10, s2: 1000, "termos-introduzidos": 2000 }, container)
    await screen.findByRole("img", { name: "figura-3-1" })

    scrollTo({ s1: -2000, s2: -900, "termos-introduzidos": 30 }, container)
    await waitFor(() => {
      expect(container.querySelector('[data-slot="pinned-reader"]')).toHaveAttribute(
        "data-active-section",
        "termos-introduzidos",
      )
    })
    expect(container.querySelector('[data-slot="pinned-image-pane"]')).toBeNull()
  })

  it("offers previous/next buttons only for a section with several pictures", async () => {
    const { container } = renderReader()

    scrollTo({ s1: 10, s2: 1000, "termos-introduzidos": 2000 }, container)
    await screen.findByRole("img", { name: "figura-3-1" })
    expect(screen.queryByRole("button", { name: /próxima imagem/i })).toBeNull()

    scrollTo({ s1: -900, s2: 20, "termos-introduzidos": 1000 }, container)
    const next = await screen.findByRole("button", { name: /próxima imagem/i })
    fireEvent.click(next)
    expect(await screen.findByRole("img", { name: "figura-3-2b" })).toBeInTheDocument()
    expect(screen.getByText("2 / 2")).toBeInTheDocument()
  })

  it("starts again at the first picture when the reader comes back to a section", async () => {
    const { container } = renderReader()
    scrollTo({ s1: -900, s2: 20, "termos-introduzidos": 1000 }, container)
    fireEvent.click(await screen.findByRole("button", { name: /próxima imagem/i }))
    await screen.findByRole("img", { name: "figura-3-2b" })

    scrollTo({ s1: 10, s2: 1000, "termos-introduzidos": 2000 }, container)
    await screen.findByRole("img", { name: "figura-3-1" })
    scrollTo({ s1: -900, s2: 20, "termos-introduzidos": 1000 }, container)

    expect(await screen.findByRole("img", { name: "figura-3-2a" })).toBeInTheDocument()
  })

  it("keeps the chapter text in one scrolling pane with the chapter-body slot", () => {
    const { container } = renderReader()

    const pane = container.querySelector('[data-slot="pinned-text"]')
    expect(pane?.className).toContain("overflow-y-auto")
    expect(pane?.querySelector('[data-slot="chapter-body"] article')).not.toBeNull()
  })
})
