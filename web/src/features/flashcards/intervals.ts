/**
 * Interval labels for the four rating buttons.
 *
 * The scheduler lives on the server and is the only authority: after a rating,
 * the UI shows exactly the `nextIntervalDays` that came back. Before the rating
 * there is nothing to show yet, so this module produces an **estimate** from the
 * card state so each button can say what it will do. It is deliberately simple
 * and monotonic (Again < Hard < Good < Easy) — never a second scheduler.
 */

import type { CardState, ReviewRating } from "./api"

/** `0.007` days → `10m`; `4` → `4d`; `45` → `2m` is never produced (months use `mês`). */
export function formatInterval(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return "0m"
  const minutes = days * 24 * 60
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`
  const hours = minutes / 60
  if (hours < 24) return `${Math.round(hours)}h`
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) return `${Math.round(days / 30)}mês`
  return `${Math.round(days / 365)}a`
}

export type IntervalPreview = Record<ReviewRating, string>

/**
 * Estimated intervals in days per rating. `learning` uses the short steps the
 * spec locks (Again 1m, Good 10m, Easy 4d); `review` uses expanding days.
 */
export function estimateIntervalDays(state: CardState | undefined): Record<ReviewRating, number> {
  if (state === "review") return { 1: 1, 2: 3, 3: 7, 4: 14 }
  if (state === "learning") return { 1: 1 / 1440, 2: 6 / 1440, 3: 10 / 1440, 4: 4 }
  return { 1: 1 / 1440, 2: 6 / 1440, 3: 10 / 1440, 4: 4 }
}

export function previewIntervals(state: CardState | undefined): IntervalPreview {
  const days = estimateIntervalDays(state)
  return {
    1: formatInterval(days[1]),
    2: formatInterval(days[2]),
    3: formatInterval(days[3]),
    4: formatInterval(days[4]),
  }
}
