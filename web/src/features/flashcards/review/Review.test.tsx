import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { bodyOf, REVIEW_SAMPLE, stubApi } from "../__fixtures__/api"
import { Review } from "./Review"

const CARD = {
  back: "Ferrita",
  front: "O que é a camada passiva?",
  id: 1,
  kind: "basic" as const,
  noteId: 10,
  scope: "chapter:magnesio:01-estrutura",
  template: "basic",
}

function renderReview(path = "/flashcards/review") {
  const router = createMemoryRouter(
    [
      { path: "/flashcards/review", element: <Review /> },
      { path: "/flashcards/decks", element: <div>lista de decks</div> },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Review session", () => {
  it("runs the whole loop by keyboard: reveal, rate Again, feedback, summary", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi([
      {
        path: "/api/flashcards/queue",
        respond: () => ({ cards: [CARD], hasMore: true, mode: "review" }),
      },
      {
        method: "POST",
        path: "/api/flashcards/cards/1/review",
        respond: () => REVIEW_SAMPLE,
      },
    ])

    renderReview()

    // Stage one: the question only, no answer and no rating buttons.
    expect(await screen.findByText("O que é a camada passiva?")).toBeInTheDocument()
    expect(screen.queryByText("Ferrita")).toBeNull()
    expect(screen.queryByRole("button", { name: /^again/i })).toBeNull()

    // Space reveals.
    await user.keyboard(" ")
    expect(await screen.findByText("Ferrita")).toBeInTheDocument()

    // The four buttons carry the estimated next interval.
    expect(screen.getByRole("button", { name: "Again 1m" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Hard 6m" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Good 10m" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Easy 4d" })).toBeInTheDocument()

    // `1` rates Again; the correct answer stays on screen before advancing.
    await user.keyboard("1")
    expect(await screen.findByText("Resposta correta")).toBeInTheDocument()
    expect(screen.getByText("Errado")).toBeInTheDocument()

    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST")
    expect(String(post?.[0])).toBe("/api/flashcards/cards/1/review")
    expect(bodyOf(post?.[1])).toMatchObject({ rating: 1 })
    expect(typeof bodyOf(post?.[1]).elapsedMs).toBe("number")

    // Space advances to the summary; hasMore offers Continuar.
    await user.keyboard(" ")
    expect(await screen.findByText("Sessão concluída")).toBeInTheDocument()
    expect(screen.getByText("1 card avaliado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /continuar/i })).toBeInTheDocument()
  })

  it("maps Enter to Good and respects the rating buttons", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi([
      {
        path: "/api/flashcards/queue",
        respond: () => ({ cards: [CARD], hasMore: false, mode: "review" }),
      },
      {
        method: "POST",
        path: "/api/flashcards/cards/1/review",
        respond: () => ({ ...REVIEW_SAMPLE, answer: "**Ferrita**", correct: true }),
      },
    ])

    renderReview()
    await screen.findByText("O que é a camada passiva?")
    await user.keyboard(" ")
    await screen.findByText("Ferrita")

    await user.keyboard("{Enter}")

    await waitFor(() =>
      expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(true),
    )
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST")
    expect(bodyOf(post?.[1])).toMatchObject({ rating: 3 })
    expect(await screen.findByText("Correto")).toBeInTheDocument()
  })

  it("starts a fresh batch when Continuar is pressed", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi([
      {
        path: "/api/flashcards/queue",
        respond: () => ({ cards: [CARD], hasMore: true, mode: "review" }),
      },
      {
        method: "POST",
        path: "/api/flashcards/cards/1/review",
        respond: () => REVIEW_SAMPLE,
      },
    ])

    renderReview()
    await screen.findByText("O que é a camada passiva?")
    await user.keyboard(" ")
    await screen.findByText("Ferrita")
    await user.keyboard("3")
    await screen.findByText("Resposta correta")
    await user.keyboard(" ")
    await user.click(await screen.findByRole("button", { name: /continuar/i }))

    await waitFor(() => {
      const gets = fetchMock.mock.calls.filter((call) => (call[1]?.method ?? "GET") === "GET")
      expect(gets.length).toBe(2)
    })
    expect(await screen.findByText("O que é a camada passiva?")).toBeInTheDocument()
  })

  it("offers the reschedule toggle in training and reloads the session with it", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi([
      {
        method: "POST",
        path: "/api/flashcards/decks/",
        respond: () => ({ cards: [CARD], hasMore: false, mode: "training" }),
      },
      {
        method: "POST",
        path: "/api/flashcards/cards/1/review",
        respond: () => REVIEW_SAMPLE,
      },
    ])

    renderReview("/flashcards/review?deck=guide%3Amagnesio&mode=training")

    const toggle = await screen.findByRole("switch", { name: /registrar no cronograma/i })
    expect(toggle).not.toBeChecked()
    expect(screen.getByText(/sem cronograma/i)).toBeInTheDocument()

    await user.click(toggle)

    await waitFor(() => {
      const sessions = fetchMock.mock.calls.filter((call) => String(call[0]).endsWith("/session"))
      expect(sessions).toHaveLength(2)
      expect(bodyOf(sessions[0]?.[1])).toMatchObject({ mode: "training", reschedule: false })
      expect(bodyOf(sessions[1]?.[1])).toMatchObject({ mode: "training", reschedule: true })
    })
  })

  it("resolves the answer from the note when the queue omits it", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi([
      {
        path: "/api/flashcards/queue",
        respond: () => ({
          cards: [
            {
              front: "Qual fase é cúbica de corpo centrado?",
              id: 3,
              kind: "basic",
              noteId: 30,
              scopeMeta: {
                chapterSlug: "01-estrutura",
                guideId: "magnesio",
                sectionId: "12-fases",
                sourceSnippet: null,
              },
              state: "new",
              template: "basic",
            },
          ],
          hasMore: false,
          nextCursor: null,
          reschedule: true,
          scope: "all",
          sessionMode: "review",
        }),
      },
      {
        path: "/api/flashcards/notes/30",
        respond: () => ({
          back: "**Ferrita**",
          cards: [],
          chapterSlug: "01-estrutura",
          createdAt: "2026-10-22T12:00:00Z",
          front: "Qual fase é cúbica de corpo centrado?",
          guideId: "magnesio",
          id: 30,
          kind: "basic",
          sectionId: "12-fases",
          sourceSnippet: null,
          tags: "",
          updatedAt: "2026-10-22T12:00:00Z",
        }),
      },
      {
        method: "POST",
        path: "/api/flashcards/cards/3/review",
        respond: () => ({
          answer: "**Ferrita**",
          cardId: 3,
          correct: true,
          due: "2026-10-29",
          intervalBefore: 0,
          nextIntervalDays: 7,
          rating: 3,
          recorded: true,
          sessionMode: "review",
          state: "review",
        }),
      },
    ])

    renderReview()
    await screen.findByText("Qual fase é cúbica de corpo centrado?")

    await user.keyboard(" ")
    expect(await screen.findByText("Ferrita")).toBeInTheDocument()

    await user.keyboard("3")
    expect(await screen.findByText("Resposta correta")).toBeInTheDocument()
    expect(screen.getByText("Próxima revisão em 7d")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Ver no guia/ })).toHaveAttribute(
      "href",
      "/g/magnesio/c/01-estrutura#12-fases",
    )

    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST")
    expect(bodyOf(post?.[1])).toMatchObject({
      mode: "review",
      rating: 3,
      reschedule: true,
    })
  })

  it("tells the server that an unscheduled training rating must not persist", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi([
      {
        method: "POST",
        path: "/api/flashcards/decks/",
        respond: () => ({
          cards: [CARD],
          deckId: "guide:magnesio",
          hasMore: false,
          reschedule: false,
          scope: "guide:magnesio",
          sessionMode: "training",
        }),
      },
      {
        method: "POST",
        path: "/api/flashcards/cards/1/review",
        respond: () => ({ ...REVIEW_SAMPLE, recorded: false, state: "new" }),
      },
    ])

    renderReview("/flashcards/review?deck=guide%3Amagnesio&mode=training")

    await screen.findByRole("switch", { name: /registrar no cronograma/i })
    await user.keyboard(" ")
    await screen.findByText("Ferrita")
    await user.keyboard("3")

    await screen.findByText("Resposta correta")
    expect(screen.getByText("Treino sem cronograma")).toBeInTheDocument()

    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST" && String(call[0]).includes("/review"))
    expect(bodyOf(post?.[1])).toMatchObject({
      mode: "training",
      rating: 3,
      reschedule: false,
    })
  })

  it("says plainly when the queue is empty", async () => {
    stubApi([
      {
        path: "/api/flashcards/queue",
        respond: () => ({ cards: [], hasMore: false, mode: "review" }),
      },
    ])

    renderReview()

    expect(await screen.findByText("Nada para revisar agora.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ver decks/i })).toBeInTheDocument()
  })
})
