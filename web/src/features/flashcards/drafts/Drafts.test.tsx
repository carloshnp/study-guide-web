import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { stubApi } from "../__fixtures__/api"
import { Drafts } from "./Drafts"

const DRAFTS = [
  { count: 49, file: "magnesio.yaml", guideId: "magnesio", tags: ["magnesio", "ligas"] },
  { count: 0, file: "vazio.yaml", guideId: null, tags: [] },
]

function renderDrafts() {
  const router = createMemoryRouter([{ path: "/flashcards/drafts", element: <Drafts /> }], {
    initialEntries: ["/flashcards/drafts"],
  })
  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Drafts page", () => {
  it("lists draft files with their counts and guide", async () => {
    stubApi([{ path: "/api/flashcards/drafts", respond: () => ({ drafts: DRAFTS }) }])

    renderDrafts()

    expect(await screen.findByRole("heading", { level: 1, name: "Rascunhos" })).toBeInTheDocument()
    expect(screen.getByText("magnesio.yaml")).toBeInTheDocument()
    expect(screen.getByText(/49 cards/)).toBeInTheDocument()
    expect(screen.getByText(/guia magnesio/)).toBeInTheDocument()
    expect(screen.getByText("vazio.yaml")).toBeInTheDocument()
  })

  it("imports a file and reports created/skipped counts", async () => {
    const user = userEvent.setup()
    const importMock = vi.fn(() => ({ created: 49, file: "magnesio.yaml", skipped: 0 }))
    stubApi([
      { path: "/api/flashcards/drafts", respond: () => ({ drafts: DRAFTS }) },
      {
        method: "POST",
        path: "/api/flashcards/drafts/magnesio.yaml/import",
        respond: importMock,
      },
    ])

    renderDrafts()

    const buttons = await screen.findAllByRole("button", { name: "Importar" })
    await user.click(buttons[0])

    expect(importMock).toHaveBeenCalledOnce()
    expect(await screen.findByText(/49 criados, 0 já existiam/)).toBeInTheDocument()
  })

  it("disables import for empty drafts", async () => {
    stubApi([{ path: "/api/flashcards/drafts", respond: () => ({ drafts: DRAFTS }) }])

    renderDrafts()

    const buttons = await screen.findAllByRole("button", { name: "Importar" })
    expect(buttons[0]).toBeEnabled()
    expect(buttons[1]).toBeDisabled()
  })

  it("explains when there are no drafts", async () => {
    stubApi([{ path: "/api/flashcards/drafts", respond: () => ({ drafts: [] }) }])

    renderDrafts()

    expect(await screen.findByText("Nenhum rascunho disponível.")).toBeInTheDocument()
  })

  it("reports a failing API and offers a retry", async () => {
    stubApi([])

    renderDrafts()

    expect(await screen.findByText(/não foi possível carregar os rascunhos/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument()
  })
})
