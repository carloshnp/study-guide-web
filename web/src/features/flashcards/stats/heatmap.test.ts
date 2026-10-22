import { describe, expect, it } from "vitest"

import { addDays, buildHeatmap, heatLevel, isoDate, parseIsoDate, startOfWeek } from "./heatmap"

describe("heat levels", () => {
  it("is zero without reviews and scales with the busiest day", () => {
    expect(heatLevel(0, 40)).toBe(0)
    expect(heatLevel(1, 40)).toBe(1)
    expect(heatLevel(10, 40)).toBe(1)
    expect(heatLevel(20, 40)).toBe(2)
    expect(heatLevel(30, 40)).toBe(3)
    expect(heatLevel(40, 40)).toBe(4)
  })

  it("never divides by zero", () => {
    expect(heatLevel(1, 0)).toBe(2)
  })
})

describe("calendar helpers", () => {
  it("formats and parses a local date without a timezone shift", () => {
    const date = new Date(2026, 9, 22)
    expect(isoDate(date)).toBe("2026-10-22")
    expect(isoDate(parseIsoDate("2026-10-22") as Date)).toBe("2026-10-22")
    expect(parseIsoDate("sem data")).toBeNull()
  })

  it("walks days and finds the Sunday of a week", () => {
    const thursday = new Date(2026, 9, 22)
    expect(isoDate(addDays(thursday, -1))).toBe("2026-10-21")
    expect(isoDate(startOfWeek(thursday))).toBe("2026-10-18")
  })
})

describe("buildHeatmap", () => {
  const daily = [
    { date: "2026-10-20", newCards: 2, reviews: 4 },
    { date: "2026-10-21", newCards: 0, reviews: 12 },
    { date: "2026-10-22", newCards: 1, reviews: 1 },
  ]

  it("builds whole weeks, Sunday to Saturday, ending on the last activity week", () => {
    const heatmap = buildHeatmap(daily, { today: new Date(2026, 9, 22), weeks: 3 })

    expect(heatmap.columns).toHaveLength(3)
    for (const column of heatmap.columns) expect(column).toHaveLength(7)
    expect(heatmap.columns.at(-1)?.[4]?.date).toBe("2026-10-22")
    expect(heatmap.columns.at(-1)?.[4]?.reviews).toBe(1)
  })

  it("flags days after the last activity as future instead of empty", () => {
    const heatmap = buildHeatmap(daily, { today: new Date(2026, 9, 22), weeks: 2 })
    const lastColumn = heatmap.columns.at(-1) ?? []

    expect(lastColumn[5]?.isFuture).toBe(true)
    expect(lastColumn[4]?.isFuture).toBe(false)
  })

  it("summarises active days and total reviews", () => {
    const heatmap = buildHeatmap(daily, { today: new Date(2026, 9, 22), weeks: 2 })
    expect(heatmap.activeDays).toBe(3)
    expect(heatmap.totalReviews).toBe(17)
  })
})
