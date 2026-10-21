/**
 * Domain model for reading progress.
 *
 * A unit id is `<guideId>/<chapterSlug>/<sectionId>`, or `<guideId>/<chapterSlug>`
 * when the chapter has no sections and is therefore its own unit. Heading levels
 * H2/H3/H4 are flattened into this one list; a heading counts its own state only,
 * never its children's, so no unit is counted twice.
 *
 * Aggregation rolls the flat unit list up to each chapter and to the guide:
 * `done` and `review` are disjoint, `total` includes units in the `absent` state.
 * Review units count as *not done* (MASTER.md › Progress UI) and are surfaced
 * separately so the reader can see what is left to revisit.
 *
 * Pure functions only: no I/O, no React. The hooks and the meters both call these.
 */

export const PROGRESS_STATUSES = ["done", "review", "absent"] as const

/** Stored states plus `absent`, which means "no row in the store". */
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number]

/** States the API persists; `absent` is written but never stored. */
export type StoredProgressStatus = Exclude<ProgressStatus, "absent">

/** Counts for one chapter or for the whole guide. */
export type ProgressCounts = {
  done: number
  review: number
  total: number
}

/** A unit id split back into its parts; `sectionId` is null for chapter units. */
export type ParsedUnitId = {
  guideId: string
  chapterSlug: string
  sectionId: string | null
}

/** Per-chapter counts plus the guide total. */
export type ProgressSummary = {
  chapters: Record<string, ProgressCounts>
  guide: ProgressCounts
}

const UNIT_SEGMENT_COUNTS = new Set([2, 3])

export function emptyCounts(): ProgressCounts {
  return { done: 0, review: 0, total: 0 }
}

export function isProgressStatus(value: unknown): value is ProgressStatus {
  return typeof value === "string" && (PROGRESS_STATUSES as readonly string[]).includes(value)
}

/** Build the canonical unit id for a section, or for the chapter itself. */
export function makeUnitId(
  guideId: string,
  chapterSlug: string,
  sectionId?: string | null,
): string {
  const section = sectionId?.trim()
  return section ? `${guideId}/${chapterSlug}/${section}` : `${guideId}/${chapterSlug}`
}

/** Split a unit id, or return null when it does not fit the contract. */
export function parseUnitId(unitId: string): ParsedUnitId | null {
  const segments = unitId.split("/")
  if (!UNIT_SEGMENT_COUNTS.has(segments.length)) return null
  if (segments.some((segment) => !segment || segment !== segment.trim())) return null
  const [guideId, chapterSlug, sectionId] = segments as [string, string, string?]
  return { chapterSlug, guideId, sectionId: sectionId ?? null }
}

/** State of one unit; anything unset or `absent` reads as `absent`. */
export function statusOf(
  statuses: Readonly<Record<string, ProgressStatus | undefined>>,
  unitId: string,
): ProgressStatus {
  const status = statuses[unitId]
  return status === "done" || status === "review" ? status : "absent"
}

function tally(counts: ProgressCounts, status: ProgressStatus): void {
  counts.total += 1
  if (status === "done") counts.done += 1
  else if (status === "review") counts.review += 1
}

/** Aggregate a flat unit list into counts; absent units still count as total. */
export function countUnits(
  unitIds: readonly string[],
  statuses: Readonly<Record<string, ProgressStatus | undefined>>,
): ProgressCounts {
  const counts = emptyCounts()
  for (const unitId of unitIds) tally(counts, statusOf(statuses, unitId))
  return counts
}

/**
 * Roll units up to their chapter and to the guide.
 *
 * Units that belong to another guide (or that do not parse) are ignored, so a
 * caller can hand over a mixed list without filtering it first.
 */
export function summarizeByChapter(
  guideId: string,
  unitIds: readonly string[],
  statuses: Readonly<Record<string, ProgressStatus | undefined>>,
): ProgressSummary {
  const guide = emptyCounts()
  const chapters: Record<string, ProgressCounts> = {}

  for (const unitId of unitIds) {
    const parsed = parseUnitId(unitId)
    if (!parsed || parsed.guideId !== guideId) continue
    const status = statusOf(statuses, unitId)
    const chapter = (chapters[parsed.chapterSlug] ??= emptyCounts())
    tally(chapter, status)
    tally(guide, status)
  }

  return { chapters, guide }
}

/** Done share of the total, rounded and clamped; a guide with no units is 0%. */
export function percentDone(counts: ProgressCounts): number {
  if (counts.total <= 0) return 0
  const percent = Math.round((counts.done / counts.total) * 100)
  return Math.min(100, Math.max(0, percent))
}
