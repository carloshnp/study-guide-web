/**
 * Shared Obsidian callout catalog used by both the study-notes CodeMirror live
 * preview and the chapter MarkdownReader.
 *
 * Keeping one table guarantees that `> [!theorem]`, `> [!proof]`, `> [!obs]-`,
 * `> [!warning]`, `> [!example]` and `> [!summary]` share the exact same icon,
 * default Portuguese label and tone across notes and study guides.
 */

export type CalloutTone =
  | "blue"
  | "teal"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "neutral"

export type CalloutSpec = {
  tone: CalloutTone
  icon: string
  label: string
}

/** Matches a raw markdown callout header line: `> [!type][+-]? Optional title`. */
export const CALLOUT_HEADER_RE = /^(\s*)>\s*\[!([a-zA-Z0-9_-]+)\]([+-])?(?:\s+(.*))?$/

/** Matches the leading `[!type][+-]?` token inside an already-parsed blockquote. */
export const CALLOUT_MARKER_RE = /^\[!([a-zA-Z0-9_-]+)\]([+-])?(?=[ \t\r\n]|$)/

export const CALLOUT_SPECS: Record<string, CalloutSpec> = {
  abstract: { icon: "≡", label: "Resumo", tone: "blue" },
  attention: { icon: "!", label: "Atenção", tone: "amber" },
  bug: { icon: "✕", label: "Bug", tone: "red" },
  caution: { icon: "!", label: "Cuidado", tone: "amber" },
  check: { icon: "✓", label: "Concluído", tone: "green" },
  cite: { icon: "“", label: "Citação", tone: "neutral" },
  corollary: { icon: "§", label: "Corolário", tone: "purple" },
  danger: { icon: "✕", label: "Perigo", tone: "red" },
  definition: { icon: "§", label: "Definição", tone: "purple" },
  done: { icon: "✓", label: "Concluído", tone: "green" },
  error: { icon: "✕", label: "Erro", tone: "red" },
  example: { icon: "◈", label: "Exemplo", tone: "purple" },
  fail: { icon: "✕", label: "Falha", tone: "red" },
  failure: { icon: "✕", label: "Falha", tone: "red" },
  faq: { icon: "?", label: "FAQ", tone: "amber" },
  formula: { icon: "ƒ", label: "Fórmula", tone: "neutral" },
  help: { icon: "?", label: "Ajuda", tone: "amber" },
  hint: { icon: "✦", label: "Dica", tone: "teal" },
  important: { icon: "✦", label: "Importante", tone: "teal" },
  info: { icon: "i", label: "Info", tone: "teal" },
  lemma: { icon: "§", label: "Lema", tone: "purple" },
  missing: { icon: "✕", label: "Ausente", tone: "red" },
  note: { icon: "✎", label: "Nota", tone: "blue" },
  obs: { icon: "i", label: "Observação", tone: "teal" },
  proof: { icon: "∎", label: "Demonstração", tone: "green" },
  proposition: { icon: "§", label: "Proposição", tone: "purple" },
  question: { icon: "?", label: "Pergunta", tone: "amber" },
  quote: { icon: "“", label: "Citação", tone: "neutral" },
  seealso: { icon: "→", label: "Veja também", tone: "blue" },
  success: { icon: "✓", label: "Sucesso", tone: "green" },
  summary: { icon: "≡", label: "Resumo", tone: "blue" },
  theorem: { icon: "§", label: "Teorema", tone: "purple" },
  theory: { icon: "≡", label: "Teoria", tone: "blue" },
  tip: { icon: "✦", label: "Dica", tone: "teal" },
  tldr: { icon: "≡", label: "TL;DR", tone: "blue" },
  todo: { icon: "○", label: "A fazer", tone: "teal" },
  warning: { icon: "!", label: "Atenção", tone: "amber" },
}

export function getCalloutSpec(type: string): CalloutSpec {
  const existing = CALLOUT_SPECS[type.toLowerCase()]
  if (existing) return existing
  return {
    icon: "•",
    label: type ? `${type[0].toUpperCase()}${type.slice(1)}` : "Nota",
    tone: "blue",
  }
}
