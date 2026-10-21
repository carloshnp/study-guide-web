import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MarkdownRenderer } from "./MarkdownRenderer"
import type { ChapterImage, ChapterSection } from "@/lib/content"

const SECTIONS: ChapterSection[] = [
  { id: "11-obtencao-e-viabilidade-comercial", level: 2, parentId: null, title: "1.1 Obtenção e viabilidade comercial" },
  { id: "111-custo-energetico", level: 3, parentId: "11-obtencao-e-viabilidade-comercial", title: "1.1.1 Custo energético" },
  { id: "termos-introduzidos", level: 4, parentId: null, title: "Termos introduzidos" },
]

function renderMarkdown(
  markdown: string,
  options: {
    sections?: ChapterSection[]
    images?: ChapterImage[]
    withChapterIdentity?: boolean
  } = {},
) {
  const { sections = [], images = [], withChapterIdentity = false } = options
  const view = render(
    <MemoryRouter>
      <MarkdownRenderer
        chapterSlug={withChapterIdentity ? "01-o-aluminio" : undefined}
        guideId={withChapterIdentity ? "aluminio" : undefined}
        images={images}
        markdown={markdown}
        sections={sections}
      />
    </MemoryRouter>,
  )
  return { container: view.container }
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ count: 0, guideId: "aluminio", units: {} }),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("MarkdownRenderer", () => {
  it("renders inline and display math through KaTeX", () => {
    const { container } = renderMarkdown(
      ["A entalpia é $\\Delta H = -394\\ \\text{kJ/mol}$ no caso base.", "", "$$", "E = mc^2", "$$"].join(
        "\n",
      ),
    )

    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2)
    expect(container.querySelector(".katex-display")).not.toBeNull()
  })

  it("keeps display math inside a horizontally scrollable block", () => {
    const { container } = renderMarkdown("$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$")

    const block = container.querySelector('[data-slot="math-display"]')
    expect(block).not.toBeNull()
    expect(block).toHaveClass("katex-display")
    expect(block).toHaveClass("overflow-x-auto")
    expect(block?.querySelector(".katex")).not.toBeNull()
  })

  it("treats a one-line $$…$$ paragraph as display math too", () => {
    const { container } = renderMarkdown("$$\\boxed{\\sigma = \\sigma_0 + \\sigma_{ss}}$$")

    const block = container.querySelector('[data-slot="math-display"]')
    expect(block).not.toBeNull()
    expect(block).toHaveClass("katex-display")
    // The hast node must not leak onto the DOM as a prop.
    expect(container.innerHTML).not.toContain("[object Object]")
  })

  it("anchors headings to their section ids and mounts a progress check", () => {
    renderMarkdown(
      ["## 1.1 Obtenção e viabilidade comercial", "", "Texto.", "", "### 1.1.1 Custo energético"].join(
        "\n",
      ),
      { sections: SECTIONS, withChapterIdentity: true },
    )

    const h2 = screen.getByRole("heading", { level: 2, name: /Obtenção e viabilidade/ })
    expect(h2).toHaveAttribute("id", "11-obtencao-e-viabilidade-comercial")

    const h3 = screen.getByRole("heading", { level: 3, name: /Custo energético/ })
    expect(h3).toHaveAttribute("id", "111-custo-energetico")

    expect(
      screen.getByRole("checkbox", { name: 'Marcar "1.1 Obtenção e viabilidade comercial" como lido' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: 'Marcar "1.1.1 Custo energético" como lido' }),
    ).toBeInTheDocument()
  })

  it("renders headings without a check when the chapter identity is absent", () => {
    const { container } = renderMarkdown("## Sem identidade\n\nTexto.", { sections: SECTIONS })

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(container.querySelector("h2")).toHaveAttribute("id", expect.any(String))
  })

  it("links external references out and keeps app paths in the router", () => {
    renderMarkdown(
      "[portal](https://example.org/paper) e [capítulo 2](/g/aluminio/c/02-classificacao)",
    )

    const external = screen.getByRole("link", { name: "portal" })
    expect(external).toHaveAttribute("href", "https://example.org/paper")
    expect(external).toHaveAttribute("target", "_blank")
    expect(external).toHaveAttribute("rel", "noreferrer noopener")

    const internal = screen.getByRole("link", { name: "capítulo 2" })
    expect(internal).toHaveAttribute("href", "/g/aluminio/c/02-classificacao")
  })

  it("renders lists, callouts, inline code and rules through their components", () => {
    const { container } = renderMarkdown(
      [
        "- primeiro",
        "- segundo",
        "",
        "1. passo um",
        "2. passo dois",
        "",
        "> Uma nota de destaque.",
        "",
        "Use `tabulate()` para conferir.",
        "",
        "---",
        "",
        "Fim.",
      ].join("\n"),
    )

    expect(screen.getAllByRole("list")).toHaveLength(2)
    expect(screen.getAllByRole("listitem")).toHaveLength(4)

    const callout = container.querySelector('[data-slot="callout"]')
    expect(callout?.tagName).toBe("BLOCKQUOTE")
    expect(callout).toHaveTextContent("Uma nota de destaque.")

    const inline = container.querySelector('[data-slot="inline-code"]')
    expect(inline?.tagName).toBe("CODE")
    expect(inline).toHaveTextContent("tabulate()")

    expect(container.querySelector("hr")).not.toBeNull()
  })

  it("renders footnotes with a back reference", () => {
    const { container } = renderMarkdown(
      ["Uma afirmação com nota.[^1]", "", "[^1]: A fonte é o slide 12."].join("\n"),
    )

    const ref = container.querySelector('a[data-footnote-ref="true"]')
    expect(ref).not.toBeNull()

    const footnotes = container.querySelector('[data-footnotes="true"]')
    expect(footnotes).toHaveTextContent("A fonte é o slide 12.")
    expect(footnotes?.querySelector('a[data-footnote-backref="true"], a[data-footnote-backref]')).not.toBeNull()
    expect(within(footnotes as HTMLElement).getByRole("heading", { level: 2 })).toBeInTheDocument()
  })

  it("renders a figure with alt-derived caption and no raw html escape hatch", () => {
    const images: ChapterImage[] = [
      {
        src: "/media/abc/1280.webp",
        srcset: "/media/abc/640.webp 640w, /media/abc/1280.webp 1280w",
        width: 1280,
        height: 720,
        alt: "Diagrama de equilíbrio Al-Cu",
        original: "/media/abc/original.png",
      },
    ]

    const { container } = renderMarkdown("![Diagrama de equilíbrio Al-Cu](/media/abc/1280.webp)", {
      images,
    })

    expect(container.querySelector("figure")).not.toBeNull()
    expect(container.querySelector("figcaption")).toHaveTextContent("Diagrama de equilíbrio Al-Cu")
  })
})
