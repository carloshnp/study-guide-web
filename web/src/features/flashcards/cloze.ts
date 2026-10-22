/**
 * Anki-style cloze source: `{{c1::resposta}}` or `{{c1::resposta::dica}}`.
 *
 * The parse is pure and lossless: `parts` keeps the original text so the editor
 * can rebuild the source, and `blanks` lists each lacuna once (in `c1, c2…`
 * order) so the preview can name them. Rendering returns markdown instead of
 * React nodes, because both the editor preview and the review card go through
 * the one `MarkdownRenderer` the reader already uses.
 *
 * A cloze note without any lacuna is invalid: the editor catches it before the
 * save, and the review renders the source unchanged instead of an empty card.
 */

export type ClozeBlank = {
  /** `c1` → 1. */
  index: number
  answer: string
  hint: string | null
}

export type ClozePart =
  | { type: "text"; text: string }
  | { type: "blank"; index: number; answer: string; hint: string | null }

export type Cloze = {
  parts: ClozePart[]
  blanks: ClozeBlank[]
}

/** `{{c1::…}}` with an optional `::hint`, non-greedy so two lacunas stay apart. */
export const CLOZE_PATTERN = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g

export function hasCloze(text: string): boolean {
  return new RegExp(CLOZE_PATTERN.source).test(text)
}

export function parseCloze(source: string): Cloze {
  const parts: ClozePart[] = []
  const blanks: ClozeBlank[] = []
  const seen = new Set<number>()
  const pattern = new RegExp(CLOZE_PATTERN.source, "g")
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(source)) !== null) {
    const index = Number(match[1])
    const answer = (match[2] ?? "").trim()
    const hint = match[3] === undefined ? null : match[3].trim()
    if (match.index > cursor) {
      parts.push({ text: source.slice(cursor, match.index), type: "text" })
    }
    parts.push({ answer, hint, index, type: "blank" })
    if (!seen.has(index)) {
      seen.add(index)
      blanks.push({ answer, hint, index })
    }
    cursor = match.index + match[0].length
  }

  if (cursor < source.length) {
    parts.push({ text: source.slice(cursor), type: "text" })
  }

  blanks.sort((left, right) => left.index - right.index)
  return { blanks, parts }
}

export function clozeBlankCount(source: string): number {
  return parseCloze(source).blanks.length
}

export type ClozeRenderOptions = {
  /**
   * Template being reviewed (`cloze:c2`): that lacuna stays hidden while the
   * others are revealed, matching what the scheduler asks the learner to recall.
   */
  hidden?: number
  /** Show every lacuna (answer side). */
  revealAll?: boolean
}

function renderBlank(blank: ClozeBlank, options: ClozeRenderOptions): string {
  if (options.revealAll === true) return `**${blank.answer}**`
  if (options.hidden === undefined) return "**[…]**"
  return blank.index === options.hidden ? "**[…]**" : `**${blank.answer}**`
}

/** Question side: every lacuna becomes a numbered blank placeholder. */
export function clozeQuestionMarkdown(source: string, options: ClozeRenderOptions = {}): string {
  return parseCloze(source)
    .parts.map((part) =>
      part.type === "text" ? part.text : renderBlank(part as ClozeBlank, options),
    )
    .join("")
}

/** Answer side: every lacuna becomes its text, in bold. */
export function clozeAnswerMarkdown(source: string): string {
  return clozeQuestionMarkdown(source, { revealAll: true })
}

/** Preview for the editor: the question markdown plus one line per lacuna. */
export function clozePreview(source: string): { answers: string[]; question: string } {
  return {
    answers: parseCloze(source).blanks.map((blank) => blank.answer),
    question: clozeQuestionMarkdown(source),
  }
}

/** `cloze:c1` → 1; `basic`/`reverse` → null. */
export function clozeIndexFromTemplate(template: string): number | null {
  const match = /^cloze:c(\d+)$/.exec(template)
  return match?.[1] ? Number(match[1]) : null
}

/**
 * The markdown to show for a card front, whichever kind it is: a cloze hides
 * only the lacuna the card's template asks for; the rest are already revealed.
 */
export function questionForCard(input: {
  kind: string
  front: string
  template: string
}): string {
  if (input.kind !== "cloze") return input.front
  return clozeQuestionMarkdown(input.front, {
    hidden: clozeIndexFromTemplate(input.template) ?? undefined,
  })
}

/**
 * The markdown to show as the answer of a card.
 *
 * The queue sends a cloze prompt already rendered (its lacuna hidden), so the
 * source only yields the answer while it still carries `{{cN::…}}`; otherwise
 * the answer has to come from the note (`answerFromNote`). A `back` field, when
 * the server includes one, always wins.
 */
export function answerForCard(input: {
  back?: string
  front: string
  kind: string
  template: string
}): string {
  if (input.back !== undefined && input.back.trim() !== "") return input.back
  if (input.kind === "cloze" && hasCloze(input.front)) return clozeAnswerMarkdown(input.front)
  return ""
}

/**
 * Answer markdown from the authored note: a cloze reveals its lacunas (plus the
 * note's own back matter), a reverse card answers with the note front, and a
 * basic card answers with the note back.
 */
export function answerFromNote(
  note: { back: string; front: string; kind: string },
  template: string,
): string {
  if (note.kind === "cloze") {
    const answer = clozeAnswerMarkdown(note.front)
    return note.back.trim() === "" ? answer : `${answer}\n\n${note.back}`
  }
  if (note.kind === "basic-reverse" && template === "reverse") return note.front
  return note.back
}
