/**
 * Obsidian-style `/` slash-command palette for CodeMirror 6 with an optimized
 * bitmask-accelerated fuzzy matcher.
 *
 * Only activates in text mode (outside `$...$` / `$$...$$`) when `/` sits at
 * line start or after whitespace, so `/` inside math keeps working for
 * auto-fractions and `//`.
 */

import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete"
import { EditorSelection, type Extension } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

import { isInsideMath } from "./latex-suite"

type SlashCommandDef = {
  id: string
  label: string
  detail: string
  keywords: string
  insert: string
  /** Cursor offset inside `insert` (defaults to end of `insert`). */
  cursorOffset?: number
}

type IndexedCommand = SlashCommandDef & {
  labelNorm: string
  tokens: readonly string[]
  initials: string
  mask: number
}

const RAW_COMMANDS: readonly SlashCommandDef[] = [
  {
    cursorOffset: 3,
    detail: "$$ ... $$",
    id: "math-block",
    insert: "$$\n\n$$",
    keywords: "math block display equacao bloco matematica dm",
    label: "Math block",
  },
  {
    cursorOffset: 1,
    detail: "$ ... $",
    id: "inline-math",
    insert: "$$",
    keywords: "inline math matematica mk formula",
    label: "Inline math",
  },
  {
    cursorOffset: 16,
    detail: "align",
    id: "align",
    insert: "$$\\begin{align}\n\n\\end{align}$$",
    keywords: "align alinhar sistema equacoes math",
    label: "Align block",
  },
  {
    cursorOffset: 16,
    detail: "cases",
    id: "cases",
    insert: "$$\\begin{cases}\n\n\\end{cases}$$",
    keywords: "cases casos partes piecewise funcao",
    label: "Cases (por partes)",
  },
  {
    cursorOffset: 18,
    detail: "pmatrix",
    id: "pmatrix",
    insert: "$$\\begin{pmatrix}\n\n\\end{pmatrix}$$",
    keywords: "matrix pmatrix matriz parenteses",
    label: "Matrix (pmatrix)",
  },
  {
    cursorOffset: 18,
    detail: "bmatrix",
    id: "bmatrix",
    insert: "$$\\begin{bmatrix}\n\n\\end{bmatrix}$$",
    keywords: "matrix bmatrix matriz colchetes",
    label: "Matrix (bmatrix)",
  },
  {
    cursorOffset: 12,
    detail: ">[!theorem]",
    id: "callout-theorem",
    insert: ">[!theorem] Definição\n>",
    keywords: "callout theorem teorema definicao box",
    label: "Callout: Teorema / Definição",
  },
  {
    cursorOffset: 24,
    detail: ">[!proof]",
    id: "callout-proof",
    insert: ">[!proof] Demonstração\n>",
    keywords: "callout proof demonstracao prova",
    label: "Callout: Demonstração (Proof)",
  },
  {
    cursorOffset: 20,
    detail: ">[!obs]",
    id: "callout-obs",
    insert: ">[!obs] Observação\n>",
    keywords: "callout obs observacao nota info",
    label: "Callout: Observação",
  },
  {
    cursorOffset: 21,
    detail: ">[!warning]",
    id: "callout-warning",
    insert: ">[!warning] Atenção\n>",
    keywords: "callout warning atencao aviso cuidado",
    label: "Callout: Atenção (Warning)",
  },
  {
    cursorOffset: 18,
    detail: ">[!danger]",
    id: "callout-danger",
    insert: ">[!danger] Erro\n>",
    keywords: "callout danger perigo erro",
    label: "Callout: Perigo (Danger)",
  },
  {
    cursorOffset: 15,
    detail: ">[!tip]",
    id: "callout-tip",
    insert: ">[!tip] Dica\n>",
    keywords: "callout tip dica hint",
    label: "Callout: Dica (Tip)",
  },
  {
    cursorOffset: 21,
    detail: ">[!example]",
    id: "callout-example",
    insert: ">[!example] Exemplo\n>",
    keywords: "callout example exemplo",
    label: "Callout: Exemplo",
  },
  {
    cursorOffset: 2,
    detail: "# Título",
    id: "h1",
    insert: "# ",
    keywords: "heading h1 titulo cabecalho 1",
    label: "Heading 1",
  },
  {
    cursorOffset: 3,
    detail: "## Título",
    id: "h2",
    insert: "## ",
    keywords: "heading h2 titulo cabecalho 2",
    label: "Heading 2",
  },
  {
    cursorOffset: 4,
    detail: "### Título",
    id: "h3",
    insert: "### ",
    keywords: "heading h3 titulo cabecalho 3",
    label: "Heading 3",
  },
  {
    cursorOffset: 2,
    detail: "- item",
    id: "bullet-list",
    insert: "- ",
    keywords: "bullet list lista marcadores",
    label: "Bullet list",
  },
  {
    cursorOffset: 3,
    detail: "1. item",
    id: "numbered-list",
    insert: "1. ",
    keywords: "numbered ordered list lista numerada",
    label: "Numbered list",
  },
  {
    cursorOffset: 2,
    detail: "> citação",
    id: "quote",
    insert: "> ",
    keywords: "quote blockquote citacao",
    label: "Quote",
  },
  {
    cursorOffset: 4,
    detail: "``` ... ```",
    id: "code-block",
    insert: "```\n\n```",
    keywords: "code block codigo bloco",
    label: "Code block",
  },
  {
    cursorOffset: 2,
    detail: "| Col | Col |",
    id: "table",
    insert: "| Coluna 1 | Coluna 2 |\n| --- | --- |\n|  |  |",
    keywords: "table tabela grid",
    label: "Table",
  },
  {
    detail: "---",
    id: "divider",
    insert: "---\n",
    keywords: "divider hr linha separador",
    label: "Divider",
  },
  {
    cursorOffset: 7,
    detail: "$\\frac{}{}$",
    id: "fraction",
    insert: "$\\frac{}{}$",
    keywords: "fraction fracao frac divisao",
    label: "Fraction (inline)",
  },
  {
    cursorOffset: 10,
    detail: "$\\int_{}^{}$",
    id: "integral",
    insert: "$\\int_{0}^{\\infty}  \\, dt$",
    keywords: "integral int calculo",
    label: "Integral (inline)",
  },
  {
    cursorOffset: 8,
    detail: "$\\sum_{}^{}$",
    id: "sum",
    insert: "$\\sum_{n=1}^{\\infty} $",
    keywords: "sum somatorio soma",
    label: "Sum (inline)",
  },
  {
    cursorOffset: 9,
    detail: "$\\lim_{}$",
    id: "limit",
    insert: "$\\lim_{n \\to \\infty} $",
    keywords: "limit limite lim",
    label: "Limit (inline)",
  },
  {
    cursorOffset: 7,
    detail: "\\Aboxed{}",
    id: "aboxed",
    insert: "\\Aboxed{ & = }",
    keywords: "aboxed box caixa destacar resultado",
    label: "Aboxed (destaque)",
  },
]

function normalizeAscii(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/** 32-bit character presence bitmask for O(1) non-match rejection. */
function charMask(str: string): number {
  let mask = 0
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i)
    if (code >= 97 && code <= 122) {
      mask |= 1 << (code - 97)
    } else if (code >= 48 && code <= 57) {
      mask |= 1 << 26
    }
  }
  return mask
}

const INDEXED_COMMANDS: readonly IndexedCommand[] = RAW_COMMANDS.map((cmd) => {
  const labelNorm = normalizeAscii(cmd.label)
  const kwNorm = normalizeAscii(cmd.keywords)
  const labelWords = labelNorm.split(/[^a-z0-9]+/).filter(Boolean)
  const kwWords = kwNorm.split(/[^a-z0-9]+/).filter(Boolean)
  const tokens = Array.from(new Set([labelNorm, ...labelWords, ...kwWords]))
  const initials = labelWords.map((w) => w[0]).join("")
  return {
    ...cmd,
    initials,
    labelNorm,
    mask: charMask(`${labelNorm} ${kwNorm}`),
    tokens,
  }
})

/**
 * Tight subsequence scorer on a single normalized target (label or keyword token):
 * requires either contiguous substring, word-start acronym, or tight subsequence
 * without giant gaps across unrelated words.
 */
function scoreToken(query: string, target: string, bonus: number): number {
  const qLen = query.length
  if (qLen === 0) return 100
  if (target.startsWith(query)) {
    return 200 + bonus - (target.length - qLen) * 0.5
  }
  const subIdx = target.indexOf(query)
  if (subIdx !== -1) {
    const atWordBoundary = subIdx === 0 || target.charCodeAt(subIdx - 1) === 32
    return (atWordBoundary ? 170 : 120) + bonus - subIdx * 2
  }
  // Subsequence match inside a single word/label with gap penalty so scattered letters don't spam results.
  let qi = 0
  let score = 0
  let consecutive = 0
  let lastMatch = -1
  let maxGap = 0

  for (let ti = 0; ti < target.length && qi < qLen; ti += 1) {
    if (target.charCodeAt(ti) === query.charCodeAt(qi)) {
      if (lastMatch !== -1) {
        const gap = ti - lastMatch - 1
        if (gap > maxGap) maxGap = gap
      }
      const isWordStart = ti === 0 || target.charCodeAt(ti - 1) === 32
      consecutive = lastMatch === ti - 1 ? consecutive + 1 : 1
      score += 10 + consecutive * 6 + (isWordStart ? 18 : 0)
      lastMatch = ti
      qi += 1
    }
  }

  if (qi < qLen) return -1
  // Reject loose accidental matches with huge gaps unless matching initials.
  if (maxGap > 5) return -1
  return score + bonus - maxGap * 4
}

export function filterSlashCommands(rawQuery: string, limit = 12): readonly SlashCommandDef[] {
  const query = normalizeAscii(rawQuery.trim())
  if (!query) return INDEXED_COMMANDS.slice(0, limit)

  const qMask = charMask(query)
  const scored: { cmd: IndexedCommand; score: number }[] = []

  for (let i = 0; i < INDEXED_COMMANDS.length; i += 1) {
    const cmd = INDEXED_COMMANDS[i]
    // Fast O(1) bitmask rejection before scanning strings.
    if ((cmd.mask & qMask) !== qMask) continue

    let best = -1
    if (cmd.initials.startsWith(query)) {
      best = 185 - (cmd.initials.length - query.length) * 2
    }
    const labelScore = scoreToken(query, cmd.labelNorm, 30)
    if (labelScore > best) best = labelScore

    for (let t = 1; t < cmd.tokens.length; t += 1) {
      const s = scoreToken(query, cmd.tokens[t], 0)
      if (s > best) best = s
    }

    if (best >= 0) {
      scored.push({ cmd, score: best })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((entry) => entry.cmd)
}

function slashCompletionSource(context: CompletionContext): CompletionResult | null {
  if (isInsideMath(context.state, context.pos)) return null

  const line = context.state.doc.lineAt(context.pos)
  const before = line.text.slice(0, context.pos - line.from)
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(before)
  if (!match) return null

  const query = match[1]
  const slashOffset = before.lastIndexOf("/")
  const from = line.from + slashOffset
  const matches = filterSlashCommands(query)
  if (matches.length === 0) return null

  const options: Completion[] = matches.map((cmd, idx) => ({
    apply(view: EditorView, _completion: Completion, applyFrom: number, applyTo: number) {
      const cursorPos =
        cmd.cursorOffset !== undefined ? applyFrom + cmd.cursorOffset : applyFrom + cmd.insert.length
      view.dispatch({
        changes: { from: applyFrom, insert: cmd.insert, to: applyTo },
        selection: EditorSelection.cursor(cursorPos),
      })
    },
    boost: matches.length - idx,
    detail: cmd.detail,
    label: cmd.label,
    type: "keyword",
  }))

  return {
    filter: false,
    from,
    options,
    // Re-filter synchronously on every keystroke after `/` with zero flicker or delay.
    update(_current, _from, _to, nextContext) {
      return slashCompletionSource(nextContext)
    },
  }
}

export function createSlashCommandsExtension(): Extension {
  return autocompletion({
    activateOnTyping: true,
    activateOnTypingDelay: 0,
    icons: false,
    override: [slashCompletionSource],
  })
}
