import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GuideMeter } from "./GuideMeter"

describe("GuideMeter", () => {
  it("shows done versus total and counts review separately", () => {
    render(<GuideMeter counts={{ done: 3, review: 1, total: 7 }} label="Progresso do guia" />)

    expect(screen.getByText("3/7")).toBeInTheDocument()
    expect(screen.getByText("43%")).toBeInTheDocument()
    expect(screen.getByText(/1 em revisão/)).toBeInTheDocument()
    expect(screen.getByText("Progresso do guia")).toBeInTheDocument()

    const meter = screen.getByRole("meter")
    expect(meter).toHaveAttribute("aria-valuenow", "3")
    expect(meter).toHaveAttribute("aria-valuemax", "7")
    expect(meter).toHaveAttribute("aria-valuetext", "3 de 7 concluídos, 1 em revisão")
  })

  it("hides the review line when nothing is in review", () => {
    render(<GuideMeter counts={{ done: 0, review: 0, total: 4 }} label="Progresso" />)

    expect(screen.getByText("0/4")).toBeInTheDocument()
    expect(screen.queryByText(/em revisão/)).not.toBeInTheDocument()
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "0")
  })

  it("renders an empty guide without dividing by zero", () => {
    render(<GuideMeter counts={{ done: 0, review: 0, total: 0 }} label="Progresso" />)

    expect(screen.getByText("0/0")).toBeInTheDocument()
    expect(screen.getByText("0%")).toBeInTheDocument()
    const meter = screen.getByRole("meter")
    expect(meter).toHaveAttribute("aria-valuenow", "0")
    expect(meter).toHaveAttribute("aria-valuemax", "1")
  })
})
