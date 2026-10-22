import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { stubApi } from "../__fixtures__/api"
import { Decks } from "./Decks"

const DECKS = [
  { cardCount: 12, id: "guide:magnesio", title: "Magnésio", type: "guide" },
  {
    cardCount: 8,
    chapterSlug: "01-estrutura",
    guideId: "magnesio",
    id: "chapter:magnesio:01-estrutura",
    title: "Capítulo 1 — Estrutura",
    type: "chapter",
  },
  { cardCount: 2, id: "other", title: "Sem âncora", type: "other" },
]

function renderDecks() {
  const router = createMemoryRouter([{ path: "/flashcards/decks", element: <Decks /> }], {
    initialEntries: ["/flashcards/decks"],
  })
  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Decks page", () => {
  it("lists the derived decks with counts and a training link each", async () => {
    stubApi([{ path: "/api/flashcards/decks", respond: () => DECKS }])

    renderDecks()

    expect(await screen.findByRole("heading", { level: 1, name: "Decks" })).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: /Magnésio/ })).toHaveAttribute(
      "href",
      "/flashcards/decks/guide%3Amagnesio",
    )
    expect(screen.getByText("12 cards")).toBeInTheDocument()
    expect(screen.getByText(/8 cards/)).toBeInTheDocument()

    const trainings = screen.getAllByRole("link", { name: /Treinar/ })
    expect(trainings).toHaveLength(3)
    expect(trainings[0]).toHaveAttribute(
      "href",
      "/flashcards/review?deck=guide%3Amagnesio&mode=training",
    )

    expect(screen.getByRole("heading", { level: 2, name: "Guia" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Capítulo" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Sem âncora" })).toBeInTheDocument()
  })

  it("explains how to create the first card when there is no deck", async () => {
    stubApi([{ path: "/api/flashcards/decks", respond: () => [] }])

    renderDecks()

    expect(await screen.findByText("Nenhum deck ainda.")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /novo card/i }).length).toBeGreaterThan(0)
  })

  it("reports a failing API and offers a retry", async () => {
    stubApi([])

    renderDecks()

    expect(await screen.findByText(/não foi possível carregar os decks/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument()
  })
})
