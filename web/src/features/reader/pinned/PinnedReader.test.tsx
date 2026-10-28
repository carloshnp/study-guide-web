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
// The same for pictures placed in the text, by caption (the marker's `data-alt`).
let anchorTops: Record<string, number> = {}

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
  anchorTops = {}
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const top =
      this.dataset.slot === "pinned-text"
        ? 0
        : this.hasAttribute("data-pinned-anchor")
          ? (anchorTops[this.dataset.alt ?? ""] ?? 0)
          : (tops[this.id] ?? 0)
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

  it("hides the scroll bars of both panes but keeps them scrollable", async () => {
    const { container } = renderReader()
    scrollTo({ s1: 10, s2: 1000, "termos-introduzidos": 2000 }, container)
    await screen.findByRole("img", { name: "figura-3-1" })

    const text = container.querySelector('[data-slot="pinned-text"]')
    const aside = container.querySelector('[data-slot="pinned-left"]')
    expect(text).toHaveClass("no-scrollbar", "overflow-y-auto")
    expect(aside).toHaveClass("no-scrollbar", "xl:overflow-y-auto")
  })

  it("gives the text the same margin on both sides so it sits centred beside the picture", () => {
    const { container } = renderReader()
    const text = container.querySelector('[data-slot="pinned-text"]')

    expect(text).toHaveClass("md:px-8")
    expect(text).not.toHaveClass("md:ps-8")
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

const PLACED_SECTIONS: ChapterSection[] = [
  { id: "s1", level: 2, parentId: null, title: "3.1 Primeira" },
  { id: "s2", level: 2, parentId: null, title: "3.2 Segunda" },
]

/** A marker as `PinnedAnchor` renders it: the picture stays in the text as a zero-height place. */
function marker(alt: string) {
  return (
    <span
      aria-hidden="true"
      data-alt={alt}
      data-pinned-anchor=""
      data-src={`/media/${alt}/1280.webp`}
    />
  )
}

function placedReader() {
  return render(
    <PinnedReader
      header={<header>cabeçalho</header>}
      images={[image("fig-a"), image("fig-b"), image("fig-d"), image("fig-c")]}
      sectionImages={{}}
      sections={PLACED_SECTIONS}
    >
      <article>
        <h2 id="s1">3.1 Primeira</h2>
        {marker("fig-a")}
        <p>texto</p>
        {marker("fig-b")}
        <p>texto</p>
        {marker("fig-d")}
        <h2 id="s2">3.2 Segunda</h2>
        {marker("fig-c")}
      </article>
    </PinnedReader>,
  )
}

describe("PinnedReader pictures placed in the text", () => {
  it("shows the picture of the last place the reader has reached in the section", async () => {
    const { container } = placedReader()

    anchorTops = { "fig-a": 50, "fig-b": 600, "fig-d": 700, "fig-c": 1600 }
    scrollTo({ s1: 10, s2: 1500 }, container)
    expect(await screen.findByRole("img", { name: "fig-a" })).toBeInTheDocument()

    anchorTops = { "fig-a": 50, "fig-b": 40, "fig-d": 700, "fig-c": 1600 }
    scrollTo({ s1: 10, s2: 1500 }, container)
    expect(await screen.findByRole("img", { name: "fig-b" })).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "fig-a" })).toBeNull()
  })

  it("starts the next section with its first picture", async () => {
    const { container } = placedReader()

    anchorTops = { "fig-a": 50, "fig-b": 40, "fig-d": 60, "fig-c": 900 }
    scrollTo({ s1: 10, s2: 20 }, container)

    expect(await screen.findByRole("img", { name: "fig-c" })).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "fig-d" })).toBeNull()
  })

  it("lets the arrows pick a picture until the reader reaches the next one", async () => {
    const { container } = placedReader()

    anchorTops = { "fig-a": 50, "fig-b": 600, "fig-d": 700, "fig-c": 1600 }
    scrollTo({ s1: 10, s2: 1500 }, container)
    expect(await screen.findByRole("img", { name: "fig-a" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Próxima imagem" }))
    expect(screen.getByRole("img", { name: "fig-b" })).toBeInTheDocument()

    // Scrolling that does not reach the next place keeps the chosen picture.
    scrollTo({ s1: 10, s2: 1500 }, container)
    expect(screen.getByRole("img", { name: "fig-b" })).toBeInTheDocument()

    // Reaching the next place hands the pane back to the text.
    anchorTops = { "fig-a": 50, "fig-b": 40, "fig-d": 60, "fig-c": 1600 }
    scrollTo({ s1: 10, s2: 1500 }, container)
    expect(await screen.findByRole("img", { name: "fig-d" })).toBeInTheDocument()
  })
})

describe("PinnedReader deep link (anchor)", () => {
  let offsets: Record<string, number>
  let resize: (() => void) | null

  // Heading tops depend on the pane's scroll, like a real layout: the heading's
  // distance from the pane top shrinks as the pane scrolls down.
  function paneScroll(): number {
    return (document.querySelector('[data-slot="pinned-text"]') as HTMLElement | null)?.scrollTop ?? 0
  }

  function renderAnchored(anchor: string) {
    return render(
      <PinnedReader
        anchor={anchor}
        header={<header>cabeçalho</header>}
        sectionImages={IMAGES}
        sections={SECTIONS}
      >
        <article>
          <h2 id="s1">3.1 Primeira</h2>
          <h2 id="s2">3.2 Segunda</h2>
          <h2 id="termos-introduzidos">Termos introduzidos</h2>
        </article>
      </PinnedReader>,
    )
  }

  beforeEach(() => {
    offsets = { s1: 500, s2: 1500, "termos-introduzidos": 2500 }
    resize = null
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const top =
        this.dataset.slot === "pinned-text" ? 0 : (offsets[this.id] ?? 0) - paneScroll()
      return { bottom: top, height: 0, left: 0, right: 0, toJSON: () => ({}), top, width: 0, x: 0, y: top }
    })
    // A 768px pane whose text is 5000px tall: without a layout, the pane would
    // read as scrolled to its end and pick the last section.
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return this.dataset.slot === "pinned-text" ? 768 : 0
      },
    })
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.dataset.slot === "pinned-text" ? 5000 : 0
      },
    })
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe() {}
        disconnect() {}
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight
  })

  it("puts the section named in the URL at the top of the text pane and marks it active", () => {
    const { container } = renderAnchored("s2")

    const pane = container.querySelector('[data-slot="pinned-text"]') as HTMLElement
    expect(pane.scrollTop).toBe(1500)
    expect(container.querySelector('[data-slot="pinned-reader"]')?.getAttribute("data-active-section")).toBe("s2")
  })

  it("keeps placing that heading while the text above it grows, and stops once the reader scrolls", () => {
    const { container } = renderAnchored("s2")
    const pane = container.querySelector('[data-slot="pinned-text"]') as HTMLElement
    expect(pane.scrollTop).toBe(1500)

    // A figure above the heading loads and pushes it 1100px further down.
    offsets.s2 = 2600
    act(() => {
      resize?.()
    })
    expect(pane.scrollTop).toBe(2600)

    // The reader takes over: a later change of layout must not move the pane.
    fireEvent.wheel(pane)
    offsets.s2 = 3000
    act(() => {
      resize?.()
    })
    expect(pane.scrollTop).toBe(2600)
  })
})
