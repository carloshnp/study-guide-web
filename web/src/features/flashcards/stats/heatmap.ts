/**
 * Heatmap geometry for the stats page.
 *
 * Dates are handled as `YYYY-MM-DD` strings and local calendar days, never as
 * UTC instants: a review at 22:00 in São Paulo belongs to that day, and the
 * backend stores the same string. Columns are weeks (Sunday → Saturday), the
 * last column is the week of the most recent activity (or today), and days after
 * that are flagged so the grid does not invent empty future cells.
 */

import type { StatsDay } from "../api"

export const HEAT_LEVELS = [0, 1, 2, 3, 4] as const

export type HeatLevel = (typeof HEAT_LEVELS)[number]

export type HeatCell = {
  date: string
  reviews: number
  level: HeatLevel
  isFuture: boolean
}

export type Heatmap = {
  columns: HeatCell[][]
  activeDays: number
  totalReviews: number
}

/** 0 = no review, then 1–4 in quarters of the busiest day of the window. */
export function heatLevel(reviews: number, max: number): HeatLevel {
  if (reviews <= 0) return 0
  if (max <= 1) return 2
  const ratio = reviews / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

export function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  copy.setDate(copy.getDate() + days)
  return copy
}

export function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay())
}

export function buildHeatmap(
  daily: readonly StatsDay[],
  options: { weeks?: number; today?: Date } = {},
): Heatmap {
  const weeks = options.weeks ?? 14
  const today = options.today ?? new Date()
  const byDate = new Map(daily.map((entry) => [entry.date, entry.reviews]))

  const latestDate = daily.reduce<Date>((latest, entry) => {
    const parsed = parseIsoDate(entry.date)
    return parsed && parsed > latest ? parsed : latest
  }, today)

  const max = daily.reduce((value, entry) => Math.max(value, entry.reviews), 0)
  const lastWeek = startOfWeek(latestDate)
  const columns: HeatCell[][] = []

  for (let week = weeks - 1; week >= 0; week -= 1) {
    const weekStart = addDays(lastWeek, -7 * week)
    const column: HeatCell[] = []
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(weekStart, day)
      const iso = isoDate(date)
      const reviews = byDate.get(iso) ?? 0
      column.push({
        date: iso,
        isFuture: date > latestDate,
        level: heatLevel(reviews, max),
        reviews,
      })
    }
    columns.push(column)
  }

  return {
    activeDays: daily.filter((entry) => entry.reviews > 0).length,
    columns,
    totalReviews: daily.reduce((sum, entry) => sum + entry.reviews, 0),
  }
}
