import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { ChapterToc } from "./ChapterToc"
import type { ChapterSection } from "@/lib/content"

const SECTIONS: ChapterSection[] = [
  { id: "11-obtencao", level: 2, parentId: null, title: "1.1 Obtenção" },
  { id: "111-custo", level: 3, parentId: "11-obtencao", title: "1.1.1 Custo energético" },
  { id: "termos", level: 4, parentId: null, title: "Termos introduzidos" },
]

describe("ChapterToc", () => {
  it("lists only the top-level sections as in-page links (deeper sub-sections are not navigation targets)", () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes("1280px"),
      media: query,
    })) as typeof window.matchMedia

    try {
      render(
        <MemoryRouter>
          <ChapterToc sections={SECTIONS} />
        </MemoryRouter>,
      )

      const nav = screen.getByRole("navigation", { name: /neste capítulo/i })
      const links = screen.getAllByRole("link")

      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "#11-obtencao",
      ])
      expect(links[0]).toHaveTextContent("1.1 Obtenção")
      expect(links[0]).toHaveAttribute("data-level", "2")

      expect(nav).toContainElement(links[0])
    } finally {
      window.matchMedia = original
    }
  })

  it("renders nothing below 1280px", () => {
    const { container } = render(
      <MemoryRouter>
        <ChapterToc sections={SECTIONS} />
      </MemoryRouter>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
