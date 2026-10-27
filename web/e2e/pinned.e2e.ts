import { expect, test, type Page } from "@playwright/test"

import { main } from "./helpers"

/**
 * "Imagem fixa por subcapítulo": the setting, the pinned picture and the text
 * pane, on the phone and on the desktop project. Uses chapter 3 of Titânio, the
 * chapter whose eight subchapters each carry a generated infographic.
 */

const CHAPTER = "/g/titanio/c/03-elementos-intersticiais-e-o-ti-comercialmente-puro"
const SECTION_32 = "32-os-quatro-diagramas-de-fase-e-o-destino-do-excesso"
const SECTION_33 = "33-hidrogenio-endurecimento-em-solucao-e-fragilizacao-por-hidreto"
const SECTION_COUNT = 8

async function usePinnedView(page: Page, on = true): Promise<void> {
  await page.addInitScript((value) => {
    // Seed the choice once per tab: an init script runs again on every reload,
    // and a reload has to keep what the reader chose in the settings.
    if (window.sessionStorage.getItem("e2e-layout-seeded")) return
    window.sessionStorage.setItem("e2e-layout-seeded", "1")
    window.localStorage.setItem(
      "estudos-layout",
      JSON.stringify({
        fontSize: 18,
        gutter: 40,
        mode: "centered",
        readerView: value ? "pinned" : "classic",
      }),
    )
  }, on)
}

/** Scrolls the text pane so the heading sits near its top, like a reader would. */
async function scrollTextTo(page: Page, id: string): Promise<void> {
  // The chapter renders after the page's load event, so wait for the heading.
  await expect(page.locator(`[data-slot="pinned-text"] [id="${id}"]`)).toHaveCount(1)
  await page.evaluate((sectionId) => {
    const pane = document.querySelector<HTMLElement>('[data-slot="pinned-text"]')
    const heading = document.getElementById(sectionId)
    if (!pane || !heading) throw new Error(`no pane or heading ${sectionId}`)
    pane.scrollTop +=
      heading.getBoundingClientRect().top - pane.getBoundingClientRect().top - 40
  }, id)
}

function pinnedImage(page: Page) {
  return page.locator('[data-slot="pinned-image-pane"] img')
}

test.describe("pinned image view", () => {
  test("the classic view stays as it was: continuous text, no section pictures", async ({
    page,
  }) => {
    await usePinnedView(page, false)
    await page.goto(CHAPTER)
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible()

    await expect(page.locator('[data-slot="pinned-reader"]')).toHaveCount(0)
    await expect(main(page).getByRole("img", { name: /^Infográfico/ })).toHaveCount(0)
  })

  test("pins the picture of the section being read and swaps it while scrolling", async ({
    page,
  }) => {
    await usePinnedView(page)
    await page.goto(CHAPTER)
    await expect(page.locator('[data-slot="pinned-reader"]')).toBeVisible()

    // The intro before 3.1 has no picture: the pane is hidden and the text is wide.
    await expect(page.locator('[data-slot="pinned-image-pane"]')).toHaveCount(0)

    // The page itself never scrolls: only the text pane does.
    const spare = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    )
    expect(spare).toBeLessThanOrEqual(2)

    await scrollTextTo(page, SECTION_32)
    await expect(pinnedImage(page)).toBeVisible()
    await expect(pinnedImage(page).first()).toHaveAttribute("alt", /^Infográfico 3\.2/)

    // Fixed means fixed: reading further inside 3.2 does not move the picture.
    const before = await pinnedImage(page).first().boundingBox()
    await page.evaluate(() => {
      const pane = document.querySelector<HTMLElement>('[data-slot="pinned-text"]')
      if (pane) pane.scrollTop += 220
    })
    const after = await pinnedImage(page).first().boundingBox()
    expect(after?.y).toBeCloseTo(before?.y ?? -1, 0)
    await expect(pinnedImage(page).first()).toHaveAttribute("alt", /^Infográfico 3\.2/)

    await scrollTextTo(page, SECTION_33)
    await expect(pinnedImage(page).first()).toHaveAttribute("alt", /^Infográfico 3\.3/)
  })

  test("puts the picture beside the text on desktop and above it on the phone", async ({
    page,
  }, testInfo) => {
    await usePinnedView(page)
    await page.goto(CHAPTER)
    await scrollTextTo(page, SECTION_32)

    const image = await pinnedImage(page).first().boundingBox()
    const text = await page.locator('[data-slot="pinned-text"]').boundingBox()
    expect(image).not.toBeNull()
    expect(text).not.toBeNull()
    if (!image || !text) return

    if (testInfo.project.name === "desktop") {
      expect(image.x + image.width).toBeLessThanOrEqual(text.x + 1)
      expect(image.y).toBeLessThan(text.y + text.height)
    } else {
      expect(image.y + image.height).toBeLessThanOrEqual(text.y + 1)
      expect(image.width).toBeGreaterThan(280)
    }
  })

  test("lists the subchapters on desktop and jumps to one", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the list sits beside the picture only on wide screens")
    await usePinnedView(page)
    await page.goto(`${CHAPTER}#${SECTION_33}`)

    const nav = page.getByRole("navigation", { name: /subcapítulos deste capítulo/i })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole("link")).toHaveCount(SECTION_COUNT + 1)
    await expect(nav.getByRole("link", { name: /^3\.3 / })).toHaveAttribute(
      "aria-current",
      "location",
    )
    await expect(pinnedImage(page).first()).toHaveAttribute("alt", /^Infográfico 3\.3/)

    await nav.getByRole("link", { name: /^3\.5 / }).click()
    await expect(pinnedImage(page).first()).toHaveAttribute("alt", /^Infográfico 3\.5/)
  })

  test("a tap on the picture opens the lightbox with the original file", async ({ page }) => {
    await usePinnedView(page)
    await page.goto(CHAPTER)
    await scrollTextTo(page, SECTION_32)

    await page.getByRole("button", { name: /^Ampliar imagem: / }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("link", { name: /imagem original/i })).toHaveAttribute(
      "href",
      /\/original\./,
    )
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })

  test("the setting in the top bar switches between the two views", async ({ page }) => {
    await usePinnedView(page, false)
    await page.goto(CHAPTER)
    await expect(page.locator('[data-slot="pinned-reader"]')).toHaveCount(0)

    await page.getByRole("button", { name: /configurações de leitura/i }).click()
    const toggle = page.getByRole("switch", { name: /imagem fixa por subcapítulo/i })
    await expect(toggle).not.toBeChecked()
    await toggle.click()
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-slot="pinned-reader"]')).toBeVisible()

    // The choice survives a reload.
    await page.reload()
    await expect(page.locator('[data-slot="pinned-reader"]')).toBeVisible()

    await page.getByRole("button", { name: /configurações de leitura/i }).click()
    await page.getByRole("switch", { name: /imagem fixa por subcapítulo/i }).click()
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-slot="pinned-reader"]')).toHaveCount(0)
  })

  test("a chapter without section pictures keeps the continuous text even with the setting on", async ({
    page,
  }) => {
    await usePinnedView(page)
    await page.goto("/g/aluminio/c/04-tratamentos-termicos-do-aluminio")
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible()

    await expect(page.locator('[data-slot="pinned-reader"]')).toHaveCount(0)
  })
})
