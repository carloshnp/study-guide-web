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
    const annotations = Array.from(
      container.querySelectorAll('annotation[encoding="application/x-tex"]'),
    ).map((el) => el.textContent ?? "")
    expect(annotations.some((tex) => tex.startsWith("\\displaystyle "))).toBe(true)
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

  it("renders Obsidian callouts with distinct tones, inline math titles, and display math bodies", () => {
    const { container } = renderMarkdown(
      [
        "> [!theorem] Regra $1/3$ de Simpson",
        "> **Hipóteses:** seja $f \\in C^4([a, b])$. Então o erro local satisfaz:",
        ">",
        "> $$",
        "> \\begin{align}",
        "> E_S &= -\\frac{f^{(4)}(\\xi)}{90} h^5",
        "> \\end{align}",
        "> $$",
        "",
        "> [!proof]",
        "> **Ideia da prova:** expandir $f$ em torno do ponto médio.",
        "",
        "> [!warning] Paridade obrigatória",
        "> Nunca aplique Simpson composta com $n$ ímpar.",
        "",
        "> [!summary] Em resumo",
        "> * Item 1.",
        "> * Item 2.",
      ].join("\n"),
    )

    const theorem = container.querySelector('[data-callout-type="theorem"]')
    expect(theorem).not.toBeNull()
    expect(theorem).toHaveAttribute("data-callout-tone", "purple")
    expect(theorem?.querySelector(".reader-callout-title .katex")).not.toBeNull()
    expect(theorem?.querySelector('[data-slot="math-display"] .katex')).not.toBeNull()
    expect(theorem?.textContent).not.toContain("[!theorem]")

    const proof = container.querySelector('[data-callout-type="proof"]')
    expect(proof).toHaveAttribute("data-callout-tone", "green")
    expect(proof?.querySelector(".reader-callout-title")).toHaveTextContent("Demonstração")
    expect(proof).toHaveTextContent("Ideia da prova:")

    const warning = container.querySelector('[data-callout-type="warning"]')
    expect(warning).toHaveAttribute("data-callout-tone", "amber")

    const summary = container.querySelector('[data-callout-type="summary"]')
    expect(summary).toHaveAttribute("data-callout-tone", "blue")
    expect(within(summary as HTMLElement).getAllByRole("listitem")).toHaveLength(2)
  })

  it("renders Obsidian obs callouts always expanded even when a fold suffix is present", () => {
    const { container } = renderMarkdown(
      [
        "> [!obs] Lembrando: Resto de Lagrange",
        "> Para $f \\in C^2$, vale $f(x) - p_1(x) = \\frac{f''(\\xi)}{2}(x - a)(x - b)$.",
        "",
        "> [!obs]- Nota com sufixo legado",
        "> Corpo permanece sempre visível no leitor.",
      ].join("\n"),
    )

    const callouts = container.querySelectorAll('[data-callout-type="obs"]')
    expect(callouts).toHaveLength(2)

    const first = callouts[0] as HTMLElement
    expect(first).toHaveAttribute("data-callout-tone", "teal")
    expect(first.querySelector(".reader-callout-title")).toHaveTextContent(
      "Lembrando: Resto de Lagrange",
    )
    expect(first.querySelector(".reader-callout-body .katex")).not.toBeNull()

    const second = callouts[1] as HTMLElement
    expect(second.querySelector(".reader-callout-title")).toHaveTextContent(
      "Nota com sufixo legado",
    )
    expect(second).toHaveTextContent("Corpo permanece sempre visível no leitor.")
    expect(second.textContent).not.toContain("[!obs]-")
  })
})
