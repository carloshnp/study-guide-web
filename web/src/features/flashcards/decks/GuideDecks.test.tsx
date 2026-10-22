import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { stubApi } from "../__fixtures__/api"
import { GuideDecks } from "./GuideDecks"

const DECKS = [
  { cardCount: 9, guideId: "magnesio", id: "guide:magnesio", title: "Magnésio", type: "guide" },
  {
    cardCount: 6,
    chapterSlug: "01-estrutura",
    guideId: "magnesio",
    id: "chapter:magnesio:01-estrutura",
    title: "Capítulo 1 — Estrutura",
    type: "chapter",
  },
  {
    cardCount: 3,
    chapterSlug: "02-transformacoes",
    guideId: "magnesio",
    id: "chapter:magnesio:02-transformacoes",
    title: "Capítulo 2 — Transformações",
    type: "chapter",
  },
  { cardCount: 4, guideId: "aluminio", id: "guide:aluminio", title: "Alumínio", type: "guide" },
]

function renderSection(guideId = "magnesio") {
  const router = createMemoryRouter(
    [{ path: "/g/:guideId", element: <GuideDecks guideId={guideId} /> }],
    { initialEntries: [`/g/${guideId}`] },
  )
  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GuideDecks section", () => {
  it("links the guide deck and each chapter deck of that guide only", async () => {
    stubApi([{ path: "/api/flashcards/decks", respond: () => DECKS }])

    renderSection()

    expect(await screen.findByRole("heading", { level: 2, name: "Flashcards" })).toBeInTheDocument()
    expect(screen.getByText("9 cards")).toBeInTheDocument()

    expect(screen.getByRole("link", { name: /Guia inteiro/ })).toHaveAttribute(
      "href",
      "/flashcards/decks/guide%3Amagnesio",
    )
    expect(screen.getByRole("link", { name: /Capítulo 1/ })).toHaveAttribute(
      "href",
      "/flashcards/decks/chapter%3Amagnesio%3A01-estrutura",
    )
    expect(screen.getByRole("link", { name: /Capítulo 2/ })).toHaveAttribute(
      "href",
      "/flashcards/decks/chapter%3Amagnesio%3A02-transformacoes",
    )
    expect(screen.queryByRole("link", { name: /Alumínio/ })).toBeNull()
  })

  it("invites the first card when the guide has none", async () => {
    stubApi([{ path: "/api/flashcards/decks", respond: () => [] }])

    renderSection()

    expect(await screen.findByText(/Nenhum card neste guia ainda/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Todos os decks/ })).toHaveAttribute(
      "href",
      "/flashcards/decks",
    )
  })
})
