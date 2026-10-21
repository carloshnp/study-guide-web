import { expect, test, type Page } from "@playwright/test"

import { fetchGuide, main, titlePattern } from "./helpers"

/** WCAG relative luminance of an `rgb()`/`rgba()` string. */
function luminance(color: string): number {
  const [r, g, b] = color
    .replace(/[^\d.,]/g, "")
    .split(",")
    .slice(0, 3)
    .map(Number)
  const channel = (value: number): number => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Body text contrast against the nearest opaque background, as a ratio. */
async function contrastRatio(page: Page): Promise<number> {
  const { foreground, background } = await page.evaluate(() => {
    const paragraph = document.querySelector("main p") as HTMLElement | null
    const style = getComputedStyle(paragraph ?? document.body)
    let node: HTMLElement | null = paragraph ?? document.body
    let backdrop = "rgba(0, 0, 0, 0)"
    while (node) {
      const candidate = getComputedStyle(node).backgroundColor
      if (candidate && !candidate.endsWith(", 0)") && candidate !== "transparent") {
        backdrop = candidate
        break
      }
      node = node.parentElement
    }
    return { foreground: style.color, background: backdrop }
  })
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

test.describe("theme and keyboard", () => {
  test("theme follows the system, cycles manually and persists across reloads", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" })
    await page.goto("/")
    await page.evaluate(() => window.localStorage.removeItem("estudos-theme"))
    await page.reload()

    const root = page.locator("html")
    await expect(root).toHaveClass(/dark/)
    await expect(root).toHaveAttribute("data-theme", "auto")

    const toggle = page.getByRole("button", { name: /^Tema:/ })
    await toggle.click() // auto → light
    await expect(root).not.toHaveClass(/dark/)
    await expect(root).toHaveAttribute("data-theme", "light")
    expect(await page.evaluate(() => window.localStorage.getItem("estudos-theme"))).toBe("light")

    await toggle.click() // light → dark
    await expect(root).toHaveClass(/dark/)
    await expect(root).toHaveAttribute("data-theme", "dark")

    await page.reload()
    await expect(root).toHaveClass(/dark/)
    await expect(root).toHaveAttribute("data-theme", "dark")
    expect(await page.evaluate(() => window.localStorage.getItem("estudos-theme"))).toBe("dark")

    // Both themes must keep 4.5:1 on body text.
    expect(await contrastRatio(page)).toBeGreaterThanOrEqual(4.5)
    await toggle.click() // dark → auto (system is dark here)
    await page.emulateMedia({ colorScheme: "light" })
    await page.reload()
    await expect(root).not.toHaveClass(/dark/)
    expect(await contrastRatio(page)).toBeGreaterThanOrEqual(4.5)
  })

  test("the skip link focuses the main region", async ({ page }) => {
    await page.goto("/")
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible()

    await page.keyboard.press("Tab")
    const skip = page.getByRole("link", { name: /pular para o conteúdo/i })
    await expect(skip).toBeFocused()
    await skip.press("Enter")
    await expect(main(page)).toBeFocused()
  })

  test("a route change moves focus to the main region", async ({ page, request }) => {
    const guide = await fetchGuide(request, "aluminio")
    await page.goto("/g/aluminio")

    await main(page)
      .getByRole("list", { name: /capítulos/i })
      .getByRole("link", { name: titlePattern(guide.chapters[0].title) })
      .click()

    await expect(main(page)).toBeFocused()
    await expect(
      main(page).getByRole("heading", { level: 1, name: guide.chapters[0].title }),
    ).toBeVisible()
  })
})
