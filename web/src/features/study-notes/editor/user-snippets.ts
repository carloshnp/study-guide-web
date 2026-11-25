/**
 * User-editable LaTeX snippet storage & parser.
 *
 * Defaults to the bundled copy of `/run/media/carloshnp/D/Obsidian/Study/latex-snippets.js`.
 * Users can customize the JS snippet array from the editor toolbar dialog; edits
 * persist in `localStorage` and validate before saving.
 */

import { DEFAULT_SNIPPETS, type LatexSnippet } from "./default-snippets"
import DEFAULT_SNIPPETS_SOURCE from "./default-snippets.raw.txt?raw"

const STORAGE_KEY = "estudos-latex-snippets"

export { DEFAULT_SNIPPETS_SOURCE }

export type ParseSnippetsResult =
  | { ok: true; snippets: LatexSnippet[] }
  | { ok: false; error: string }

export function parseSnippetsSource(source: string): ParseSnippetsResult {
  const trimmed = source.trim()
  if (!trimmed) {
    return { ok: true, snippets: [] }
  }
  try {
    // Evaluate JS array literal (same format as Obsidian's latex-snippets.js,
    // which includes RegExp triggers and JS function replacements like `iden`).
    const evaluator = new Function(`"use strict"; return (\n${trimmed}\n);`)
    const parsed: unknown = evaluator()
    if (!Array.isArray(parsed)) {
      return { error: "Os snippets devem ser um array JavaScript ([ ... ]).", ok: false }
    }
    const valid: LatexSnippet[] = []
    for (let i = 0; i < parsed.length; i += 1) {
      const entry = parsed[i] as Record<string, unknown> | null
      if (
        !entry ||
        typeof entry !== "object" ||
        (typeof entry.trigger !== "string" && !(entry.trigger instanceof RegExp)) ||
        (typeof entry.replacement !== "string" && typeof entry.replacement !== "function") ||
        typeof entry.options !== "string"
      ) {
        return {
          error: `Snippet inválido no índice ${i}: cada item precisa de trigger, replacement e options.`,
          ok: false,
        }
      }
      valid.push({
        description: typeof entry.description === "string" ? entry.description : undefined,
        options: entry.options,
        priority: typeof entry.priority === "number" ? entry.priority : undefined,
        replacement: entry.replacement as LatexSnippet["replacement"],
        trigger: entry.trigger as LatexSnippet["trigger"],
      })
    }
    return { ok: true, snippets: valid }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Erro de sintaxe nos snippets."
    return { error: message, ok: false }
  }
}

export function loadUserSnippetsSource(): string {
  if (typeof window === "undefined") return DEFAULT_SNIPPETS_SOURCE
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ?? DEFAULT_SNIPPETS_SOURCE
  } catch {
    return DEFAULT_SNIPPETS_SOURCE
  }
}

export function loadActiveSnippets(): readonly LatexSnippet[] {
  if (typeof window === "undefined") return DEFAULT_SNIPPETS
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_SNIPPETS
    const parsed = parseSnippetsSource(saved)
    return parsed.ok ? parsed.snippets : DEFAULT_SNIPPETS
  } catch {
    return DEFAULT_SNIPPETS
  }
}

export function saveUserSnippetsSource(source: string): ParseSnippetsResult {
  const parsed = parseSnippetsSource(source)
  if (!parsed.ok) return parsed
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, source)
    } catch {
      // Ignore storage quota errors in private browsing.
    }
  }
  return parsed
}

export function resetUserSnippetsSource(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors.
  }
}
