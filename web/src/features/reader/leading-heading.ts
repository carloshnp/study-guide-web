/**
 * Heading normalisation for the reader.
 *
 * The chapter JSON keeps the source markdown verbatim, so a chapter body still
 * opens with its own heading: `## 1. O alumínio…` for split-2 guides, `# Chapter
 * 1 …` for split-1 guides and `# Banco de questões …` for a promoted appendix.
 * The chapter page already renders that title as the only h1
 * (`heading-hierarchy`), so the body heading is either
 *
 *   - a plain duplicate of the title  → drop it, or
 *   - a level-1 heading of its own    → demote it to h2.
 *
 * Either way the rest of the body is re-rooted under the page h1 by shifting its
 * headings: a split-2 chapter's `###` sections become `h2`, a split-1 chapter's
 * `h2` sections stay `h2`, and a demoted cover title pushes its `h2`s to `h3`.
 * Without that shift the page would jump h1 → h3 (a skipped level) or flatten
 * every section into a peer of the title.
 *
 * `normalizeHeadingKey` is also what links a markdown heading to the section id
 * the build assigned, because the two texts differ only in numbering and
 * punctuation (`1.1 Obtenção` vs `Obtenção`).
 *
 * `prepareChapterBody` returns the shifted section list along with the markdown,
 * so the rendered headings and the table of contents agree on level and id.
 */

import type { ChapterSection } from "@/lib/content"

const ATX_HEADING = /^(#{1,6})[ \t]+(.*)$/
const FENCE_OPEN = /^[ \t]*(```|~~~)/
const CLOSING_HASHES = /[ \t]+#+[ \t]*$/
const LEADING_NUMBERING = /^\d+(?:\.\d+)*\.?[ \t]+/
const CHAPTER_WORD = /^(?:cap[ií]tulo|chapter|parte|part)[ \t]+\d+[ \t]*[:.\-–—]?[ \t]*/i
const DIACRITICS = /\p{M}/gu
const LATEX_TEXT = /\\text\{([^{}]*)\}/g
const LATEX_COMMAND = /\\[a-zA-Z]+/g
const LATEX_NOISE = /[{}$_^]/g

/**
 * Folds accents, case, numbering, LaTeX markup and punctuation so two heading
 * texts compare. Section titles built from headings that contain math keep the
 * raw `$\text{Mg}_2\text{Si}$` in their `title`, while the rendered heading only
 * exposes `Mg2Si`; stripping the markup on both sides is what keeps the anchor
 * pointing at the heading instead of a fallback slug.
 */
export function normalizeHeadingKey(text: string): string {
  const stripped = text
    .replace(CLOSING_HASHES, "")
    .trim()
    .replace(CHAPTER_WORD, "")
    .replace(LEADING_NUMBERING, "")
    .replace(LATEX_TEXT, "$1")
    .replace(LATEX_COMMAND, "")
    .replace(LATEX_NOISE, "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()

  return stripped.replace(/[^\p{L}\p{N}]+/gu, "")
}

/**
 * Section lookup for a rendered heading, in document order. Chapters repeat
 * headings (`Resposta`, `Termos introduzidos`), so a text→section map alone
 * loses the second occurrence and leaves that idd anchorless; this resolver
 * hands out each stored section once, in the order the headings appear.
 */
export function createSectionResolver(
  sections: readonly ChapterSection[],
): (text: string, level?: number) => ChapterSection | undefined {
  const queues = new Map<string, ChapterSection[]>()
  const consumed = new Set<string>()
  const take = (section: ChapterSection): ChapterSection => {
    consumed.add(section.id)
    return section
  }
  for (const section of sections) {
    const key = normalizeHeadingKey(section.title)
    if (key === "") continue
    const queue = queues.get(key)
    if (queue) queue.push(section)
    else queues.set(key, [section])
  }

  return (text: string, level?: number) => {
    const key = normalizeHeadingKey(text)
    if (key === "") return undefined

    const exact = queues.get(key)
    if (exact && exact.length > 0) {
      const next = exact.shift()
      if (next) return take(next)
    }

    // Math headings: KaTeX exposes both the source and the annotation, so the
    // rendered text carries the formula more than once. The prose before the
    // first formula is enough to identify the section.
    const head = normalizeHeadingKey(text.split(/\\text\{|\$/)[0] ?? "")
    const candidates = [key, head].filter((candidate) => candidate.length >= 16)
    for (const probe of candidates) {
      const prefix = probe.slice(0, 48)
      for (const [candidate, queue] of queues) {
        if (queue.length === 0) continue
        if (candidate.startsWith(prefix) || probe.startsWith(candidate.slice(0, 48))) {
          const next = queue.shift()
          if (next) return take(next)
        }
      }
    }

    // Last resort: the sections were collected in document order, so the next
    // unconsumed section at the same heading level is the one being rendered.
    if (level !== undefined) {
      for (const section of sections) {
        if (section.level === level && !consumed.has(section.id)) return take(section)
      }
    }
    return undefined
  }
}

/**
 * Section lookup for a rendered heading. Exact normalised match first; when the
 * rendered text and the stored title diverge past the LaTeX (KaTeX exposes the
 * formula as MathML annotation text too), a long shared prefix is enough, since
 * a chapter's sections are distinct well before 48 characters.
 */
export function findSectionIn(
  index: ReadonlyMap<string, ChapterSection>,
  text: string,
): ChapterSection | undefined {
  const key = normalizeHeadingKey(text)
  if (key === "") return undefined

  const exact = index.get(key)
  if (exact) return exact

  const prefix = key.slice(0, 48)
  if (prefix.length < 16) return undefined
  for (const [candidate, section] of index) {
    if (candidate.startsWith(prefix) || key.startsWith(candidate.slice(0, 48))) return section
  }
  return undefined
}

/** Stable ASCII slug for a heading the build did not list as a section. */
export function slugifyHeading(text: string): string {
  const slug = text
    .replace(CLOSING_HASHES, "")
    .trim()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug === "" ? "secao" : slug
}

/**
 * Section id per normalised heading text. The first section wins: duplicate
 * titles inside one chapter keep their document order.
 */
export function buildSectionIndex(
  sections: readonly ChapterSection[],
): ReadonlyMap<string, ChapterSection> {
  const index = new Map<string, ChapterSection>()
  for (const section of sections) {
    const key = normalizeHeadingKey(section.title)
    if (key !== "" && !index.has(key)) index.set(key, section)
  }
  return index
}

type NormalizedBody = {
  markdown: string
  /** Levels every remaining heading moved by; negative means up. */
  shift: number
}

function normalizeBody(markdown: string, title: string): NormalizedBody {
  const lines = markdown.split("\n")

  let cursor = 0
  while (cursor < lines.length && lines[cursor].trim() === "") cursor += 1
  if (cursor >= lines.length) return { markdown, shift: 0 }
  if (FENCE_OPEN.test(lines[cursor])) return { markdown, shift: 0 }

  const heading = ATX_HEADING.exec(lines[cursor])
  if (!heading) return { markdown, shift: 0 }

  const level = heading[1].length
  const text = heading[2].replace(CLOSING_HASHES, "").trim()

  if (normalizeHeadingKey(text) === normalizeHeadingKey(title)) {
    const rest = lines.slice(cursor + 1)
    while (rest.length > 0 && rest[0].trim() === "") rest.shift()
    // Children of the removed heading move up so the body starts at h2.
    const shift = -(level - 1)
    return {
      markdown: shift === 0 ? rest.join("\n") : shiftHeadings(rest.join("\n"), shift),
      shift,
    }
  }

  if (level === 1) {
    const rest = lines.slice(cursor + 1).join("\n")
    return { markdown: `## ${text}\n${shiftHeadings(rest, 1)}`, shift: 1 }
  }

  return { markdown, shift: 0 }
}

/**
 * Drops or demotes the chapter's own leading heading so the body starts below the
 * page h1. Returns the markdown unchanged when the first block is not a heading
 * (a fence, a paragraph) or when the heading already sits at h2 or deeper and
 * does not repeat the title.
 */
export function normalizeLeadingHeading(markdown: string, title: string): string {
  return normalizeBody(markdown, title).markdown
}

export type PreparedChapterBody = {
  markdown: string
  /** Sections with the levels the rendered headings actually use. */
  sections: ChapterSection[]
  shift: number
}

/**
 * The pair the chapter route needs: markdown ready to render, and the section
 * list with matching levels (ids are the build's and never change).
 */
export function prepareChapterBody(
  markdown: string,
  title: string,
  sections: readonly ChapterSection[] = [],
): PreparedChapterBody {
  const { markdown: prepared, shift } = normalizeBody(markdown, title)

  return {
    markdown: prepared,
    sections: shift === 0 ? [...sections] : sections.map((section) => ({
      ...section,
      level: clampLevel(section.level + shift),
    })),
    shift,
  }
}

/**
 * Body for a "guia resumido". The resumo opens with its own `# Resumo: …` title,
 * which the page h1 already covers, so that line is dropped and the `###`
 * sections are lifted one level to sit where the chapter's own top-level
 * headings sit. Section ids stay the build's, because the text is untouched:
 * the in-page TOC and the progress checks keep pointing at the same anchors.
 */
export function prepareResumoBody(markdown: string): string {
  const lines = markdown.split("\n")

  let cursor = 0
  while (cursor < lines.length && lines[cursor].trim() === "") cursor += 1
  if (cursor >= lines.length) return markdown

  const heading = ATX_HEADING.exec(lines[cursor].trim())
  if (!heading || heading[1].length !== 1) return markdown

  const rest = lines.slice(cursor + 1)
  while (rest.length > 0 && rest[0].trim() === "") rest.shift()
  return shiftHeadings(rest.join("\n"), -1)
}

/** Headings stay inside the h2–h4 band the progress model and the TOC use. */
function clampLevel(level: number): ChapterSection["level"] {
  if (level <= 2) return 2
  if (level >= 4) return 4
  return level as ChapterSection["level"]
}

/**
 * Moves every ATX heading by `delta` levels (positive down, negative up), capped
 * at h1–h6, fence-aware: `#` inside a fence is a comment, never a heading.
 */
export function shiftHeadings(markdown: string, delta: number): string {
  if (delta === 0) return markdown

  let fenced = false
  return markdown
    .split("\n")
    .map((line) => {
      if (FENCE_OPEN.test(line)) {
        fenced = !fenced
        return line
      }
      if (fenced) return line

      const heading = ATX_HEADING.exec(line)
      if (!heading) return line

      const level = Math.min(6, Math.max(1, heading[1].length + delta))
      return `${"#".repeat(level)} ${heading[2]}`
    })
    .join("\n")
}
