import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { MarkdownNoteEditor } from "./MarkdownNoteEditor"

function ControlledEditor({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <div>
      <MarkdownNoteEditor ariaLabel="Conteúdo da nota" onChange={setValue} value={value} />
      <output data-testid="raw-markdown">{value}</output>
    </div>
  )
}

describe("MarkdownNoteEditor", () => {
  it("applies toolbar formatting actions and emits updated markdown via onChange", async () => {
    const user = userEvent.setup()
    render(<ControlledEditor initial="Laplace" />)

    await user.click(screen.getByRole("button", { name: /título/i }))
    await waitFor(() => {
      expect(screen.getByTestId("raw-markdown")).toHaveTextContent("## Laplace")
    })

    await user.click(screen.getByRole("button", { name: /negrito/i }))
    await waitFor(() => {
      expect(screen.getByTestId("raw-markdown").textContent).toContain("**")
    })

    await user.click(screen.getByRole("button", { name: /matemática em bloco/i }))
    await waitFor(() => {
      expect(screen.getByTestId("raw-markdown").textContent).toContain("$$")
    })
  })

  it("toggles between Live Preview and Source mode while preserving content", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ControlledEditor initial={"Introdução\n\n$$F(s) = \\int_{0}^{\\infty} e^{-st} f(t) dt$$"} />,
    )

    // In Live Preview (cursor at start of line 1), display math renders as SVG.
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector("[data-math-display='block']")).not.toBeNull()

    // Switch to Source mode: math widget disappears and raw LaTeX is shown.
    const toggle = screen.getByRole("button", { name: /modo fonte/i })
    await user.click(toggle)
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    expect(container.querySelector("[data-math-display='block']")).toBeNull()
    expect(container.textContent).toContain("$$F(s) = \\int_{0}^{\\infty} e^{-st} f(t) dt$$")

    // Switch back to Live Preview: math renders again.
    await user.click(toggle)
    expect(container.querySelector("[data-math-display='block']")).not.toBeNull()
  })

  it("toggles bold cleanly on and off when clicking Bold twice", async () => {
    const user = userEvent.setup()
    render(<ControlledEditor initial="" />)

    const boldBtn = screen.getByRole("button", { name: /negrito/i })
    await user.click(boldBtn)
    await waitFor(() => {
      expect(screen.getByTestId("raw-markdown")).toHaveTextContent("****")
    })
    // Clicking Bold again immediately unwraps instead of adding two more asterisks.
    await user.click(boldBtn)
    await waitFor(() => {
      expect(screen.getByTestId("raw-markdown")).toHaveTextContent("")
    })
  })

  it("opens the snippets dialog, validates errors, and saves user-edited snippets", async () => {
    window.localStorage.clear()
    const user = userEvent.setup()
    render(<ControlledEditor initial="" />)

    await user.click(screen.getByRole("button", { name: /editar snippets latex/i }))
    const box = await screen.findByRole("textbox", { name: /código dos snippets latex/i })
    expect((box as HTMLTextAreaElement).value).toContain("trigger")

    await user.clear(box)
    await user.type(box, "not valid js {{")
    await user.click(screen.getByRole("button", { name: /salvar snippets/i }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    await user.clear(box)
    await user.paste('[{ trigger: "foo", replacement: "bar", options: "tA" }]')
    await user.click(screen.getByRole("button", { name: /salvar snippets/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    window.localStorage.clear()
  })

  it("syncs external value changes when switching notes", () => {
    const { container, rerender } = render(
      <MarkdownNoteEditor ariaLabel="Conteúdo da nota" onChange={() => undefined} value="Nota A" />,
    )
    expect(container.textContent).toContain("Nota A")

    rerender(
      <MarkdownNoteEditor ariaLabel="Conteúdo da nota" onChange={() => undefined} value="Nota B" />,
    )
    expect(container.textContent).toContain("Nota B")
  })
})
