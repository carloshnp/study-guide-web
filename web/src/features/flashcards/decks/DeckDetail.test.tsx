import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { stubApi } from "../__fixtures__/api"
import { DeckDetail } from "./DeckDetail"

const DECK = {
  cards: [
    { front: "Qual fase é cúbica de corpo centrado?", id: 1, state: "new", template: "basic" },
    { front: "A camada é **{{c1::ferrita}}**.", id: 2, state: "review", template: "cloze:c1" },
  ],
  chapterSlug: "01-estrutura",
  guideId: "magnesio",
  id: "chapter:magnesio:01-estrutura",
  sectionId: "12-fases",
  title: "Capítulo 1 — Estrutura",
  type: "chapter",
}

function renderDeck(path = "/flashcards/decks/chapter%3Amagnesio%3A01-estrutura") {
  const router = createMemoryRouter(
    [
      { path: "/flashcards/decks", element: <div>lista</div> },
      { path: "/flashcards/decks/:deckId", element: <DeckDetail /> },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Deck detail", () => {
  it("browses the deck and offers training and review", async () => {
    stubApi([{ path: "/api/flashcards/decks/", respond: () => DECK }])

    renderDeck()

    expect(
      await screen.findByRole("heading", { level: 1, name: "Capítulo 1 — Estrutura" }),
    ).toBeInTheDocument()
    expect(await screen.findByText("Qual fase é cúbica de corpo centrado?")).toBeInTheDocument()
    expect(screen.getByText("Novo")).toBeInTheDocument()
    expect(screen.getByText("Revisão")).toBeInTheDocument()
    expect(screen.getByText("2 cards · Capítulo")).toBeInTheDocument()

    expect(screen.getByRole("link", { name: /Treinar agora/ })).toHaveAttribute(
      "href",
      "/flashcards/review?deck=chapter%3Amagnesio%3A01-estrutura&mode=training",
    )
    expect(screen.getByRole("link", { name: "Revisar" })).toHaveAttribute(
      "href",
      "/flashcards/review?deck=chapter%3Amagnesio%3A01-estrutura&mode=review",
    )
    expect(screen.getByRole("link", { name: /Abrir no guia/ })).toHaveAttribute(
      "href",
      "/g/magnesio/c/01-estrutura#12-fases",
    )
  })

  it("says the deck is empty without inventing cards", async () => {
    stubApi([{ path: "/api/flashcards/decks/", respond: () => ({ ...DECK, cards: [] }) }])

    renderDeck()

    expect(
      await screen.findByText(/Este deck está vazio/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: /Cards de/ })).toBeNull()
  })
})
