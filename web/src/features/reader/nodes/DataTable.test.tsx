import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { MarkdownRenderer } from "../MarkdownRenderer"

function renderTable(markdown: string) {
  const view = render(
    <MemoryRouter>
      <MarkdownRenderer markdown={markdown} />
    </MemoryRouter>,
  )
  return view
}

const FOUR_COLUMNS = [
  "| Propriedade | Valor | Unidade | Observação |",
  "|:---|:---|:---|:---|",
  "| Módulo de elasticidade | 69 | GPa | típico |",
  "| Limite de escoamento | 0,85 | % | liga 2024 |",
  "| Designação | 3XXX | série | liga trabalhada |",
].join("\n")

describe("ChapterTable", () => {
  it("wraps the table in a labelled, focusable scroll region", () => {
    renderTable(FOUR_COLUMNS)

    const region = screen.getByRole("region", { name: /tabela/i })
    expect(region).toHaveAttribute("tabindex", "0")
    expect(region.className).toContain("overflow-x-auto")
    expect(region).toContainElement(screen.getByRole("table"))
    expect(region).toHaveAccessibleName(/propriedade/i)
  })

  it("puts scope on header cells and marks numeric cells tabular", () => {
    renderTable(FOUR_COLUMNS)

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(4)
    for (const header of headers) expect(header).toHaveAttribute("scope", "col")

    const table = screen.getByRole("table")
    const numeric = within(table)
      .getAllByRole("cell")
      .filter((cell) => cell.getAttribute("data-numeric") === "true")

    expect(numeric.map((cell) => cell.textContent)).toEqual(["69", "0,85"])
    for (const cell of numeric) expect(cell.className).toContain("tabular-nums")
  })

  it("leaves designations and formulas alone", () => {
    renderTable(FOUR_COLUMNS)

    const table = screen.getByRole("table")
    const designation = within(table).getByRole("cell", { name: "3XXX" })
    expect(designation).not.toHaveAttribute("data-numeric")
    expect(designation.className).not.toContain("tabular-nums")

    const unit = within(table).getByRole("cell", { name: "GPa" })
    expect(unit).not.toHaveAttribute("data-numeric")
  })

  it("pins the first column only from five columns up", () => {
    renderTable(FOUR_COLUMNS)
    expect(screen.getByRole("table")).not.toHaveAttribute("data-sticky-first")

    renderTable(
      [
        "| A | B | C | D | E |",
        "|:--|:--|:--|:--|:--|",
        "| 1 | 2 | 3 | 4 | 5 |",
      ].join("\n"),
    )

    const wide = screen.getAllByRole("table").at(-1)
    expect(wide).toHaveAttribute("data-sticky-first", "true")
    expect(wide).toHaveAttribute("data-columns", "5")
  })
})
