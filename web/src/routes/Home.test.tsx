import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { catalogFetch } from "@/features/catalog/__fixtures__/catalog"
import { writeLastRead } from "@/features/catalog/last-read"
import { resetProgressStore } from "@/features/progress/useProgress"
import { resetCatalogCache } from "@/lib/catalog"
import { Home } from "@/routes/Home"

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Home />
    </MemoryRouter>,
  )
}

async function metalurgiaGroup() {
  return screen.findByRole("region", { name: "Metalurgia" })
}

beforeEach(() => {
  resetCatalogCache()
  resetProgressStore()
  window.localStorage.clear()
  vi.stubGlobal("fetch", vi.fn(catalogFetch()))
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetCatalogCache()
  resetProgressStore()
  window.localStorage.clear()
})

describe("Home guide list", () => {
  it("lists guides grouped by subject with type chip, chapter count and a meter", async () => {
    renderHome()

    const group = await metalurgiaGroup()
    const aluminium = within(group).getByRole("link", { name: /Alumínio/ })
    expect(aluminium).toHaveAttribute("href", "/g/aluminio")
    expect(within(aluminium).getByText("Teoria")).toBeInTheDocument()
    expect(within(aluminium).getByText("2 capítulos")).toBeInTheDocument()

    const programming = await screen.findByRole("region", { name: "Programação" })
    const dsa = within(programming).getByRole("link", {
      name: /Estruturas de Dados e Algoritmos/,
    })
    expect(dsa).toBeInTheDocument()
    expect(within(dsa).getByText("Banco")).toBeInTheDocument()
    expect(within(dsa).getByText("2 capítulos")).toBeInTheDocument()
  })

  it("counts headings, not chapters, in the per-guide meter", async () => {
    renderHome()

    const group = await metalurgiaGroup()
    const link = within(group).getByRole("link", { name: /Alumínio/ })
    const meter = within(link).getByRole("meter")
    // Two sections in chapter one plus the chapter-only unit of chapter two.
    expect(meter).toHaveAttribute("aria-valuemax", "3")
    expect(within(link).getByText("0/3")).toBeInTheDocument()
  })

  it("shows the stored progress on the row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(catalogFetch({ progress: { "aluminio/01-o-aluminio/11-propriedades": "done" } })),
    )
    renderHome()

    const link = within(await metalurgiaGroup()).getByRole("link", { name: /Alumínio/ })

    expect(await within(link).findByText("1/3")).toBeInTheDocument()
    expect(within(link).getByText("33%")).toBeInTheDocument()
  })

  it("hides the continuar row when this device has no reading history", async () => {
    renderHome()

    await metalurgiaGroup()

    expect(screen.queryByRole("link", { name: /continuar/i })).toBeNull()
  })

  it("renders exactly one continuar row from the last-read entry", async () => {
    writeLastRead({
      chapterSlug: "01-o-aluminio",
      guideId: "aluminio",
      guideTitle: "Alumínio",
      title: "O alumínio como metal de engenharia",
    })
    renderHome()

    const continuar = await screen.findByRole("link", { name: /continuar/i })

    expect(continuar).toHaveAttribute("href", "/g/aluminio/c/01-o-aluminio")
    expect(continuar).toHaveTextContent("Alumínio")
    expect(continuar).toHaveTextContent("O alumínio como metal de engenharia")
    expect(screen.getAllByRole("link", { name: /continuar/i })).toHaveLength(1)
  })

  it("explains an empty catalog instead of showing a blank page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ generatedAt: "2026-10-21T00:00:00Z", guides: [], subjects: [] }),
        ok: true,
        status: 200,
      })),
    )
    renderHome()

    expect(await screen.findByText(/nenhum guia publicado ainda/i)).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Guias de estudo")
    expect(screen.getByText(/catalog\.yaml/)).toBeInTheDocument()
  })

  it("offers a retry when the content is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(catalogFetch({ missing: "index" })))
    renderHome()

    expect(await screen.findByText(/catálogo indisponível/i)).toBeInTheDocument()
    expect(screen.getByText(/servidor respondeu 404/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /continuar/i })).toBeNull()
  })
})
