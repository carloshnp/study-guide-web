import { describe, expect, it } from "vitest"

import {
  countUnits,
  makeUnitId,
  parseUnitId,
  percentDone,
  statusOf,
  summarizeByChapter,
  type ProgressStatus,
} from "@/lib/progress"

const GUIDE = "aluminio"
const CHAPTER_ONE = "01-o-aluminio"
const CHAPTER_TWO = "02-ligas"

/** One h2, two nested h3 under it, one h4 under an h3, plus a chapter-level unit. */
const UNITS = [
  makeUnitId(GUIDE, CHAPTER_ONE, "1-introducao"),
  makeUnitId(GUIDE, CHAPTER_ONE, "11-propriedades"),
  makeUnitId(GUIDE, CHAPTER_ONE, "111-ligas-leves"),
  makeUnitId(GUIDE, CHAPTER_ONE, "112-tempera"),
  makeUnitId(GUIDE, CHAPTER_TWO),
  makeUnitId(GUIDE, CHAPTER_TWO, "21-fundicao"),
]

describe("progress unit ids", () => {
  it("builds a three-segment id and parses it back", () => {
    const unitId = makeUnitId(GUIDE, CHAPTER_ONE, "11-propriedades")

    expect(unitId).toBe("aluminio/01-o-aluminio/11-propriedades")
    expect(parseUnitId(unitId)).toEqual({
      chapterSlug: CHAPTER_ONE,
      guideId: GUIDE,
      sectionId: "11-propriedades",
    })
  })

  it("treats a chapter without sections as its own two-segment unit", () => {
    expect(makeUnitId(GUIDE, CHAPTER_TWO)).toBe("aluminio/02-ligas")
    expect(parseUnitId("aluminio/02-ligas")).toEqual({
      chapterSlug: CHAPTER_TWO,
      guideId: GUIDE,
      sectionId: null,
    })
  })

  it("rejects ids that do not fit the contract", () => {
    expect(parseUnitId("")).toBeNull()
    expect(parseUnitId("aluminio")).toBeNull()
    expect(parseUnitId("aluminio//x")).toBeNull()
    expect(parseUnitId("aluminio/a/b/c")).toBeNull()
  })
})

describe("progress aggregation", () => {
  it("counts each unit once and rolls nested units up to chapter and guide", () => {
    const statuses: Record<string, ProgressStatus> = {
      [makeUnitId(GUIDE, CHAPTER_ONE, "1-introducao")]: "done",
      [makeUnitId(GUIDE, CHAPTER_ONE, "11-propriedades")]: "review",
      [makeUnitId(GUIDE, CHAPTER_ONE, "111-ligas-leves")]: "done",
      [makeUnitId(GUIDE, CHAPTER_TWO, "21-fundicao")]: "review",
    }

    const summary = summarizeByChapter(GUIDE, UNITS, statuses)

    // Four nested units under chapter one, two under chapter two.
    expect(summary.chapters[CHAPTER_ONE]).toEqual({ done: 2, review: 1, total: 4 })
    expect(summary.chapters[CHAPTER_TWO]).toEqual({ done: 0, review: 1, total: 2 })
    expect(summary.guide).toEqual({ done: 2, review: 2, total: 6 })
  })

  it("counts absent and unknown units in the total but in neither state", () => {
    const statuses = { [makeUnitId(GUIDE, CHAPTER_ONE, "1-introducao")]: "absent" as const }

    expect(countUnits(UNITS, statuses)).toEqual({ done: 0, review: 0, total: 6 })
    expect(statusOf(statuses, makeUnitId(GUIDE, CHAPTER_ONE, "1-introducao"))).toBe("absent")
    expect(statusOf(statuses, "aluminio/unknown/x")).toBe("absent")
  })

  it("ignores units that belong to another guide", () => {
    const statuses = { "titanio/01-x/11-y": "done" as const }
    const units = ["titanio/01-x/11-y", makeUnitId(GUIDE, CHAPTER_ONE, "1-introducao")]

    const summary = summarizeByChapter(GUIDE, units, statuses)

    expect(summary.guide).toEqual({ done: 0, review: 0, total: 1 })
    expect(summary.chapters).toEqual({ [CHAPTER_ONE]: { done: 0, review: 0, total: 1 } })
  })

  it("rounds percent, clamps it and survives a guide with no units", () => {
    expect(percentDone({ done: 1, review: 0, total: 3 })).toBe(33)
    expect(percentDone({ done: 2, review: 1, total: 3 })).toBe(67)
    expect(percentDone({ done: 3, review: 2, total: 3 })).toBe(100)
    expect(percentDone({ done: 0, review: 0, total: 0 })).toBe(0)
  })
})
