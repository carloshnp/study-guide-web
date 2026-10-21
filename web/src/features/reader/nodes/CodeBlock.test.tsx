import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MarkdownRenderer } from "../MarkdownRenderer"

const PYTHON_FENCE = [
  "```python",
  "def soma(a, b):",
  "    return a + b",
  "```",
].join("\n")

function renderCode(markdown: string) {
  const view = render(
    <MemoryRouter>
      <MarkdownRenderer markdown={markdown} />
    </MemoryRouter>,
  )
  return view
}

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  writeText = vi.fn(async () => undefined)
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("CodeBlock", () => {
  it("shows the fence language and a 44px copy button", () => {
    renderCode(PYTHON_FENCE)

    expect(screen.getByText("python")).toBeInTheDocument()

    const copy = screen.getByRole("button", { name: /copiar código/i })
    expect(copy).toHaveClass("size-11")
  })

  it("copies the fenced code verbatim and confirms it", async () => {
    renderCode(PYTHON_FENCE)

    // fireEvent, not userEvent: userEvent swaps `navigator.clipboard` for its own
    // stub, and this assertion is about the call the component makes.
    fireEvent.click(screen.getByRole("button", { name: /copiar código/i }))

    expect(writeText).toHaveBeenCalledWith("def soma(a, b):\n    return a + b")
    expect(await screen.findByRole("button", { name: /copiado/i })).toBeInTheDocument()
  })

  it("lets rehype-highlight tokenise the fence", () => {
    const { container } = renderCode(PYTHON_FENCE)

    const code = container.querySelector("pre code")
    expect(code).toHaveClass("hljs")
    expect(code?.querySelector(".hljs-keyword")).not.toBeNull()
  })

  it("renders inline code without the copy affordance", () => {
    renderCode("Use `tabulate()` no lugar.")

    expect(screen.queryByRole("button", { name: /copiar código/i })).not.toBeInTheDocument()
  })
})
