/**
 * CodeMirror 6 Obsidian-style Live Preview extension.
 *
 * Uses a StateField-backed DecorationSet (required by CM6 for multi-line block
 * math replacements) to render headings, emphasis, links, Obsidian callouts
 * (`>[!theorem] ...`), inline/display MathJax SVG widgets, and wikilink embeds
 * off-cursor while revealing raw Markdown/LaTeX whenever the cursor intersects
 * a construct.
 */

import { markdown } from "@codemirror/lang-markdown"
import { RangeSetBuilder, StateField, type EditorState, type Extension } from "@codemirror/state"
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view"

import { CALLOUT_HEADER_RE, type CalloutTone, getCalloutSpec } from "@/lib/callouts"
import { renderMathJaxSvg } from "./mathjax"

export type LivePreviewOptions = {
  sourceMode?: boolean
  onNavigateLink?: (href: string) => void
}

type Span = { from: number; to: number }

type DecoSpec = {
  from: number
  to: number
  deco: Decoration
}

const BLOCKQUOTE_PREFIX_RE = /^(\s*>\s?)/
const HEADING_RE = /^(#{1,6})([ \t]+)/
const BULLET_RE = /^([ \t]*)([-*+])([ \t]+)/
const ORDERED_RE = /^([ \t]*)(\d+\.)([ \t]+)/
const FENCE_RE = /^\s*(```|~~~)/

function selectionIntersects(state: EditorState, from: number, to: number): boolean {
  for (const range of state.selection.ranges) {
    if (range.from <= to && range.to >= from) return true
  }
  return false
}

function overlapsAny(spans: readonly Span[], from: number, to: number): boolean {
  for (const span of spans) {
    if (from < span.to && to > span.from) return true
  }
  return false
}

class MathWidget extends WidgetType {
  readonly tex: string
  readonly display: boolean
  readonly quoted: boolean
  readonly sourceFrom: number

  constructor(tex: string, display: boolean, quoted: boolean, sourceFrom: number) {
    super()
    this.tex = tex
    this.display = display
    this.quoted = quoted
    this.sourceFrom = sourceFrom
  }

  eq(other: MathWidget): boolean {
    return (
      this.tex === other.tex &&
      this.display === other.display &&
      this.quoted === other.quoted &&
      this.sourceFrom === other.sourceFrom
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement(this.display ? "div" : "span")
    wrapper.className = this.display
      ? this.quoted
        ? "cm-lp-math-block cm-lp-math-quoted"
        : "cm-lp-math-block"
      : "cm-lp-math-inline"
    wrapper.dataset.mathDisplay = this.display ? "block" : "inline"
    wrapper.appendChild(renderMathJaxSvg(this.tex, { autoDisplayStyle: true, display: this.display }))
    wrapper.addEventListener("mousedown", (event) => {
      event.preventDefault()
      const target = Math.min(this.sourceFrom + (this.display ? 2 : 1), view.state.doc.length)
      view.focus()
      view.dispatch({ selection: { anchor: target } })
    })
    return wrapper
  }

  ignoreEvent(): boolean {
    return false
  }
}

class CalloutHeaderWidget extends WidgetType {
  readonly calloutType: string
  readonly tone: CalloutTone
  readonly icon: string
  readonly title: string
  readonly lineFrom: number

  constructor(
    calloutType: string,
    tone: CalloutTone,
    icon: string,
    title: string,
    lineFrom: number,
  ) {
    super()
    this.calloutType = calloutType
    this.tone = tone
    this.icon = icon
    this.title = title
    this.lineFrom = lineFrom
  }

  eq(other: CalloutHeaderWidget): boolean {
    return (
      this.calloutType === other.calloutType &&
      this.tone === other.tone &&
      this.icon === other.icon &&
      this.title === other.title &&
      this.lineFrom === other.lineFrom
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement("span")
    el.className = `cm-lp-callout-title cm-lp-callout-title-${this.calloutType}`
    el.dataset.calloutType = this.calloutType
    el.dataset.calloutTone = this.tone

    const badge = document.createElement("span")
    badge.className = "cm-lp-callout-icon"
    badge.setAttribute("aria-hidden", "true")
    badge.textContent = this.icon

    const label = document.createElement("span")
    label.textContent = this.title
    el.appendChild(badge)
    el.appendChild(label)

    el.addEventListener("mousedown", (event) => {
      event.preventDefault()
      view.focus()
      view.dispatch({ selection: { anchor: this.lineFrom } })
    })
    return el
  }

  ignoreEvent(): boolean {
    return false
  }
}

class EmbedWidget extends WidgetType {
  readonly target: string
  readonly centered: boolean
  readonly sourceFrom: number

  constructor(target: string, centered: boolean, sourceFrom: number) {
    super()
    this.target = target
    this.centered = centered
    this.sourceFrom = sourceFrom
  }

  eq(other: EmbedWidget): boolean {
    return (
      this.target === other.target &&
      this.centered === other.centered &&
      this.sourceFrom === other.sourceFrom
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement("span")
    el.className = this.centered ? "cm-lp-embed cm-lp-embed-center" : "cm-lp-embed"
    el.dataset.embedTarget = this.target
    const isExcalidraw = this.target.toLowerCase().endsWith(".excalidraw")
    const kind = document.createElement("span")
    kind.className = "cm-lp-embed-kind"
    kind.textContent = isExcalidraw ? "Excalidraw" : "Anexo"
    const name = document.createElement("span")
    name.className = "cm-lp-embed-name"
    name.textContent = this.target
    el.appendChild(kind)
    el.appendChild(name)

    el.addEventListener("mousedown", (event) => {
      event.preventDefault()
      view.focus()
      view.dispatch({ selection: { anchor: this.sourceFrom + 3 } })
    })
    return el
  }

  ignoreEvent(): boolean {
    return false
  }
}

class BulletWidget extends WidgetType {
  eq(): boolean {
    return true
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span")
    span.className = "cm-lp-bullet"
    span.setAttribute("aria-hidden", "true")
    span.textContent = "•"
    return span
  }
}

function findFenceLineSet(state: EditorState): Set<number> {
  const fenced = new Set<number>()
  let inFence = false
  let fenceChar = ""
  for (let n = 1; n <= state.doc.lines; n += 1) {
    const text = state.doc.line(n).text
    const match = FENCE_RE.exec(text)
    if (match) {
      fenced.add(n)
      if (!inFence) {
        inFence = true
        fenceChar = match[1][0]
      } else if (match[1][0] === fenceChar) {
        inFence = false
        fenceChar = ""
      }
      continue
    }
    if (inFence) fenced.add(n)
  }
  return fenced
}

type DisplayMathBlock = {
  from: number
  to: number
  tex: string
  isMultiline: boolean
  quoted: boolean
  startLine: number
  endLine: number
  fullLine: boolean
}

function findDisplayMathBlocks(
  state: EditorState,
  fencedLines: Set<number>,
): DisplayMathBlock[] {
  const blocks: DisplayMathBlock[] = []
  const totalLines = state.doc.lines
  let lineNo = 1

  while (lineNo <= totalLines) {
    if (fencedLines.has(lineNo)) {
      lineNo += 1
      continue
    }

    const line = state.doc.line(lineNo)
    const raw = line.text
    const quoteMatch = BLOCKQUOTE_PREFIX_RE.exec(raw)
    const quoteLen = quoteMatch ? quoteMatch[1].length : 0
    const afterQuote = raw.slice(quoteLen)
    const trimmed = afterQuote.trimStart()

    if (!trimmed.startsWith("$$")) {
      lineNo += 1
      continue
    }

    const leadingSpaces = afterQuote.length - trimmed.length
    const openDollarOffset = line.from + quoteLen + leadingSpaces
    const afterOpen = trimmed.slice(2)

    // Case 1: Single-line `$$ ... $$` (or `>$$ ... $$`)
    const closeInSameLine = afterOpen.indexOf("$$")
    if (closeInSameLine !== -1) {
      const tex = afterOpen.slice(0, closeInSameLine).trim()
      const closeEnd = openDollarOffset + 2 + closeInSameLine + 2
      const rest = afterOpen.slice(closeInSameLine + 2).trim()
      blocks.push({
        endLine: lineNo,
        from: openDollarOffset,
        fullLine: quoteLen === 0 && rest === "",
        isMultiline: false,
        quoted: quoteLen > 0,
        startLine: lineNo,
        tex,
        to: closeEnd,
      })
      lineNo += 1
      continue
    }

    // Case 2: Multi-line `$$ ... \n ... $$`
    // Do not treat an empty inline `$$` pair (e.g. from `mk`) as a multi-line display
    // opener if the cursor sits right between the two `$` chars or a blank line
    // separates it from a subsequent block.
    if (afterOpen.trim() === "") {
      if (selectionIntersects(state, openDollarOffset + 1, openDollarOffset + 1)) {
        lineNo += 1
        continue
      }
      if (lineNo + 1 <= totalLines && state.doc.line(lineNo + 1).text.trim() === "") {
        const lineAfterBlank =
          lineNo + 2 <= totalLines ? state.doc.line(lineNo + 2).text.replace(/^\s*>\s?/, "").trim() : ""
        // Allow `$$\n\n$$` (fresh `dm` block), but don't swallow across a blank line into another block.
        if (lineAfterBlank !== "$$") {
          lineNo += 1
          continue
        }
        // Even if lineAfterBlank IS `$$`, check if that `$$` is actually opening a display block below.
        const lineAfterThat =
          lineNo + 3 <= totalLines ? state.doc.line(lineNo + 3).text.replace(/^\s*>\s?/, "").trim() : ""
        if (lineAfterThat !== "") {
          lineNo += 1
          continue
        }
      }
    }

    const innerLines: string[] = [afterOpen]
    let endLineNo = lineNo + 1
    let foundClose = false
    let closeTo = line.to

    while (endLineNo <= totalLines) {
      const cur = state.doc.line(endLineNo)
      const curRaw = cur.text
      const stripped = curRaw.replace(/^\s*>\s?/, "")
      const trimmedStripped = stripped.trimStart()
      // A line starting with `$$<tex>` (like `$$\begin{align}` or `$$x=1$$`) is a new
      // display-math opener, never a closer for an unrelated empty `$$` above.
      if (trimmedStripped.startsWith("$$") && trimmedStripped.slice(2).trim().length > 0) {
        break
      }
      const closeIdx = stripped.indexOf("$$")
      if (closeIdx !== -1) {
        innerLines.push(stripped.slice(0, closeIdx))
        const rawCloseIdx = curRaw.lastIndexOf("$$")
        closeTo = cur.from + (rawCloseIdx !== -1 ? rawCloseIdx + 2 : curRaw.length)
        foundClose = true
        break
      }
      innerLines.push(stripped)
      endLineNo += 1
    }

    if (foundClose) {
      const blockFrom = quoteLen > 0 ? line.from : openDollarOffset
      blocks.push({
        endLine: endLineNo,
        from: blockFrom,
        fullLine: true,
        isMultiline: true,
        quoted: quoteLen > 0,
        startLine: lineNo,
        tex: innerLines.join("\n").trim(),
        to: closeTo,
      })
      lineNo = endLineNo + 1
    } else {
      lineNo += 1
    }
  }

  return blocks
}

function findInlineMathOnLine(lineText: string, lineFrom: number, occupied: Span[]): Span[] {
  const results: Span[] = []
  let i = 0
  while (i < lineText.length) {
    if (lineText[i] === "\\") {
      i += 2
      continue
    }
    if (lineText[i] === "$") {
      if (lineText[i + 1] === "$") {
        i += 2
        continue
      }
      const start = i
      let j = i + 1
      while (j < lineText.length) {
        if (lineText[j] === "\\") {
          j += 2
          continue
        }
        if (lineText[j] === "$") {
          if (lineText[j + 1] === "$") {
            j += 2
            continue
          }
          break
        }
        j += 1
      }
      if (j < lineText.length && lineText[j] === "$") {
        const inner = lineText.slice(start + 1, j)
        const absFrom = lineFrom + start
        const absTo = lineFrom + j + 1
        if (inner.trim().length > 0 && !overlapsAny(occupied, absFrom, absTo)) {
          results.push({ from: absFrom, to: absTo })
        }
        i = j + 1
        continue
      }
    }
    i += 1
  }
  return results
}

function buildLivePreviewDecorations(state: EditorState): DecorationSet {
  const specs: DecoSpec[] = []
  const fencedLines = findFenceLineSet(state)
  const displayMathBlocks = findDisplayMathBlocks(state, fencedLines)

  const displayMathSpans: Span[] = []
  const multiLineMathLines = new Set<number>()

  for (const block of displayMathBlocks) {
    displayMathSpans.push({ from: block.from, to: block.to })
    const active = selectionIntersects(state, block.from, block.to)

    if (block.isMultiline) {
      for (let n = block.startLine; n <= block.endLine; n += 1) {
        multiLineMathLines.add(n)
      }
    }

    if (!active) {
      const widget = new MathWidget(
        block.tex,
        true,
        block.isMultiline && block.quoted,
        block.from,
      )
      if (block.isMultiline && block.fullLine) {
        specs.push({
          deco: Decoration.replace({ block: true, widget }),
          from: block.from,
          to: block.to,
        })
      } else {
        specs.push({
          deco: Decoration.replace({ widget }),
          from: block.from,
          to: block.to,
        })
      }
    } else {
      for (let n = block.startLine; n <= block.endLine; n += 1) {
        const line = state.doc.line(n)
        specs.push({
          deco: Decoration.line({ class: "cm-lp-math-source-line" }),
          from: line.from,
          to: line.from,
        })
      }
    }
  }

  // Pass 1: Callouts and blockquotes
  const calloutHeaderLines = new Set<number>()
  let activeCallout: { type: string; tone: CalloutTone } | null = null

  for (let lineNo = 1; lineNo <= state.doc.lines; lineNo += 1) {
    if (fencedLines.has(lineNo) || multiLineMathLines.has(lineNo)) {
      activeCallout = null
      continue
    }

    const line = state.doc.line(lineNo)
    const calloutMatch = CALLOUT_HEADER_RE.exec(line.text)
    if (calloutMatch) {
      const type = calloutMatch[2].toLowerCase()
      const spec = getCalloutSpec(type)
      const explicitTitle = calloutMatch[4]?.trim()
      const title = explicitTitle && explicitTitle.length > 0 ? explicitTitle : spec.label
      activeCallout = { tone: spec.tone, type }
      calloutHeaderLines.add(lineNo)

      specs.push({
        deco: Decoration.line({
          class: `cm-lp-callout-header cm-lp-callout-tone-${spec.tone} cm-lp-callout-${type}`,
        }),
        from: line.from,
        to: line.from,
      })

      if (!selectionIntersects(state, line.from, line.to)) {
        specs.push({
          deco: Decoration.replace({
            widget: new CalloutHeaderWidget(type, spec.tone, spec.icon, title, line.from),
          }),
          from: line.from,
          to: line.to,
        })
      }
      continue
    }

    const quoteMatch = BLOCKQUOTE_PREFIX_RE.exec(line.text)
    if (quoteMatch) {
      const prefixEnd = line.from + quoteMatch[1].length
      const nextLine = lineNo < state.doc.lines ? state.doc.line(lineNo + 1).text : ""
      const nextIsQuote = BLOCKQUOTE_PREFIX_RE.test(nextLine) && !CALLOUT_HEADER_RE.test(nextLine)

      if (activeCallout) {
        specs.push({
          deco: Decoration.line({
            class: nextIsQuote
              ? `cm-lp-callout-body cm-lp-callout-tone-${activeCallout.tone} cm-lp-callout-${activeCallout.type}`
              : `cm-lp-callout-body cm-lp-callout-tone-${activeCallout.tone} cm-lp-callout-${activeCallout.type} cm-lp-callout-end`,
          }),
          from: line.from,
          to: line.from,
        })
      } else {
        specs.push({
          deco: Decoration.line({ class: "cm-lp-blockquote" }),
          from: line.from,
          to: line.from,
        })
      }

      if (
        !selectionIntersects(state, line.from, prefixEnd) &&
        !overlapsAny(displayMathSpans, line.from, prefixEnd)
      ) {
        specs.push({
          deco: Decoration.replace({}),
          from: line.from,
          to: prefixEnd,
        })
      }
      continue
    }

    activeCallout = null
  }

  // Pass 2: Headings, lists, and inline tokens
  for (let lineNo = 1; lineNo <= state.doc.lines; lineNo += 1) {
    if (fencedLines.has(lineNo) || multiLineMathLines.has(lineNo) || calloutHeaderLines.has(lineNo)) {
      continue
    }

    const line = state.doc.line(lineNo)
    const text = line.text
    const occupied: Span[] = displayMathSpans.filter(
      (span) => span.to > line.from && span.from < line.to,
    )

    // Headings
    const headingMatch = HEADING_RE.exec(text)
    if (headingMatch) {
      const level = headingMatch[1].length
      const markerEnd = line.from + headingMatch[0].length
      specs.push({
        deco: Decoration.line({ class: `cm-lp-heading cm-lp-h${level}` }),
        from: line.from,
        to: line.from,
      })
      if (!selectionIntersects(state, line.from, markerEnd)) {
        specs.push({ deco: Decoration.replace({}), from: line.from, to: markerEnd })
        occupied.push({ from: line.from, to: markerEnd })
      }
    } else {
      // Unordered list bullets
      const bulletMatch = BULLET_RE.exec(text)
      if (bulletMatch) {
        const indentLen = bulletMatch[1].length
        const markerFrom = line.from + indentLen
        const markerTo = markerFrom + bulletMatch[2].length
        specs.push({
          deco: Decoration.line({ class: "cm-lp-list-item" }),
          from: line.from,
          to: line.from,
        })
        if (!selectionIntersects(state, markerFrom, markerTo + bulletMatch[3].length)) {
          specs.push({
            deco: Decoration.replace({ widget: new BulletWidget() }),
            from: markerFrom,
            to: markerTo,
          })
          occupied.push({ from: markerFrom, to: markerTo })
        }
      } else {
        const orderedMatch = ORDERED_RE.exec(text)
        if (orderedMatch) {
          specs.push({
            deco: Decoration.line({ class: "cm-lp-list-item" }),
            from: line.from,
            to: line.from,
          })
        }
      }
    }

    // Inline code (`...`)
    const codeRe = /`([^`\n]+)`/g
    for (const match of text.matchAll(codeRe)) {
      const idx = match.index ?? -1
      if (idx < 0) continue
      const from = line.from + idx
      const to = from + match[0].length
      if (overlapsAny(occupied, from, to)) continue
      occupied.push({ from, to })
      specs.push({
        deco: Decoration.mark({ class: "cm-lp-code" }),
        from: from + 1,
        to: to - 1,
      })
      if (!selectionIntersects(state, from, to)) {
        specs.push({ deco: Decoration.replace({}), from, to: from + 1 })
        specs.push({ deco: Decoration.replace({}), from: to - 1, to })
      }
    }

    // Inline math ($...$)
    for (const span of findInlineMathOnLine(text, line.from, occupied)) {
      occupied.push(span)
      const innerTex = state.doc.sliceString(span.from + 1, span.to - 1)
      if (!selectionIntersects(state, span.from, span.to)) {
        specs.push({
          deco: Decoration.replace({
            widget: new MathWidget(innerTex, false, false, span.from),
          }),
          from: span.from,
          to: span.to,
        })
      } else {
        specs.push({
          deco: Decoration.mark({ class: "cm-lp-math-source" }),
          from: span.from,
          to: span.to,
        })
      }
    }

    // Obsidian wikilink embeds (`![[target | center]]`)
    const embedRe = /!\[\[([^\]|\n]+?)(?:\s*\|\s*([^\]\n]+?))?\s*\]\]/g
    for (const match of text.matchAll(embedRe)) {
      const idx = match.index ?? -1
      if (idx < 0) continue
      const from = line.from + idx
      const to = from + match[0].length
      if (overlapsAny(occupied, from, to)) continue
      occupied.push({ from, to })
      const target = match[1].trim()
      const modifier = match[2]?.trim().toLowerCase() ?? ""
      const centered = modifier.includes("center")
      if (!selectionIntersects(state, from, to)) {
        specs.push({
          deco: Decoration.replace({
            widget: new EmbedWidget(target, centered, from),
          }),
          from,
          to,
        })
      }
    }

    // Markdown links (`[label](href)`)
    const linkRe = /(?<!!)\[([^\]\n]+)\]\(([^)\s]+)\)/g
    for (const match of text.matchAll(linkRe)) {
      const idx = match.index ?? -1
      if (idx < 0) continue
      const from = line.from + idx
      const to = from + match[0].length
      if (overlapsAny(occupied, from, to)) continue
      occupied.push({ from, to })
      const labelFrom = from + 1
      const labelTo = labelFrom + match[1].length
      const href = match[2]
      specs.push({
        deco: Decoration.mark({
          attributes: { "data-href": href, title: href },
          class: "cm-lp-link",
        }),
        from: labelFrom,
        to: labelTo,
      })
      if (!selectionIntersects(state, from, to)) {
        specs.push({ deco: Decoration.replace({}), from, to: labelFrom })
        specs.push({ deco: Decoration.replace({}), from: labelTo, to })
      }
    }

    // Bold (`**...**`)
    const boldRe = /\*\*([^*\n]+?)\*\*/g
    for (const match of text.matchAll(boldRe)) {
      const idx = match.index ?? -1
      if (idx < 0) continue
      const from = line.from + idx
      const to = from + match[0].length
      if (overlapsAny(occupied, from, from + 2) || overlapsAny(occupied, to - 2, to)) continue
      occupied.push({ from, to: from + 2 }, { from: to - 2, to })
      specs.push({
        deco: Decoration.mark({ class: "cm-lp-strong" }),
        from: from + 2,
        to: to - 2,
      })
      if (!selectionIntersects(state, from, to)) {
        specs.push({ deco: Decoration.replace({}), from, to: from + 2 })
        specs.push({ deco: Decoration.replace({}), from: to - 2, to })
      }
    }

    // Italic (`*...*`)
    const italicRe = /(?<!\*)\*([^*\n]+?)\*(?!\*)/g
    for (const match of text.matchAll(italicRe)) {
      const idx = match.index ?? -1
      if (idx < 0) continue
      const from = line.from + idx
      const to = from + match[0].length
      if (overlapsAny(occupied, from, from + 1) || overlapsAny(occupied, to - 1, to)) continue
      occupied.push({ from, to: from + 1 }, { from: to - 1, to })
      specs.push({
        deco: Decoration.mark({ class: "cm-lp-em" }),
        from: from + 1,
        to: to - 1,
      })
      if (!selectionIntersects(state, from, to)) {
        specs.push({ deco: Decoration.replace({}), from, to: from + 1 })
        specs.push({ deco: Decoration.replace({}), from: to - 1, to })
      }
    }

    // Strikethrough (`~~...~~`)
    const strikeRe = /~~([^~\n]+?)~~/g
    for (const match of text.matchAll(strikeRe)) {
      const idx = match.index ?? -1
      if (idx < 0) continue
      const from = line.from + idx
      const to = from + match[0].length
      if (overlapsAny(occupied, from, from + 2) || overlapsAny(occupied, to - 2, to)) continue
      occupied.push({ from, to: from + 2 }, { from: to - 2, to })
      specs.push({
        deco: Decoration.mark({ class: "cm-lp-strike" }),
        from: from + 2,
        to: to - 2,
      })
      if (!selectionIntersects(state, from, to)) {
        specs.push({ deco: Decoration.replace({}), from, to: from + 2 })
        specs.push({ deco: Decoration.replace({}), from: to - 2, to })
      }
    }
  }

  // Sort strictly by CM6 RangeSetBuilder order: (from ASC, startSide ASC, to ASC).
  specs.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from
    if (a.deco.startSide !== b.deco.startSide) return a.deco.startSide - b.deco.startSide
    return a.to - b.to
  })

  const builder = new RangeSetBuilder<Decoration>()
  for (const spec of specs) {
    builder.add(spec.from, spec.to, spec.deco)
  }
  return builder.finish()
}

const livePreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildLivePreviewDecorations(state)
  },
  provide(field) {
    return EditorView.decorations.from(field)
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return buildLivePreviewDecorations(tr.state)
    }
    return decorations
  },
})

export function createLivePreviewExtension(options?: LivePreviewOptions): Extension {
  const extensions: Extension[] = [markdown(), EditorView.lineWrapping]

  if (!options?.sourceMode) {
    extensions.push(livePreviewField)
  }

  if (options?.onNavigateLink) {
    const navigate = options.onNavigateLink
    extensions.push(
      EditorView.domEventHandlers({
        click(event) {
          const target = event.target as HTMLElement | null
          const linkEl = target?.closest<HTMLElement>(".cm-lp-link[data-href]")
          const href = linkEl?.dataset.href
          if (!href) return false
          event.preventDefault()
          navigate(href)
          return true
        },
      }),
    )
  }

  return extensions
}
