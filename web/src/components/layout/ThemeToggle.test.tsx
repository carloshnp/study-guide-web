import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { ThemeProvider } from "@/lib/theme-provider"
import { THEME_STORAGE_KEY } from "@/lib/theme"

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  it("cycles automatic, light and dark and persists the choice", async () => {
    const user = userEvent.setup()
    renderToggle()

    const button = screen.getByRole("button", { name: /tema/i })
    expect(button).toHaveAccessibleName(/\bauto\b/i)

    await user.click(button)
    expect(button).toHaveAccessibleName(/claro/i)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
    expect(document.documentElement).not.toHaveClass("dark")

    await user.click(button)
    expect(button).toHaveAccessibleName(/escuro/i)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    expect(document.documentElement).toHaveClass("dark")

    await user.click(button)
    expect(button).toHaveAccessibleName(/\bauto\b/i)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("auto")
  })

  it("follows prefers-color-scheme in automatic mode", () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      renderToggle()
      expect(document.documentElement).toHaveClass("dark")
    } finally {
      window.matchMedia = original
    }
  })

  it("restores a stored choice instead of the system preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light")
    renderToggle()

    expect(screen.getByRole("button", { name: /tema/i })).toHaveAccessibleName(/claro/i)
    expect(document.documentElement).not.toHaveClass("dark")
  })
})
