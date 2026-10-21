import { expect, type Locator, type Page, type APIRequestContext } from "@playwright/test"

/** The routed page region; the sidebar lives outside it, so scoping avoids double hits. */
export function main(page: Page): Locator {
  return page.locator("main#conteudo")
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** A regex that matches a chapter title anywhere in an accessible name. */
export function titlePattern(title: string): RegExp {
  return new RegExp(escapeRegExp(title), "i")
}

/** The accessible name `SectionCheck` gives its checkbox for a heading. */
export function sectionCheckName(title: string): RegExp {
  return new RegExp(`^Marcar "${escapeRegExp(title)}" como lido$`)
}

export type ChapterSummary = {
  id: string
  slug: string
  title: string
  number: number
  sections: { id: string; title: string }[]
}

export type GuideJson = {
  id: string
  title: string
  chapters: ChapterSummary[]
}

/** Reads a guide's TOC straight from the published content, not from the DOM. */
export async function fetchGuide(
  request: APIRequestContext,
  guideId: string,
): Promise<GuideJson> {
  const response = await request.get(`/content/guides/${guideId}/guide.json`)
  expect(response.ok(), `guide.json for ${guideId}`).toBeTruthy()
  return (await response.json()) as GuideJson
}

/** The guide and chapter used by the flows; chapter 4 is the one the SPEC names. */
export const GUIDE_ID = "aluminio"
export const CHAPTER_WITH_FIGURES = "04-tratamentos-termicos-do-aluminio"

export async function gotoChapter(page: Page, slug: string): Promise<void> {
  await page.goto(`/g/${GUIDE_ID}/c/${slug}`)
  await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible()
}

/** Clears every progress unit of a guide through the API, so a run starts clean. */
export async function clearProgress(
  request: APIRequestContext,
  guide: GuideJson,
): Promise<void> {
  const units: string[] = []
  for (const chapter of guide.chapters) {
    if (chapter.sections.length === 0) {
      units.push(`${guide.id}/${chapter.slug}`)
    } else {
      for (const section of chapter.sections) {
        units.push(`${guide.id}/${chapter.slug}/${section.id}`)
      }
    }
  }
  for (const unitId of units) {
    const response = await request.put("/api/progress", {
      data: { guideId: guide.id, unitId, status: "absent" },
    })
    expect(response.ok(), `clearing ${unitId}`).toBeTruthy()
  }
}
