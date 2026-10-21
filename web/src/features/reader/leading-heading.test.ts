import { describe, expect, it } from "vitest"

import { normalizeLeadingHeading, prepareChapterBody } from "./leading-heading"

/**
 * The chapter JSON keeps the source markdown verbatim, so the chapter's own heading
 * is still the first line of the body. The page already renders that title as its h1,
 * so the body heading is either redundant (strip it) or one level too high (demote it).
 */
describe("normalizeLeadingHeading", () => {
  it("removes a leading heading that repeats the chapter title, numbering included", () => {
    const markdown = [
      "## 1. O alumínio como metal de engenharia",
      "",
      "O alumínio é o metal não ferroso mais usado.",
    ].join("\n")

    expect(
      normalizeLeadingHeading(markdown, "O alumínio como metal de engenharia"),
    ).toBe("O alumínio é o metal não ferroso mais usado.")
  })

  it("removes a split-1 heading that repeats the title", () => {
    const markdown = "# Chapter 1: Restate and decompose\n\nDecompose the problem first."

    expect(normalizeLeadingHeading(markdown, "Restate and decompose")).toBe(
      "Decompose the problem first.",
    )
  })

  it("strips the article numbering an appendix heading carries", () => {
    const markdown = "## 16. Referência Rápida\n\nNúmeros para decorar."

    expect(normalizeLeadingHeading(markdown, "Referência Rápida")).toBe(
      "Números para decorar.",
    )
  })

  it("demotes a leading h1 that does not repeat the title to h2", () => {
    const markdown = "# Metalurgia Física das Ligas Não Ferrosas: Alumínio\n\n> Guia completo."

    expect(normalizeLeadingHeading(markdown, "Alumínio")).toBe(
      "## Metalurgia Física das Ligas Não Ferrosas: Alumínio\n\n> Guia completo.",
    )
  })

  it("shifts the rest of the body down with the demoted heading, fences untouched", () => {
    const markdown = [
      "# Metalurgia Física: Alumínio",
      "",
      "## Índice",
      "",
      "1. Um item",
      "",
      "```bash",
      "# dentro do bloco",
      "```",
      "",
      "### Detalhe",
    ].join("\n")

    expect(normalizeLeadingHeading(markdown, "Alumínio")).toBe(
      [
        "## Metalurgia Física: Alumínio",
        "",
        "### Índice",
        "",
        "1. Um item",
        "",
        "```bash",
        "# dentro do bloco",
        "```",
        "",
        "#### Detalhe",
      ].join("\n"),
    )
  })

  it("leaves a body that already starts at h2 alone", () => {
    const markdown = "## Um subtítulo do corpo\n\nTexto."

    expect(normalizeLeadingHeading(markdown, "Título do capítulo")).toBe(markdown)
  })

  it("re-roots a split-2 body so its h3 sections render as h2", () => {
    const markdown = [
      "## 1. O alumínio como metal de engenharia",
      "",
      "Texto.",
      "",
      "### 1.1 Obtenção",
      "",
      "#### Detalhe fino",
    ].join("\n")

    expect(
      normalizeLeadingHeading(markdown, "O alumínio como metal de engenharia"),
    ).toBe(["Texto.", "", "## 1.1 Obtenção", "", "### Detalhe fino"].join("\n"))
  })

  it("reports the shift it applied, together with the matching section levels", () => {
    const sections = [
      { id: "11-obtencao", level: 3 as const, parentId: null, title: "1.1 Obtenção" },
      { id: "111-custo", level: 4 as const, parentId: "11-obtencao", title: "1.1.1 Custo" },
    ]

    const prepared = prepareChapterBody(
      "## 1. Alumínio\n\n### 1.1 Obtenção\n\n#### 1.1.1 Custo",
      "Alumínio",
      sections,
    )

    expect(prepared.shift).toBe(-1)
    expect(prepared.markdown).toContain("## 1.1 Obtenção")
    expect(prepared.sections.map((section) => section.level)).toEqual([2, 3])
    expect(prepared.sections.map((section) => section.id)).toEqual(["11-obtencao", "111-custo"])
  })

  it("never touches a leading fenced block, even when it holds hashes", () => {
    const markdown = "```bash\n# not a heading\n```\n\n## Depois"

    expect(normalizeLeadingHeading(markdown, "Título")).toBe(markdown)
  })
})
