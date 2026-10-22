import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { stubApi } from "../__fixtures__/api"
import { Stats } from "./Stats"

const STATS = {
  daily: [
    { date: "2026-10-20", newCards: 2, reviews: 4 },
    { date: "2026-10-21", newCards: 0, reviews: 12 },
    { date: "2026-10-22", newCards: 1, reviews: 6 },
  ],
  forecast: Array.from({ length: 14 }, (_, index) => ({
    count: index,
    date: `2026-10-${String(23 + index).padStart(2, "0")}`,
  })),
  trueRetention: 0.92,
}

const HABITS = { activeDays: 12, freezes: 1, streak: 5 }

const SETTINGS = {
  dailyNewLimit: 10,
  desiredRetentionDefault: 0.9,
  floor: 5,
  perGuide: {},
  reviewCap: 200,
}

function renderStats() {
  const router = createMemoryRouter([{ path: "/flashcards/stats", element: <Stats /> }], {
    initialEntries: ["/flashcards/stats"],
  })
  return render(<RouterProvider router={router} />)
}

function stubStats() {
  stubApi([
    { path: "/api/flashcards/stats", respond: () => STATS },
    { path: "/api/flashcards/habits", respond: () => HABITS },
    { path: "/api/flashcards/settings", respond: () => SETTINGS },
  ])
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Stats page", () => {
  it("renders the heatmap, the forecast and the true retention", async () => {
    stubStats()
    const { container } = renderStats()

    expect(
      await screen.findByRole("heading", { level: 1, name: "Estatísticas" }),
    ).toBeInTheDocument()

    expect(
      await screen.findByRole("img", { name: /Mapa de calor de revisões/ }),
    ).toBeInTheDocument()
    // 14 weeks × 7 days, one cell each.
    expect(container.querySelectorAll("[data-level]")).toHaveLength(98)

    expect(screen.getByRole("img", { name: /Previsão de carga/ })).toBeInTheDocument()
    expect(container.querySelectorAll("[data-count]")).toHaveLength(14)

    expect(screen.getByText("92%")).toBeInTheDocument()
    expect(screen.getAllByText(/cards maduros/).length).toBeGreaterThan(0)
  })

  it("shows the streak, the freeze state and the daily goal", async () => {
    stubStats()
    renderStats()

    expect(await screen.findByText("5 dias")).toBeInTheDocument()
    expect(screen.getByText(/1 congelamento disponível/)).toBeInTheDocument()

    expect(await screen.findByRole("heading", { level: 2, name: /Meta diária/ })).toBeInTheDocument()
    // The slider control is labelled as a group; its thumb is visually hidden
    // in jsdom (clip-path), so the group label is the stable accessible handle.
    expect(
      screen.getByRole("group", { name: /Meta diária de cards novos/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /salvar meta/i })).toBeDisabled()
    expect(screen.getByRole("switch", { name: /lembrete diário/i })).toBeInTheDocument()
  })

  it("reports a failing API with a retry", async () => {
    stubApi([])
    renderStats()

    expect(
      await screen.findByText(/não foi possível carregar as estatísticas/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument()
  })
})
