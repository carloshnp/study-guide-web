/**
 * Which section of the chapter the reader is on, for the pinned image.
 *
 * Pure on purpose: the DOM measuring lives in `PinnedReader`, the rule lives here
 * where jsdom can test it. A section becomes active when its heading rises to the
 * reading line, and stays active until the next heading gets there, so the image
 * changes when the reader starts the next subchapter and not before.
 */

export type SectionTop = {
  id: string
  /** Heading top in the same coordinate space as `line`. */
  top: number
}

/**
 * @param tops     headings in document order
 * @param line     the reading line; headings at or above it have been reached
 * @param atBottom the text pane is scrolled to its end, so the last section is
 *                 the one being read even if its heading never reached the line
 * @returns the id of the active section, or `null` before the first heading
 */
export function pickActiveSection(
  tops: readonly SectionTop[],
  line: number,
  atBottom = false,
): string | null {
  if (tops.length === 0) return null
  if (atBottom) return tops[tops.length - 1].id

  let active: string | null = null
  for (const entry of tops) {
    if (entry.top > line) break
    active = entry.id
  }
  return active
}

/** Where the reading line sits inside the text pane: 30% down, at least 96px. */
export function readingLineOffset(paneHeight: number): number {
  return Math.max(96, paneHeight * 0.3)
}
