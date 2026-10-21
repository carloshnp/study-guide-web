import { expect, test } from "@playwright/test"

import { main } from "./helpers"

test.describe("search", () => {
  test("an unaccented query finds accented chapters and lands on the right page", async ({
    page,
  }) => {
    await page.goto("/busca")

    const input = main(page).getByRole("searchbox", { name: "Buscar no conteúdo" })
    await expect(input).toBeVisible()
    await input.fill("magnesio")

    // The corpus is fetched from /content/search.json; give it a moment to index.
    const results = main(page).locator('a[href^="/g/"]')
    await expect(results.first()).toBeVisible()

    const hrefs = await results.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    )
    expect(hrefs.length).toBeGreaterThan(0)
    // "magnésio" is also discussed inside the alumínio and titânio guides, so the
    // corpus returns those too; the accented guide must be among the hits.
    expect(hrefs.some((href) => href.startsWith("/g/magnesio/c/"))).toBe(true)

    await main(page).locator('a[href^="/g/magnesio/c/"]').first().click()

    await expect(page).toHaveURL(/\/g\/magnesio\/c\//)
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible()
    const prose = main(page).locator('[data-slot="reader-prose"]')
    await expect(prose).toBeVisible()
    await expect(prose).toContainText(/magn[ée]sio/i)
  })

  test("the covers page filters subjects without accents", async ({ page }) => {
    await page.goto("/estantes")

    const filter = main(page).getByLabel("Filtrar por disciplina")
    await expect(filter).toBeVisible()
    await filter.fill("programacao")

    const status = main(page).getByRole("status")
    await expect(status).toContainText(/guia[s]? para/i)

    // "Programação" stays because the filter folds accents; "Metalurgia" goes away.
    await expect(main(page).getByRole("heading", { name: "Programação" })).toBeVisible()
    await expect(main(page).getByRole("heading", { name: "Metalurgia" })).toHaveCount(0)
    await expect(main(page).getByRole("link", { name: /Estruturas de Dados/i }).first()).toBeVisible()
  })
})
