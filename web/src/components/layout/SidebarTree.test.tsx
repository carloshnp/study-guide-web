import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarTree } from "@/components/layout/SidebarTree"
import { catalogFetch } from "@/features/catalog/__fixtures__/catalog"
import { resetCatalogCache } from "@/lib/catalog"

function renderTree(initialPath = "/", props: Partial<Parameters<typeof SidebarTree>[0]> = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SidebarTree label="Estantes" {...props} />
    </MemoryRouter>,
  )
}

async function expandSubject(name: RegExp) {
  const user = userEvent.setup()
  const button = await screen.findByRole("button", { name })
  if (button.getAttribute("aria-expanded") === "false") await user.click(button)
  return button
}

beforeEach(() => {
  resetCatalogCache()
  vi.stubGlobal("fetch", vi.fn(catalogFetch()))
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetCatalogCache()
})

describe("SidebarTree", () => {
  it("groups the published guides by subject and by folder", async () => {
    renderTree()

    const metalurgia = await screen.findByRole("button", { name: /metalurgia/i })
    expect(metalurgia).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button", { name: /programação/i })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Alumínio" })).not.toBeInTheDocument()

    await expandSubject(/metalurgia/i)

    // The subject opens on its folder, not on the guides inside it.
    const folder = screen.getByRole("button", { name: /não-ferrosos/i })
    expect(folder).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("link", { name: "Alumínio" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Estruturas de Dados e Algoritmos" })).toBeNull()

    await expandSubject(/não-ferrosos/i)

    expect(screen.getByRole("link", { name: "Alumínio" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Titânio" })).toBeVisible()
    expect(screen.queryByRole("link", { name: "Estruturas de Dados e Algoritmos" })).toBeNull()
  })

  it("opens the folder that holds the active guide", async () => {
    renderTree("/g/aluminio")

    const folder = await screen.findByRole("button", { name: /não-ferrosos/i })
    expect(folder).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "Alumínio" })).toHaveAttribute("aria-current", "page")
  })

  it("expands a guide into chapters and a chapter into its sections", async () => {
    const user = userEvent.setup()
    renderTree()

    await expandSubject(/metalurgia/i)
    await expandSubject(/não-ferrosos/i)
    const guideToggle = screen.getByRole("button", { name: /expandir capítulos de alumínio/i })
    expect(guideToggle).toHaveAttribute("aria-expanded", "false")

    await user.click(guideToggle)

    const chapter = screen.getByRole("link", { name: "1. O alumínio como metal de engenharia" })
    expect(chapter).toHaveAttribute("href", "/g/aluminio/c/01-o-aluminio")
    expect(screen.queryByRole("link", { name: "1.1 Propriedades físicas" })).toBeNull()

    await user.click(screen.getByRole("button", { name: /expandir seções de o alumínio/i }))
    expect(screen.getByRole("link", { name: "1.1 Propriedades físicas" })).toBeVisible()

    // Collapsing the guide hides the chapter and its sections again.
    await user.click(screen.getByRole("button", { name: /recolher capítulos de alumínio/i }))
    expect(
      screen.queryByRole("link", { name: "1. O alumínio como metal de engenharia" }),
    ).toBeNull()
  })

  it("does not offer a section toggle for a chapter without sections", async () => {
    const user = userEvent.setup()
    renderTree()

    await expandSubject(/metalurgia/i)
    await expandSubject(/não-ferrosos/i)
    await user.click(screen.getByRole("button", { name: /expandir capítulos de alumínio/i }))

    expect(
      screen.queryByRole("button", { name: /expandir seções de classificação das ligas/i }),
    ).toBeNull()
  })

  it("marks the active guide route with aria-current", async () => {
    renderTree("/g/aluminio")

    const active = await screen.findByRole("link", { name: "Alumínio" })
    expect(active).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Titânio" })).not.toHaveAttribute("aria-current")
  })

  it("opens the ancestors of the active chapter and marks only it as current", async () => {
    renderTree("/g/aluminio/c/01-o-aluminio")

    const chapter = await screen.findByRole("link", {
      name: "1. O alumínio como metal de engenharia",
    })
    expect(chapter).toHaveAttribute("aria-current", "page")

    const guide = screen.getByRole("link", { name: "Alumínio" })
    expect(guide).not.toHaveAttribute("aria-current")
  })

  it("opens the new ancestors when the route changes after mount", async () => {
    const router = createMemoryRouter([{ element: <SidebarTree label="Estantes" />, path: "*" }], {
      initialEntries: ["/"],
    })
    render(<RouterProvider router={router} />)

    await screen.findByRole("button", { name: /metalurgia/i })
    expect(
      screen.queryByRole("link", { name: "1. O alumínio como metal de engenharia" }),
    ).toBeNull()

    await act(async () => {
      await router.navigate("/g/aluminio/c/01-o-aluminio")
    })

    expect(
      await screen.findByRole("link", { name: "1. O alumínio como metal de engenharia" }),
    ).toHaveAttribute("aria-current", "page")
  })

  it("expands and collapses from the keyboard", async () => {
    const user = userEvent.setup()
    renderTree()

    const metalurgia = await screen.findByRole("button", { name: /metalurgia/i })
    metalurgia.focus()

    await user.keyboard("{ArrowRight}")
    expect(metalurgia).toHaveAttribute("aria-expanded", "true")

    await user.keyboard("{ArrowLeft}")
    expect(metalurgia).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps 44px rows for touch targets", async () => {
    renderTree()

    const primary = await screen.findByRole("link", { name: "Estantes" })
    expect(primary).toHaveClass("min-h-11")

    await expandSubject(/metalurgia/i)
    await expandSubject(/não-ferrosos/i)
    const guide = screen.getByRole("link", { name: "Alumínio" })
    expect(guide).toHaveClass("min-h-11")

    const toggle = screen.getByRole("button", { name: /expandir capítulos de alumínio/i })
    expect(toggle).toHaveClass("min-h-11")
  })

  it("keeps the three primary destinations when the catalog is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(catalogFetch({ missing: "all" })))
    renderTree()

    expect(await screen.findByText(/servidor respondeu 404/i)).toBeInTheDocument()
    const nav = screen.getByRole("navigation", { name: "Estantes" })
    for (const name of ["Início", "Estantes", "Busca"]) {
      expect(within(nav).getByRole("link", { name })).toBeInTheDocument()
    }
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument()
  })

  it("puts Flashcards between Busca and the guide tree", async () => {
    renderTree()

    const nav = screen.getByRole("navigation", { name: "Estantes" })
    const flashcards = await within(nav).findByRole("link", { name: "Flashcards" })
    expect(flashcards).toHaveAttribute("href", "/flashcards")
    expect(flashcards).toHaveClass("min-h-11")

    const primary = within(nav)
      .getAllByRole("link")
      .slice(0, 4)
      .map((link) => link.textContent)
    expect(primary).toEqual(["Início", "Estantes", "Busca", "Flashcards"])
  })

  it("accepts the shell's primary-link list instead of its own defaults", async () => {
    renderTree("/", { nodes: [{ id: "inicio", title: "Início", to: "/" }] })

    const nav = screen.getByRole("navigation", { name: "Estantes" })
    expect(within(nav).getByRole("link", { name: "Início" })).toBeInTheDocument()
    expect(within(nav).queryByRole("link", { name: "Busca" })).toBeNull()
  })
})
