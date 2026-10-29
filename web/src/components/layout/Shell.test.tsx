import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { ThemeProvider } from "@/lib/theme-provider"
import { routes } from "@/router"

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return { router, ...view }
}

describe("Shell", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  it("exposes a skip link that targets the main region", () => {
    renderAt("/")

    const skip = screen.getByRole("link", { name: /pular para o conteúdo/i })
    expect(skip).toHaveAttribute("href", "#conteudo")

    const main = document.getElementById("conteudo")
    expect(main).not.toBeNull()
    expect(main?.tagName).toBe("MAIN")
    expect(main).toHaveAttribute("tabindex", "-1")
    expect(main).toContainElement(screen.getByRole("heading", { level: 1 }))
  })

  it("moves focus to the main region on a route change", async () => {
    const { router } = renderAt("/")

    await act(async () => {
      await router.navigate("/estantes")
    })

    await waitFor(() => {
      expect(document.getElementById("conteudo")).toHaveFocus()
    })
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/estantes/i)
  })

  it("renders the catalog, guide, chapter and search routes", async () => {
    const { router } = renderAt("/g/aluminio/c/04-solucao-solida")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/04-solucao-solida/i)

    for (const [path, pattern] of [
      ["/estantes", /estantes/i],
      ["/g/aluminio", /aluminio/i],
      ["/busca", /busca/i],
    ] as const) {
      await act(async () => {
        await router.navigate(path)
      })
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(pattern)
    }
  })

  it("renders a 404 with a way back home", () => {
    renderAt("/rota-inexistente")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/não encontrada/i)
    const back = screen.getByRole("link", { name: /voltar para o início/i })
    expect(back).toHaveAttribute("href", "/")
  })

  it("opens the navigation drawer from the top bar", async () => {
    const user = userEvent.setup()
    renderAt("/")

    const trigger = screen.getByRole("button", { name: /abrir navegação/i })
    await user.click(trigger)

    const drawer = await screen.findByRole("dialog")
    expect(within(drawer).getByRole("heading", { name: /navegação/i })).toBeInTheDocument()
    expect(within(drawer).getByRole("link", { name: /início/i })).toBeInTheDocument()
  })

  it("has no permanent wide sidebar: the icon rail and the menu button do the navigation", () => {
    renderAt("/")

    expect(screen.queryByRole("complementary", { name: "Estantes" })).toBeNull()
    expect(screen.getByRole("navigation", { name: "Estantes (atalhos)" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /abrir navegação/i })).toBeInTheDocument()
  })

  it("renders the settings entry in the top bar, with the theme inside it", () => {
    renderAt("/")
    const topbar = screen.getByRole("banner")
    // The bare theme cycle moved into the settings panel; the bar exposes one
    // entry point for theme, panel width and margin.
    expect(within(topbar).queryByRole("button", { name: /tema/i })).not.toBeInTheDocument()
    expect(
      within(topbar).getByRole("button", { name: /configurações de leitura/i }),
    ).toBeInTheDocument()
  })

  it("centres the routed page in a content column", () => {
    renderAt("/")
    expect(document.querySelector("[data-slot='content-column']")).not.toBeNull()
  })
})
