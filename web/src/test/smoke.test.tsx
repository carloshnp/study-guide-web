import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

function Smoke() {
  return <p>estudos</p>
}

describe("test runner", () => {
  it("renders jsx", () => {
    render(<Smoke />)
    expect(screen.getByText("estudos")).toBeInTheDocument()
  })
})
