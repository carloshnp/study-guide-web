import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { searchFixture as documents } from "@/features/search/__fixtures__/load-fixture"
import { RECENT_QUERIES_KEY, resetRecentQueriesCache, resetSearchCorpusCache } from "@/features/search/useSearch"
import { ThemeProvider } from "@/lib/theme-provider"
import { routes } from "@/router"

function renderApp() {
  const router = createMemoryRouter(routes, { initialEntries: ["/busca"] })
  const view = render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return { router, ...view }
}

async function openPalette() {
  fireEvent.keyDown(window, { key: "k", metaKey: true })
  const dialog = await screen.findByRole("dialog")
  const input = within(dialog).getByRole("combobox", { name: /busca rápida/i })
  return { dialog, input }
}

describe("SearchDialog", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetRecentQueriesCache()
    resetSearchCorpusCache()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => documents })),
    )
  })

  it("abre com Cmd+K e foca o campo de busca", async () => {
    renderApp()

    const { input } = await openPalette()

    expect(input).toHaveFocus()
  })

  it("abre com Ctrl+K", async () => {
    renderApp()

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })

  it("agrupa por guia e destaca o acerto mesmo sem acento", async () => {
    const user = userEvent.setup()
    renderApp()

    const { dialog, input } = await openPalette()
    await user.type(input, "magnesio")

    const group = await within(dialog).findByRole("group", { name: /magnésio/i })
    expect(
      within(group).getByRole("option", { name: /o magnésio como metal de engenharia/i }),
    ).toBeInTheDocument()
    expect(group.querySelectorAll("mark").length).toBeGreaterThan(0)
    expect(group.querySelector("mark")).toHaveTextContent(/magnésio/i)
  })

  it("navega com as setas e abre o capítulo com Enter", async () => {
    const user = userEvent.setup()
    const { router } = renderApp()

    const { dialog, input } = await openPalette()
    await user.type(input, "solucao")

    const second = await within(dialog).findByRole("option", {
      name: /tratamentos térmicos do alumínio/i,
    })
    await user.keyboard("{ArrowDown}")

    await waitFor(() => expect(second).toHaveAttribute("aria-selected", "true"))

    await user.keyboard("{Enter}")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/g/aluminio/c/05-tratamentos-termicos-do-aluminio",
      ),
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(RECENT_QUERIES_KEY) ?? "[]")).toEqual(["solucao"])
  })

  it("abre o primeiro resultado com Enter sem usar as setas", async () => {
    const user = userEvent.setup()
    const { router } = renderApp()

    const { input } = await openPalette()
    await user.type(input, "solucao solida")
    await screen.findByRole("option", { name: /solução sólida e precipitação/i })

    await user.keyboard("{Enter}")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/g/aluminio/c/04-solucao-solida-e-precipitacao"),
    )
  })

  it("fecha com Esc", async () => {
    const user = userEvent.setup()
    renderApp()

    const { input } = await openPalette()
    await user.type(input, "magnesio")
    await user.keyboard("{Escape}")

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("mostra o estado vazio quando nada corresponde", async () => {
    const user = userEvent.setup()
    renderApp()

    const { dialog, input } = await openPalette()
    await user.type(input, "zzzzzz")

    expect(await within(dialog).findByText(/nenhum resultado para/i)).toBeInTheDocument()
  })
})
