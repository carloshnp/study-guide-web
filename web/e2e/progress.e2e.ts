import { expect, test } from "@playwright/test"

import { GUIDE_ID, clearProgress, fetchGuide, main, sectionCheckName } from "./helpers"

test.describe("reading progress", () => {
  test("a section marked on this device survives a reload and matches the API", async ({
    page,
    request,
  }) => {
    const guide = await fetchGuide(request, GUIDE_ID)
    await clearProgress(request, guide)

    const chapter = guide.chapters.find((entry) => entry.sections.length > 0)
    expect(chapter, "a chapter with sections").toBeTruthy()
    const target = chapter!
    const section = target.sections[0]

    await page.goto(`/g/${GUIDE_ID}/c/${target.slug}`)
    await expect(main(page).getByRole("heading", { level: 1, name: target.title })).toBeVisible()

    const unitId = `${GUIDE_ID}/${target.slug}/${section.id}`
    const check = main(page).getByRole("checkbox", { name: sectionCheckName(section.title) })
    await expect(check).toBeVisible()
    await expect(check).not.toBeChecked()

    await check.click()
    await expect(check).toBeChecked()

    // The write must have reached SQLite before the reload, or the reload proves nothing.
    await expect
      .poll(async () => {
        const response = await request.get(`/api/progress?guideId=${GUIDE_ID}`)
        const body = (await response.json()) as { units: Record<string, string> }
        return body.units[unitId]
      })
      .toBe("done")

    await page.reload()
    const afterReload = main(page).getByRole("checkbox", {
      name: sectionCheckName(section.title),
    })
    await expect(afterReload).toBeChecked()

    // The guide meter reads the same store, not a local guess.
    const progress = (await (await request.get(`/api/progress?guideId=${GUIDE_ID}`)).json()) as {
      units: Record<string, string>
    }
    const done = Object.values(progress.units).filter((status) => status === "done").length
    await page.goto(`/g/${GUIDE_ID}`)
    const meter = main(page).getByRole("meter").first()
    await expect(meter).toHaveAttribute("aria-valuenow", String(done))
  })
})
