import { expect, test } from "@playwright/test"

import {
  CHAPTER_WITH_FIGURES,
  GUIDE_ID,
  fetchGuide,
  gotoChapter,
  main,
  titlePattern,
} from "./helpers"

test.describe("navigation", () => {
  test("home lists the published guides and opens a guide", async ({ page }) => {
    await page.goto("/")

    const guideLink = main(page).getByRole("link", { name: /^Alumínio/ }).first()
    await expect(guideLink).toBeVisible()
    await guideLink.click()

    await expect(page).toHaveURL(new RegExp(`/g/${GUIDE_ID}$`))
    await expect(main(page).getByRole("heading", { level: 1, name: "Alumínio" })).toBeVisible()
  })

  test("guide lists its chapters and opens one chapter page", async ({ page, request }) => {
    const guide = await fetchGuide(request, GUIDE_ID)
    await page.goto(`/g/${GUIDE_ID}`)

    const list = main(page).getByRole("list", { name: /capítulos/i })
    await expect(list).toBeVisible()

    const firstChapter = guide.chapters[0]
    await list.getByRole("link", { name: titlePattern(firstChapter.title) }).click()

    await expect(page).toHaveURL(new RegExp(`/g/${GUIDE_ID}/c/${firstChapter.slug}$`))
    await expect(
      main(page).getByRole("heading", { level: 1, name: firstChapter.title }),
    ).toBeVisible()
    await expect(main(page).locator('[data-slot="reader-prose"]')).toBeVisible()

    // One chapter per page: a single h1, and no second chapter's title as a heading.
    await expect(main(page).getByRole("heading", { level: 1 })).toHaveCount(1)
    const other = guide.chapters[1]
    await expect(
      main(page).getByRole("heading", { name: titlePattern(other.title) }),
    ).toHaveCount(0)
  })

  test("prev/next footer walks to the neighbouring chapters and back", async ({
    page,
    request,
  }) => {
    const guide = await fetchGuide(request, GUIDE_ID)
    const [first, middle, last] = [guide.chapters[0], guide.chapters[1], guide.chapters[2]]

    await gotoChapter(page, middle.slug)
    await expect(main(page).getByRole("heading", { level: 1, name: middle.title })).toBeVisible()

    const previous = main(page).getByRole("link", { name: titlePattern(first.title) })
    const next = main(page).getByRole("link", { name: titlePattern(last.title) })
    await expect(previous).toHaveAttribute("href", `/g/${GUIDE_ID}/c/${first.slug}`)
    await expect(next).toHaveAttribute("href", `/g/${GUIDE_ID}/c/${last.slug}`)

    await next.click()
    await expect(page).toHaveURL(new RegExp(`/g/${GUIDE_ID}/c/${last.slug}$`))
    await expect(main(page).getByRole("heading", { level: 1, name: last.title })).toBeVisible()

    await main(page).getByRole("link", { name: titlePattern(middle.title) }).click()
    await expect(page).toHaveURL(new RegExp(`/g/${GUIDE_ID}/c/${middle.slug}$`))
    await expect(main(page).getByRole("heading", { level: 1, name: middle.title })).toBeVisible()
  })

  test("chapter four renders its figures and tables inside the reading column", async ({
    page,
  }) => {
    await gotoChapter(page, CHAPTER_WITH_FIGURES)

    await expect(main(page).locator("figure").first()).toBeVisible()
    await expect(main(page).locator("figure figcaption").first()).not.toBeEmpty()
    // No page-level horizontal scroll on either viewport (375 or 1440 wide).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
