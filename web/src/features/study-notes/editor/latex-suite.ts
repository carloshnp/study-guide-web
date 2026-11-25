/**
 * CodeMirror 6 LaTeX Suite extension modeled after MIT-licensed `obsidian-latex-suite`.
 *
 * Supports:
 * - Context-aware snippets (`t` text, `m` math, `M` display math, `n` inline math)
 * - Auto-expand (`A`), Space-triggered manual snippets (`!A`), word boundaries (`w`),
 *   regex captures (`[[0]]`), variable substitution (`${GREEK}` etc.), priority sorting,
 *   and JS function replacements (`iden(\d)`)
 * - Tabstops (`$0`, `${0:default}`) with linked-mirror editing via CM6 multi-selection,
 *   `Tab` / `Shift-Tab` navigation, and `${VISUAL}` selection wrapping
 * - Auto-fraction (`a/` -> `\frac{a}{}`), matrix shortcuts (`Tab` / `Enter`), tabout,
 *   auto-delete empty `$$`, and floating MathJax SVG preview above active raw math
 */

import {
  EditorSelection,
  EditorState,
  Prec,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state"
import {
  Decoration,
  EditorView,
  keymap,
  showTooltip,
  type DecorationSet,
  type Tooltip,
} from "@codemirror/view"

import {
  DEFAULT_SNIPPETS,
  DEFAULT_SNIPPET_VARIABLES,
  type LatexSnippet,
  type LatexSnippetReplacement,
} from "./default-snippets"
import { renderMathJaxSvg } from "./mathjax"

export type LatexSuiteOptions = {
  snippets?: readonly LatexSnippet[]
  variables?: Record<string, string>
  preview?: boolean
}

type MathMode = "text" | "inline" | "display"

type MathContext = {
  mode: MathMode
  from: number
  to: number
  innerFrom: number
  innerTo: number
  tex: string
}

type CompiledSnippet = {
  raw: LatexSnippet
  isAuto: boolean
  isRegex: boolean
  isWordBoundary: boolean
  isVisual: boolean
  allowText: boolean
  allowInlineMath: boolean
  allowDisplayMath: boolean
  priority: number
  stringTrigger: string | null
  regexTrigger: RegExp | null
}

type TabstopRange = { from: number; to: number }
type TabstopGroup = { index: number; ranges: TabstopRange[] }

type TabstopState = {
  next: TabstopGroup[]
  prev: TabstopGroup[]
  current: TabstopGroup | null
}

const MATRIX_ENVS = new Set([
  "pmatrix",
  "cases",
  "align",
  "gather",
  "bmatrix",
  "Bmatrix",
  "vmatrix",
  "Vmatrix",
  "array",
  "matrix",
])

const WORD_DELIMITERS = new Set(Array.from("., +-\n\t:;!?/{}[]()=~$"))
const AUTOFRAC_BREAKERS = new Set(Array.from("+-=\t ,;"))
const AUTO_ENLARGE_TRIGGER_RE = /\\(?:sum|int|frac|prod|bigcup|bigcap)\b/
const TABOUT_CLOSERS = [
  "\\rbrack",
  "\\rbrace",
  "\\rangle",
  "\\rvert",
  "\\rVert",
  "\\rfloor",
  "\\rceil",
  "\\urcorner",
  "\\right)",
  "\\right]",
  "\\right\\}",
  "\\right|",
  "\\}",
  ")",
  "]",
  "}",
  "$$",
  "$",
]

const setTabstopsEffect = StateEffect.define<TabstopState>()

const EMPTY_TABSTOPS: TabstopState = { current: null, next: [], prev: [] }

function mapGroup(group: TabstopGroup, mapPos: (pos: number, assoc?: number) => number): TabstopGroup {
  return {
    index: group.index,
    ranges: group.ranges.map((r) => ({
      from: mapPos(r.from, 1),
      to: mapPos(r.to, -1),
    })),
  }
}

const tabstopsField = StateField.define<TabstopState>({
  create() {
    return EMPTY_TABSTOPS
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTabstopsEffect)) return effect.value
    }
    if (!tr.docChanged) return value
    if (!value.current && value.next.length === 0 && value.prev.length === 0) return value
    const mapPos = (pos: number, assoc?: number) => tr.changes.mapPos(pos, assoc)
    return {
      current: value.current ? mapGroup(value.current, mapPos) : null,
      next: value.next.map((g) => mapGroup(g, mapPos)),
      prev: value.prev.map((g) => mapGroup(g, mapPos)),
    }
  },
})

function substituteVariables(pattern: string, variables: Record<string, string>): string {
  let result = pattern
  for (const [key, val] of Object.entries(variables)) {
    if (result.includes(key)) {
      result = result.split(key).join(val)
    }
  }
  return result
}

function compileSnippets(
  snippets: readonly LatexSnippet[],
  variables: Record<string, string>,
): CompiledSnippet[] {
  const compiled: CompiledSnippet[] = []
  for (const raw of snippets) {
    const opts = raw.options ?? ""
    const allowText = opts.includes("t")
    const allowAnyMath = opts.includes("m")
    const allowDisplayMath = allowAnyMath || opts.includes("M")
    const allowInlineMath = allowAnyMath || opts.includes("n")
    const isAuto = opts.includes("A")
    const isWordBoundary = opts.includes("w")
    const isRegex = opts.includes("r") || raw.trigger instanceof RegExp
    const isVisual = typeof raw.replacement === "string" && raw.replacement.includes("${VISUAL}")
    const priority = raw.priority ?? 0

    let stringTrigger: string | null = null
    let regexTrigger: RegExp | null = null

    if (isRegex) {
      try {
        const source =
          raw.trigger instanceof RegExp
            ? raw.trigger.source
            : substituteVariables(raw.trigger, variables)
        regexTrigger = new RegExp(`(?:${source})$`)
      } catch {
        continue
      }
    } else if (typeof raw.trigger === "string") {
      stringTrigger = raw.trigger
    } else {
      continue
    }

    compiled.push({
      allowDisplayMath,
      allowInlineMath,
      allowText,
      isAuto,
      isRegex,
      isVisual,
      isWordBoundary,
      priority,
      raw,
      regexTrigger,
      stringTrigger,
    })
  }

  compiled.sort((a, b) => b.priority - a.priority)
  return compiled
}

function getMathContext(state: EditorState, pos: number): MathContext {
  const doc = state.doc.toString()
  const len = doc.length
  let i = 0

  while (i < len) {
    // Skip fenced code blocks
    if (
      (i === 0 || doc[i - 1] === "\n") &&
      (doc.startsWith("```", i) || doc.startsWith("~~~", i))
    ) {
      const fence = doc.slice(i, i + 3)
      const closeFence = doc.indexOf(`\n${fence}`, i + 3)
      if (closeFence === -1) break
      const afterFenceLine = doc.indexOf("\n", closeFence + 4)
      i = afterFenceLine === -1 ? len : afterFenceLine + 1
      continue
    }

    // Skip inline code
    if (doc[i] === "`") {
      const closeTick = doc.indexOf("`", i + 1)
      if (closeTick !== -1 && doc.slice(i + 1, closeTick).indexOf("\n") === -1) {
        i = closeTick + 1
        continue
      }
    }

    if (doc[i] === "\\") {
      i += 2
      continue
    }

    if (doc[i] === "$") {
      if (doc[i + 1] === "$") {
        const lineStart = doc.lastIndexOf("\n", i - 1) + 1
        const lineEnd = doc.indexOf("\n", i + 2)
        const endOfLine = lineEnd === -1 ? len : lineEnd
        const beforeOnLine = doc.slice(lineStart, i).replace(/^\s*>\s?/, "").trim()
        const afterOnLine = doc.slice(i + 2, endOfLine)

        // Single-line display math `$$...$$` on this same line.
        const closeOnSameLine = afterOnLine.indexOf("$$")
        if (closeOnSameLine !== -1) {
          const from = i
          const to = i + 2 + closeOnSameLine + 2
          const innerFrom = i + 2
          const innerTo = i + 2 + closeOnSameLine
          if (pos >= innerFrom && pos <= innerTo) {
            return { from, innerFrom, innerTo, mode: "display", tex: doc.slice(innerFrom, innerTo), to }
          }
          i = to
          continue
        }

        // Empty inline `$|$` pair (from `mk`): either preceded by text on the same line,
        // or bare `$$` with the cursor sitting directly between the two `$` chars.
        if (beforeOnLine.length > 0 || (afterOnLine.trim() === "" && pos === i + 1)) {
          if (pos === i + 1) {
            return { from: i, innerFrom: i + 1, innerTo: i + 1, mode: "inline", tex: "", to: i + 2 }
          }
          i += 2
          continue
        }

        // Multiline display math `$$ ... \n ... $$`: scan line-by-line so an empty `$$`
        // never steals a subsequent `$$\begin{align}` or `$$x=1$$` block below.
        let searchPos = endOfLine < len ? endOfLine + 1 : len
        let closeDisplay = -1
        while (searchPos < len) {
          const nextNl = doc.indexOf("\n", searchPos)
          const nextEnd = nextNl === -1 ? len : nextNl
          const stripped = doc.slice(searchPos, nextEnd).replace(/^\s*>\s?/, "")
          const trimmed = stripped.trimStart()
          if (trimmed.startsWith("$$") && trimmed.slice(2).trim().length > 0) {
            break
          }
          const idx = doc.slice(searchPos, nextEnd).indexOf("$$")
          if (idx !== -1) {
            closeDisplay = searchPos + idx
            break
          }
          searchPos = nextEnd + 1
        }

        if (closeDisplay !== -1) {
          const from = i
          const to = closeDisplay + 2
          const innerFrom = i + 2
          const innerTo = closeDisplay
          if (pos >= innerFrom && pos <= innerTo) {
            return {
              from,
              innerFrom,
              innerTo,
              mode: "display",
              tex: doc.slice(innerFrom, innerTo).replace(/^\s*>\s?/gm, ""),
              to,
            }
          }
          i = to
          continue
        }

        if (pos === i + 1) {
          return { from: i, innerFrom: i + 1, innerTo: i + 1, mode: "inline", tex: "", to: i + 2 }
        }
        i += 2
        continue
      }

      // Single `$` inline math (same line)
      const lineEnd = doc.indexOf("\n", i + 1)
      const searchLimit = lineEnd === -1 ? len : lineEnd
      let j = i + 1
      while (j < searchLimit) {
        if (doc[j] === "\\") {
          j += 2
          continue
        }
        if (doc[j] === "$") break
        j += 1
      }
      if (j < searchLimit && doc[j] === "$") {
        const from = i
        const to = j + 1
        const innerFrom = i + 1
        const innerTo = j
        if (pos >= innerFrom && pos <= innerTo) {
          return {
            from,
            innerFrom,
            innerTo,
            mode: "inline",
            tex: doc.slice(innerFrom, innerTo),
            to,
          }
        }
        i = to
        continue
      }
    }
    i += 1
  }

  return { from: 0, innerFrom: 0, innerTo: len, mode: "text", tex: "", to: len }
}

export function isInsideMath(state: EditorState, pos: number): boolean {
  return getMathContext(state, pos).mode !== "text"
}

function allowsMode(snippet: CompiledSnippet, mode: MathMode): boolean {
  if (mode === "text") return snippet.allowText
  if (mode === "display") return snippet.allowDisplayMath
  return snippet.allowInlineMath
}

function parseTemplate(template: string): { text: string; groups: TabstopGroup[] } {
  const tokenRe = /\$\{(\d+):([^}]*)\}|\$(\d+)/g
  let output = ""
  let lastIndex = 0
  const byNumber = new Map<number, TabstopRange[]>()

  for (const match of template.matchAll(tokenRe)) {
    const idx = match.index ?? 0
    output += template.slice(lastIndex, idx)
    const num = Number(match[1] ?? match[3])
    const defaultText = match[2] ?? ""
    const start = output.length
    output += defaultText
    const end = output.length
    const list = byNumber.get(num) ?? []
    list.push({ from: start, to: end })
    byNumber.set(num, list)
    lastIndex = idx + match[0].length
  }
  output += template.slice(lastIndex)

  const groups: TabstopGroup[] = Array.from(byNumber.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([index, ranges]) => ({ index, ranges }))

  return { groups, text: output }
}

function maybeEnlargeEnclosingBrackets(view: EditorView): void {
  const head = view.state.selection.main.head
  const ctx = getMathContext(view.state, head)
  if (ctx.mode === "text") return

  const inner = view.state.doc.sliceString(ctx.innerFrom, ctx.innerTo)
  const relPos = head - ctx.innerFrom
  if (relPos < 0 || relPos > inner.length) return

  // Scan backwards for the nearest unmatched opening `(`, `[`, or `\{`.
  type BracketKind = { open: string; close: string; left: string; right: string }
  const PAIRS: readonly BracketKind[] = [
    { close: ")", left: "\\left(", open: "(", right: "\\right)" },
    { close: "]", left: "\\left[", open: "[", right: "\\right]" },
    { close: "\\}", left: "\\left\\{", open: "\\{", right: "\\right\\}" },
  ]

  let openIdx = -1
  let matchedPair: BracketKind | null = null
  const depth = { "(": 0, "[": 0, "\\{": 0 }

  for (let i = relPos - 1; i >= 0; i -= 1) {
    if (i >= 1 && inner[i - 1] === "\\" && inner[i] === "}") {
      depth["\\{"] += 1
      i -= 1
      continue
    }
    if (i >= 1 && inner[i - 1] === "\\" && inner[i] === "{") {
      if (depth["\\{"] === 0) {
        openIdx = i - 1
        matchedPair = PAIRS[2]
        break
      }
      depth["\\{"] -= 1
      i -= 1
      continue
    }
    const ch = inner[i]
    if (ch === ")") depth["("] += 1
    else if (ch === "]") depth["["] += 1
    else if (ch === "(") {
      if (depth["("] === 0) {
        openIdx = i
        matchedPair = PAIRS[0]
        break
      }
      depth["("] -= 1
    } else if (ch === "[") {
      if (depth["["] === 0) {
        openIdx = i
        matchedPair = PAIRS[1]
        break
      }
      depth["["] -= 1
    }
  }

  if (openIdx < 0 || !matchedPair) return
  if (inner.slice(Math.max(0, openIdx - 5), openIdx) === "\\left") return

  // Find the matching closing bracket forward.
  let closeIdx = -1
  let nest = 0
  for (let i = openIdx + matchedPair.open.length; i < inner.length; i += 1) {
    if (inner.startsWith(matchedPair.open, i)) {
      nest += 1
      i += matchedPair.open.length - 1
    } else if (inner.startsWith(matchedPair.close, i)) {
      if (nest === 0) {
        closeIdx = i
        break
      }
      nest -= 1
      i += matchedPair.close.length - 1
    }
  }
  if (closeIdx < 0) return
  if (inner.slice(Math.max(0, closeIdx - 6), closeIdx) === "\\right") return

  const inside = inner.slice(openIdx + matchedPair.open.length, closeIdx)
  if (!AUTO_ENLARGE_TRIGGER_RE.test(inside)) return

  const absOpen = ctx.innerFrom + openIdx
  const absClose = ctx.innerFrom + closeIdx
  const openShift = matchedPair.left.length - matchedPair.open.length

  view.dispatch({
    changes: [
      { from: absOpen, insert: matchedPair.left, to: absOpen + matchedPair.open.length },
      { from: absClose, insert: matchedPair.right, to: absClose + matchedPair.close.length },
    ],
    selection: EditorSelection.create(
      view.state.selection.ranges.map((r) =>
        EditorSelection.range(r.anchor + openShift, r.head + openShift),
      ),
    ),
    userEvent: "input.enlarge",
  })
}

function applyExpandedTemplate(
  view: EditorView,
  replaceFrom: number,
  replaceTo: number,
  template: string,
): void {
  const { groups, text } = parseTemplate(template)
  const shifted = groups.map((g) => ({
    index: g.index,
    ranges: g.ranges.map((r) => ({ from: replaceFrom + r.from, to: replaceFrom + r.to })),
  }))

  const first = shifted[0] ?? null
  const remaining = shifted.slice(1)

  const selection = first
    ? EditorSelection.create(first.ranges.map((r) => EditorSelection.range(r.from, r.to)))
    : EditorSelection.cursor(replaceFrom + text.length)

  view.dispatch({
    changes: { from: replaceFrom, insert: text, to: replaceTo },
    effects: setTabstopsEffect.of({
      current: first,
      next: remaining,
      prev: [],
    }),
    selection,
    userEvent: "input.snippet",
  })

  if (AUTO_ENLARGE_TRIGGER_RE.test(text)) {
    maybeEnlargeEnclosingBrackets(view)
  }
}

function substituteCaptures(replacement: LatexSnippetReplacement, match: RegExpExecArray): string {
  if (typeof replacement === "function") {
    try {
      return replacement(match)
    } catch {
      return ""
    }
  }
  let out = replacement
  for (let i = 1; i < match.length; i += 1) {
    const val = match[i] ?? ""
    out = out.split(`[[${i - 1}]]`).join(val)
  }
  return out
}

function tryExpandSnippet(
  view: EditorView,
  snippets: readonly CompiledSnippet[],
  from: number,
  to: number,
  typed: string,
  manualTrigger: boolean,
): boolean {
  const ctx = getMathContext(view.state, from)

  // Visual selection snippets (`${VISUAL}`)
  if (from !== to) {
    if (ctx.mode === "text") return false
    const selected = view.state.doc.sliceString(from, to)
    for (const snippet of snippets) {
      if (!snippet.isVisual || !allowsMode(snippet, ctx.mode)) continue
      if (snippet.stringTrigger === typed && typeof snippet.raw.replacement === "string") {
        const expanded = snippet.raw.replacement.split("${VISUAL}").join(selected)
        applyExpandedTemplate(view, from, to, expanded)
        return true
      }
    }
    return false
  }

  const line = view.state.doc.lineAt(from)
  const scanStart = ctx.mode === "text" ? line.from : Math.max(line.from, ctx.innerFrom)
  const prefixBefore = view.state.doc.sliceString(scanStart, from)
  const candidate = manualTrigger ? prefixBefore : prefixBefore + typed

  // Include 1 character immediately before `scanStart` (e.g. `$` or `\n`) when
  // matching regex triggers so rules like `/([^\\])int/` and `([^\\])(${GREEK})`
  // also fire right at the beginning of `$int$` or on a new line in `$$...$$`.
  const regexScanStart = ctx.mode === "text" ? scanStart : Math.max(0, scanStart - 1)
  const regexPrefixBefore = view.state.doc.sliceString(regexScanStart, from)
  const regexCandidate = manualTrigger ? regexPrefixBefore : regexPrefixBefore + typed

  let best:
    | { priority: number; matchLen: number; docMatchFrom: number; template: string }
    | null = null

  for (const snippet of snippets) {
    if (snippet.isVisual) continue
    if (!allowsMode(snippet, ctx.mode)) continue
    if (manualTrigger ? snippet.isAuto : !snippet.isAuto) continue
    // Because snippets are sorted by priority DESC, stop once priority drops below a match.
    if (best && snippet.priority < best.priority) break

    if (snippet.isRegex && snippet.regexTrigger) {
      const match = snippet.regexTrigger.exec(regexCandidate)
      if (!match || match[0].length === 0) continue
      const matchStartInCandidate = match.index
      if (snippet.isWordBoundary && matchStartInCandidate > 0) {
        const prevChar = regexCandidate[matchStartInCandidate - 1]
        if (!WORD_DELIMITERS.has(prevChar)) continue
      }
      const matchLen = match[0].length
      if (!best || matchLen > best.matchLen) {
        best = {
          docMatchFrom: regexScanStart + matchStartInCandidate,
          matchLen,
          priority: snippet.priority,
          template: substituteCaptures(snippet.raw.replacement, match),
        }
      }
      continue
    }

    if (snippet.stringTrigger !== null) {
      const trig = snippet.stringTrigger
      if (!candidate.endsWith(trig)) continue
      const matchStartInCandidate = candidate.length - trig.length
      if (snippet.isWordBoundary && matchStartInCandidate > 0) {
        const prevChar = candidate[matchStartInCandidate - 1]
        if (!WORD_DELIMITERS.has(prevChar)) continue
      }
      const matchLen = trig.length
      if (!best || matchLen > best.matchLen) {
        best = {
          docMatchFrom: scanStart + matchStartInCandidate,
          matchLen,
          priority: snippet.priority,
          template: typeof snippet.raw.replacement === "string" ? snippet.raw.replacement : "",
        }
      }
    }
  }

  if (best) {
    applyExpandedTemplate(view, best.docMatchFrom, from, best.template)
    return true
  }

  return false
}

function isInExcludedAutofracEnv(before: string): boolean {
  for (const opener of ["^{", "\\pu{"]) {
    const idx = before.lastIndexOf(opener)
    if (idx !== -1 && !before.slice(idx + opener.length).includes("}")) {
      return true
    }
  }
  return false
}

function tryAutoFraction(view: EditorView, pos: number): boolean {
  const ctx = getMathContext(view.state, pos)
  if (ctx.mode === "text") return false

  const line = view.state.doc.lineAt(pos)
  const scanStart = Math.max(line.from, ctx.innerFrom)
  const before = view.state.doc.sliceString(scanStart, pos)
  if (!before || before.endsWith("/") || isInExcludedAutofracEnv(before)) return false

  let i = before.length - 1
  if (before[i] === ")" || before[i] === "}" || before[i] === "]") {
    const closeCh = before[i]
    const openCh = closeCh === ")" ? "(" : closeCh === "}" ? "{" : "["
    let depth = 0
    while (i >= 0) {
      if (before[i] === closeCh) depth += 1
      else if (before[i] === openCh) {
        depth -= 1
        if (depth === 0) break
      }
      i -= 1
    }
    if (depth !== 0) return false
    // Include leading command like `\left(` or `\sin(`
    let cmdStart = i
    while (cmdStart > 0 && /[A-Za-z\\]/.test(before[cmdStart - 1])) {
      cmdStart -= 1
    }
    const rawNum = before.slice(cmdStart)
    const strippedNum =
      rawNum.startsWith("(") && rawNum.endsWith(")") ? rawNum.slice(1, -1) : rawNum
    if (!strippedNum) return false
    applyExpandedTemplate(view, scanStart + cmdStart, pos, `\\frac{${strippedNum}}{$0}$1`)
    return true
  }

  while (i >= 0 && !AUTOFRAC_BREAKERS.has(before[i])) {
    if (before[i] === "(" || before[i] === "[" || before[i] === "{") {
      i += 1
      break
    }
    i -= 1
  }
  const start = Math.max(0, i < 0 ? 0 : AUTOFRAC_BREAKERS.has(before[i]) ? i + 1 : i)
  const numerator = before.slice(start)
  if (!numerator) return false
  applyExpandedTemplate(view, scanStart + start, pos, `\\frac{${numerator}}{$0}$1`)
  return true
}

function isInsideMatrixEnv(state: EditorState, pos: number): boolean {
  const ctx = getMathContext(state, pos)
  if (ctx.mode === "text") return false
  const before = state.doc.sliceString(ctx.innerFrom, pos)
  const envRe = /\\(begin|end)\{([A-Za-z*]+)\}/g
  const stack: string[] = []
  for (const match of before.matchAll(envRe)) {
    const kind = match[1]
    const name = match[2]
    if (kind === "begin") stack.push(name)
    else if (kind === "end" && stack[stack.length - 1] === name) stack.pop()
  }
  const top = stack[stack.length - 1]
  return Boolean(top && MATRIX_ENVS.has(top))
}

function jumpTabstop(view: EditorView, direction: "next" | "prev"): boolean {
  const state = view.state.field(tabstopsField)
  if (direction === "next") {
    if (state.next.length === 0) return false
    const [target, ...rest] = state.next
    const prev = state.current ? [state.current, ...state.prev] : state.prev
    view.dispatch({
      effects: setTabstopsEffect.of({ current: target, next: rest, prev }),
      selection: EditorSelection.create(
        target.ranges.map((r) => EditorSelection.range(r.from, r.to)),
      ),
    })
    return true
  }
  if (state.prev.length === 0) return false
  const [target, ...restPrev] = state.prev
  const next = state.current ? [state.current, ...state.next] : state.next
  view.dispatch({
    effects: setTabstopsEffect.of({ current: target, next, prev: restPrev }),
    selection: EditorSelection.create(
      target.ranges.map((r) => EditorSelection.range(r.from, r.to)),
    ),
  })
  return true
}

function tryTabout(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  if (from !== to) return false
  const ctx = getMathContext(view.state, from)
  if (ctx.mode === "text") return false

  const after = view.state.doc.sliceString(from, Math.min(view.state.doc.length, from + 12))
  for (const closer of TABOUT_CLOSERS) {
    if (after.startsWith(closer)) {
      view.dispatch({ selection: EditorSelection.cursor(from + closer.length) })
      return true
    }
  }
  return false
}

function buildMathPreviewTooltips(state: EditorState): readonly Tooltip[] {
  const sel = state.selection.main
  const ctx = getMathContext(state, sel.head)
  if (ctx.mode === "text" || ctx.tex.trim().length === 0) return []
  const tex = ctx.tex
  const display = ctx.mode === "display"
  return [
    {
      above: true,
      create() {
        const dom = document.createElement("div")
        dom.className = "cm-math-live-preview"
        dom.dataset.slot = "math-live-preview"
        dom.appendChild(renderMathJaxSvg(tex, { autoDisplayStyle: true, display }))
        return { dom }
      },
      pos: ctx.from,
      strictSide: false,
    },
  ]
}

type BracketToken = { from: number; to: number; kind: "open" | "close"; pair: string }

function buildBracketDecorations(state: EditorState): DecorationSet {
  const head = state.selection.main.head
  const ctx = getMathContext(state, head)
  if (ctx.mode === "text" || ctx.innerTo <= ctx.innerFrom) {
    return Decoration.none
  }

  const inner = state.doc.sliceString(ctx.innerFrom, ctx.innerTo)
  const tokens: BracketToken[] = []
  let i = 0
  while (i < inner.length) {
    if (inner.startsWith("\\left(", i)) {
      tokens.push({ from: ctx.innerFrom + i, kind: "open", pair: "()", to: ctx.innerFrom + i + 6 })
      i += 6
      continue
    }
    if (inner.startsWith("\\right)", i)) {
      tokens.push({ from: ctx.innerFrom + i, kind: "close", pair: "()", to: ctx.innerFrom + i + 7 })
      i += 7
      continue
    }
    if (inner.startsWith("\\left[", i)) {
      tokens.push({ from: ctx.innerFrom + i, kind: "open", pair: "[]", to: ctx.innerFrom + i + 6 })
      i += 6
      continue
    }
    if (inner.startsWith("\\right]", i)) {
      tokens.push({ from: ctx.innerFrom + i, kind: "close", pair: "[]", to: ctx.innerFrom + i + 7 })
      i += 7
      continue
    }
    if (inner.startsWith("\\left\\{", i)) {
      tokens.push({ from: ctx.innerFrom + i, kind: "open", pair: "{}", to: ctx.innerFrom + i + 7 })
      i += 7
      continue
    }
    if (inner.startsWith("\\right\\}", i)) {
      tokens.push({ from: ctx.innerFrom + i, kind: "close", pair: "{}", to: ctx.innerFrom + i + 8 })
      i += 8
      continue
    }
    if (inner.startsWith("\\{", i)) {
      tokens.push({ from: ctx.innerFrom + i, kind: "open", pair: "{}", to: ctx.innerFrom + i + 2 })
      i += 2
      continue
    }
    if (inner.startsWith("\\}", i)) {
      tokens.push({ from: ctx.innerFrom + i, kind: "close", pair: "{}", to: ctx.innerFrom + i + 2 })
      i += 2
      continue
    }
    const ch = inner[i]
    if (ch === "\\") {
      i += 2
      continue
    }
    if (ch === "(") tokens.push({ from: ctx.innerFrom + i, kind: "open", pair: "()", to: ctx.innerFrom + i + 1 })
    else if (ch === ")") tokens.push({ from: ctx.innerFrom + i, kind: "close", pair: "()", to: ctx.innerFrom + i + 1 })
    else if (ch === "[") tokens.push({ from: ctx.innerFrom + i, kind: "open", pair: "[]", to: ctx.innerFrom + i + 1 })
    else if (ch === "]") tokens.push({ from: ctx.innerFrom + i, kind: "close", pair: "[]", to: ctx.innerFrom + i + 1 })
    else if (ch === "{") tokens.push({ from: ctx.innerFrom + i, kind: "open", pair: "{}", to: ctx.innerFrom + i + 1 })
    else if (ch === "}") tokens.push({ from: ctx.innerFrom + i, kind: "close", pair: "{}", to: ctx.innerFrom + i + 1 })
    i += 1
  }

  const stack: { token: BracketToken; depth: number }[] = []
  const marks: { from: number; to: number; cls: string }[] = []

  for (const tok of tokens) {
    if (tok.kind === "open") {
      stack.push({ depth: stack.length % 3, token: tok })
    } else {
      for (let s = stack.length - 1; s >= 0; s -= 1) {
        if (stack[s].token.pair === tok.pair) {
          const opener = stack.splice(s, 1)[0]
          const touchesCursor =
            (head >= opener.token.from && head <= opener.token.to) ||
            (head >= tok.from && head <= tok.to)
          const cls = touchesCursor
            ? `cm-math-bracket-${opener.depth} cm-math-bracket-match`
            : `cm-math-bracket-${opener.depth}`
          marks.push({ cls, from: opener.token.from, to: opener.token.to })
          marks.push({ cls, from: tok.from, to: tok.to })
          break
        }
      }
    }
  }

  marks.sort((a, b) => a.from - b.from || a.to - b.to)
  const builder = new RangeSetBuilder<Decoration>()
  for (const m of marks) {
    builder.add(m.from, m.to, Decoration.mark({ class: m.cls }))
  }
  return builder.finish()
}

const bracketColorsField = StateField.define<DecorationSet>({
  create(state) {
    return buildBracketDecorations(state)
  },
  provide(field) {
    return EditorView.decorations.from(field)
  },
  update(decos, tr) {
    if (tr.docChanged || tr.selection) {
      return buildBracketDecorations(tr.state)
    }
    return decos
  },
})

const mathPreviewField = StateField.define<readonly Tooltip[]>({
  create(state) {
    return buildMathPreviewTooltips(state)
  },
  provide(field) {
    return showTooltip.computeN([field], (state) => state.field(field))
  },
  update(tooltips, tr) {
    if (tr.docChanged || tr.selection) {
      return buildMathPreviewTooltips(tr.state)
    }
    return tooltips
  },
})

export function createLatexSuiteExtension(options?: LatexSuiteOptions): Extension {
  const compiled = compileSnippets(
    options?.snippets ?? DEFAULT_SNIPPETS,
    options?.variables ?? DEFAULT_SNIPPET_VARIABLES,
  )
  const enablePreview = options?.preview ?? true

  const inputHandler = EditorView.inputHandler.of((view, from, to, text) => {
    if (view.state.selection.ranges.length > 1) return false
    if (text.length !== 1) return false

    if (text === " " && from === to) {
      if (tryExpandSnippet(view, compiled, from, to, text, true)) return true
      return false
    }

    if (tryExpandSnippet(view, compiled, from, to, text, false)) return true

    if (text === "/" && from === to && tryAutoFraction(view, from)) {
      return true
    }

    return false
  })

  const suiteKeymap = Prec.high(
    keymap.of([
      {
        key: "Tab",
        run(view) {
          if (jumpTabstop(view, "next")) return true
          const { from, to } = view.state.selection.main
          if (from === to && isInsideMatrixEnv(view.state, from)) {
            view.dispatch({
              changes: { from, insert: " & ", to },
              selection: EditorSelection.cursor(from + 3),
            })
            return true
          }
          return tryTabout(view)
        },
      },
      {
        key: "Shift-Tab",
        run(view) {
          return jumpTabstop(view, "prev")
        },
      },
      {
        key: "Enter",
        run(view) {
          const { from, to } = view.state.selection.main
          if (from !== to || !isInsideMatrixEnv(view.state, from)) return false
          view.dispatch({
            changes: { from, insert: " \\\\\n", to },
            selection: EditorSelection.cursor(from + 4),
          })
          return true
        },
      },
      {
        key: "Backspace",
        run(view) {
          const { from, to } = view.state.selection.main
          if (from !== to || from === 0 || from >= view.state.doc.length) return false
          const before = view.state.doc.sliceString(from - 1, from)
          const after = view.state.doc.sliceString(from, from + 1)
          if (before === "$" && after === "$") {
            view.dispatch({
              changes: { from: from - 1, insert: "", to: from + 1 },
              selection: EditorSelection.cursor(from - 1),
            })
            return true
          }
          return false
        },
      },
    ]),
  )

  const extensions: Extension[] = [
    EditorState.allowMultipleSelections.of(true),
    tabstopsField,
    bracketColorsField,
    inputHandler,
    suiteKeymap,
  ]
  if (enablePreview) extensions.push(mathPreviewField)
  return extensions
}
