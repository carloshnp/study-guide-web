import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { searchFixture as documents } from "@/features/search/__fixtures__/load-fixture"
import { resetRecentQueriesCache, resetSearchCorpusCache } from "@/features/search/useSearch"
import { ThemeProvider } from "@/lib/theme-provider"
import { routes } from "@/router"

function renderSearch() {
  const router = createMemoryRouter(routes, { initialEntries: ["/busca"] })
  render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return router
}

describe("Search page", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetRecentQueriesCache()
    resetSearchCorpusCache()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => documents })),
    )
  })

  it("mostra resultados agrupados por guia com link para o capítulo", async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole("searchbox", { name: /buscar no conteúdo/i }), "solucao solida")

    const link = await screen.findByRole("link", { name: /solução sólida e precipitação/i })
    expect(link).toHaveAttribute("href", "/g/aluminio/c/04-solucao-solida-e-precipitacao")

    const group = screen.getByRole("region", { name: "Alumínio" })
    expect(within(group).getByRole("heading", { level: 2 })).toHaveTextContent("Alumínio")
    expect(group.querySelectorAll("mark").length).toBeGreaterThan(0)
  })

  it("mostra o estado vazio para uma consulta sem correspondência", async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole("searchbox", { name: /buscar no conteúdo/i }), "zzzzzz")

    expect(await screen.findByText(/nenhum resultado para/i)).toBeInTheDocument()
  })

  it("explica quando o índice ainda não foi publicado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("404")
      }),
    )
    renderSearch()

    expect(await screen.findByText(/índice de busca ainda não foi publicado/i)).toBeInTheDocument()
  })
})
