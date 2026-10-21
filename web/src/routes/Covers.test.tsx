import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { catalogFetch } from "@/features/catalog/__fixtures__/catalog"
import { resetCatalogCache } from "@/lib/catalog"
import { Covers } from "@/routes/Covers"

function renderCovers() {
  return render(
    <MemoryRouter initialEntries={["/estantes"]}>
      <Covers />
    </MemoryRouter>,
  )
}

async function searchBox() {
  return screen.findByRole("searchbox", { name: /filtrar por disciplina/i })
}

beforeEach(() => {
  resetCatalogCache()
  vi.stubGlobal("fetch", vi.fn(catalogFetch()))
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetCatalogCache()
})

describe("Covers page", () => {
  it("shows the built cover and a typographic placeholder when a guide has no figure", async () => {
    renderCovers()

    expect(await screen.findByRole("img", { name: "Capa de Alumínio" })).toHaveAttribute(
      "src",
      "/media/covers/aluminio.webp",
    )
    expect(
      screen.getByRole("img", { name: /capa tipográfica de estruturas de dados/i }),
    ).toBeInTheDocument()
  })

  it("groups the grid by subject and links each card to its guide", async () => {
    renderCovers()

    const metalurgia = await screen.findByRole("region", { name: "Metalurgia" })
    expect(within(metalurgia).getByRole("link", { name: /Alumínio/ })).toHaveAttribute(
      "href",
      "/g/aluminio",
    )
    expect(within(metalurgia).getByText("2 capítulos")).toBeInTheDocument()

    const programming = screen.getByRole("region", { name: "Programação" })
    expect(
      within(programming).getByRole("link", { name: /Estruturas de Dados e Algoritmos/ }),
    ).toBeInTheDocument()
  })

  it("filters an accented subject from an unaccented query", async () => {
    const user = userEvent.setup()
    renderCovers()

    await user.type(await searchBox(), "programacao")

    expect(screen.queryByRole("region", { name: "Metalurgia" })).toBeNull()
    expect(screen.getByRole("region", { name: "Programação" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("1 guia para “programacao”")
  })

  it("tolerates a one-letter typo in the subject query", async () => {
    const user = userEvent.setup()
    renderCovers()

    await user.type(await searchBox(), "metalurgai")

    expect(screen.getByRole("region", { name: "Metalurgia" })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Programação" })).toBeNull()
  })

  it("finds a guide by its own title inside another subject", async () => {
    const user = userEvent.setup()
    renderCovers()

    await user.type(await searchBox(), "dsa")

    expect(screen.queryByRole("region", { name: "Metalurgia" })).toBeNull()
    expect(
      screen.getByRole("link", { name: /Estruturas de Dados e Algoritmos/ }),
    ).toBeInTheDocument()
  })

  it("explains how to add a guide when nothing matches", async () => {
    const user = userEvent.setup()
    renderCovers()

    await user.type(await searchBox(), "quimica")

    expect(
      screen.getByRole("heading", { name: /nenhuma disciplina corresponde a “quimica”/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/catalog\.yaml/)).toBeInTheDocument()
    expect(screen.getByText(/pipeline\.build --all/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Alumínio/ })).toBeNull()
  })

  it("returns to every cover when the filter is cleared", async () => {
    const user = userEvent.setup()
    renderCovers()

    await user.type(await searchBox(), "quimica")
    await user.click(screen.getByRole("button", { name: /limpar filtro/i }))

    expect(screen.getByRole("region", { name: "Metalurgia" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Programação" })).toBeInTheDocument()
    expect(await searchBox()).toHaveValue("")
  })

  it("explains an empty catalog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ generatedAt: "2026-10-21T00:00:00Z", guides: [], subjects: [] }),
        ok: true,
        status: 200,
      })),
    )
    renderCovers()

    expect(await screen.findByText(/nenhum guia publicado/i)).toBeInTheDocument()
    expect(screen.getByText(/pipeline\.build --all/)).toBeInTheDocument()
  })

  it("offers a retry when the index cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(catalogFetch({ missing: "index" })))
    renderCovers()

    expect(await screen.findByText(/estantes indisponíveis/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument()
    expect(screen.getByText(/catalog\.yaml/)).toBeInTheDocument()
  })
})
