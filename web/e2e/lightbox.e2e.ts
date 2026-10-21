import { expect, test } from "@playwright/test"

import { main } from "./helpers"

test.describe("lightbox", () => {
  test("a figure opens a dialog with the original file and closes on Esc", async ({ page }) => {
    await page.goto("/g/aluminio/c/04-tratamentos-termicos-do-aluminio")
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible()

    const figure = main(page).locator("figure").first()
    await expect(figure).toBeVisible()
    const caption = await figure.locator("figcaption").innerText()
    expect(caption.trim().length).toBeGreaterThan(0)

    const trigger = main(page).getByRole("button", { name: /^Ampliar figura: / }).first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("img")).toBeVisible()

    const original = dialog.getByRole("link", { name: /imagem original/i })
    await expect(original).toHaveAttribute("target", "_blank")
    expect(await original.getAttribute("href")).toContain("/original")

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
