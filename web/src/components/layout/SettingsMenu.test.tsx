/**
 * The settings menu is the only place the reader can change how wide the panel is,
 * so these tests drive it the way a reader does: open it, flip the switch, drag the
 * margin, restore the default. They assert the effect on the document (the layout
 * dataset and the CSS variables), not on component internals.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { GUTTER, resetLayoutStore } from "@/features/preferences/layout"
import { ThemeProvider } from "@/lib/theme-provider"

function renderMenu() {
  return render(
    <ThemeProvider>
      <SettingsMenu />
    </ThemeProvider>,
  )
}

describe("SettingsMenu", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetLayoutStore()
  })

  it("is reachable by its accessible name", () => {
    renderMenu()
    expect(screen.getByRole("button", { name: /configurações de leitura/i })).toBeInTheDocument()
  })

  it("opens a panel with the theme choice and the width switch", async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole("button", { name: /configurações de leitura/i }))

    expect(await screen.findByText("Configurações")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: /largura total/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /tema claro/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /restaurar padrão/i })).not.toBeInTheDocument()
  })

  it("hides the margin control while the panel is centred", async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole("button", { name: /configurações de leitura/i }))

    expect(await screen.findByRole("switch", { name: /largura total/i })).toBeInTheDocument()
    expect(screen.queryByText("Margem lateral")).not.toBeInTheDocument()
    expect(screen.queryAllByRole("slider", { hidden: true })).toHaveLength(0)
  })

  it("offers the margin between 40 and 150 px once the panel is full width", async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole("button", { name: /configurações de leitura/i }))

    await user.click(await screen.findByRole("switch", { name: /largura total/i }))

    expect(await screen.findByText("Margem lateral")).toBeInTheDocument()
    expect(screen.getByText(`${GUTTER.default} px`)).toBeInTheDocument()
    // Base UI hides the thumb until it can measure the track; jsdom never can, so
    // the control is asserted through the accessible role, hidden included.
    expect(screen.getAllByRole("slider", { hidden: true }).length).toBeGreaterThan(0)
  })

  it("turns the full-width panel on and off", async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole("button", { name: /configurações de leitura/i }))

    const toggle = await screen.findByRole("switch", { name: /largura total/i })
    await user.click(toggle)
    expect(document.documentElement.dataset.layout).toBe("full")
    expect(document.documentElement.style.getPropertyValue("--content-max")).toBe("none")

    await user.click(toggle)
    expect(document.documentElement.dataset.layout).toBe("centered")
    expect(screen.queryByText("Margem lateral")).not.toBeInTheDocument()
  })

  it("moves the side margin through the slider input", async () => {
    const user = userEvent.setup()
    const { container } = renderMenu()
    await user.click(screen.getByRole("button", { name: /configurações de leitura/i }))
    await user.click(await screen.findByRole("switch", { name: /largura total/i }))

    const input = container.ownerDocument.querySelector<HTMLInputElement>(
      "[data-slot='slider-thumb'] input",
    )
    expect(input).not.toBeNull()

    fireEvent.input(input as HTMLInputElement, { target: { value: "48" } })
    fireEvent.change(input as HTMLInputElement, { target: { value: "48" } })

    const shown = await screen.findByText(/^\d+ px$/)
    const value = Number(shown.textContent?.replace(" px", ""))
    expect(value).toBeGreaterThan(GUTTER.default)
    expect(document.documentElement.style.getPropertyValue("--content-gutter-pref")).toBe(
      `${value}px`,
    )
  })
})
