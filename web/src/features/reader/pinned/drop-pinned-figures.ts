/**
 * The "imagem fixa" view pins each section's picture beside the text. A
 * "guia resumido" also places the same picture inside its prose, so the reader
 * would see it twice. This removes those inline copies while the pinned view is
 * on.
 *
 * A copy is recognised by its alt text: the pinned picture and the inline one
 * carry the same caption (`Infográfico 3.1 …`), while the file behind them can
 * differ, because the resumo ships its own WebP. Only a picture alone on its
 * line is removed. A picture inside a paragraph, or inside a code fence, stays.
 */

const FENCE_OPEN = /^[ \t]*(```|~~~)/
const STANDALONE_IMAGE = /^!\[([^\]]*)\]\([^)]*\)$/

function normalizeAlt(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

export function dropPinnedFigures(markdown: string, pinnedAlts: readonly string[]): string {
  if (pinnedAlts.length === 0) return markdown

  const pinned = new Set(pinnedAlts.map(normalizeAlt))
  let fenced = false
  const kept: string[] = []

  for (const line of markdown.split("\n")) {
    if (FENCE_OPEN.test(line)) {
      fenced = !fenced
      kept.push(line)
      continue
    }
    if (!fenced) {
      const match = STANDALONE_IMAGE.exec(line.trim())
      if (match && pinned.has(normalizeAlt(match[1]))) continue
    }
    kept.push(line)
  }

  return kept.join("\n")
}
