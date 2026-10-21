import { expect, test } from "@playwright/test"

import { main } from "./helpers"

/**
 * SPEC criterion 3: math renders through KaTeX (inline and display), display math
 * scrolls inside its own block, and a table with more than 40 rows stays inside its
 * scroll region on a 375 px viewport without page-level horizontal scroll.
 */
test.describe("reading math and tables", () => {
  test("inline and display math render through KaTeX", async ({ page }) => {
    // magnésio/02 carries both `$…$` inline math and `$$` display blocks.
    await page.goto("/g/magnesio/c/02-propriedades-e-generalidades")
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible()

    await expect(main(page).locator(".katex").first()).toBeVisible()
    await expect(main(page).locator(".katex-display").first()).toBeVisible()

    const inline = await main(page).locator(".katex").count()
    expect(inline).toBeGreaterThanOrEqual(2)

    const block = main(page).locator('[data-slot="math-display"]').first()
    await expect(block).toBeVisible()
    const overflowX = await block.evaluate((element) => getComputedStyle(element).overflowX)
    expect(["auto", "scroll"]).toContain(overflowX)

    // Display math must not push the page sideways.
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(pageOverflow).toBeLessThanOrEqual(1)
  })

  test("a 45-row table scrolls in its own region, not the page", async ({ page }) => {
    await page.goto("/g/dsa/c/09-graphs")
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible()

    const region = main(page).getByRole("region", { name: /tabela/i }).first()
    await expect(region).toBeVisible()
    await expect(region).toHaveAttribute("tabindex", "0")
    const overflowX = await region.evaluate((element) => getComputedStyle(element).overflowX)
    expect(["auto", "scroll"]).toContain(overflowX)

    const rows = await main(page).getByRole("row").count()
    expect(rows).toBeGreaterThanOrEqual(41)

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(pageOverflow).toBeLessThanOrEqual(1)
  })
})
