/**
 * Reading the user's selection out of the chapter body.
 *
 * Kept apart from the React component so the rules are testable in jsdom: the
 * selection must be non-empty, at least three characters, and anchored inside
 * the article the reader mounted (a selection in the sidebar or the toolbar must
 * not offer "Criar card").
 */

export type SelectionAnchor = {
  /** Collapsed whitespace, trimmed — what becomes the card's front. */
  text: string
  /** Reconstructed Markdown preserving inline/display LaTeX and basic formatting. */
  markdown: string
  /** Node the selection starts at, used to find the enclosing section heading. */
  node: Node
  /** Cloned DOM Range for anchoring highlights without mutating the live selection. */
  range: Range
  /** Viewport rect of the range, for positioning the floating button. */
  rect: { bottom: number; height: number; left: number; right: number; top: number; width: number }
}

/** Longer passages are still usable, but a card is not an essay; keep 800 chars. */
export const MAX_SNIPPET_LENGTH = 800

function stripAutoDisplayStyle(tex: string): string {
  const trimmed = tex.trim()
  return trimmed.startsWith("\\displaystyle ") ? trimmed.slice("\\displaystyle ".length).trim() : trimmed
}

function serializeNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ""
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ""

  const el = node as HTMLElement
  const classes = el.classList

  // KaTeX display math (`<span class="katex-display">`)
  if (classes.contains("katex-display") || el.dataset.slot === "math-display") {
    const ann = el.querySelector('annotation[encoding="application/x-tex"]')
    const tex = stripAutoDisplayStyle(ann?.textContent ?? "")
    return tex ? `\n$$\n${tex}\n$$\n` : ""
  }

  // KaTeX inline math (`<span class="katex">`)
  if (classes.contains("katex")) {
    const ann = el.querySelector('annotation[encoding="application/x-tex"]')
    const tex = stripAutoDisplayStyle(ann?.textContent ?? "")
    return tex ? `$${tex}$` : ""
  }

  // Skip KaTeX's internal duplicate HTML/MathML children if encountered directly
  if (classes.contains("katex-mathml") || classes.contains("katex-html")) {
    return ""
  }

  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map(serializeNodeToMarkdown).join("")

  if (tag === "strong" || tag === "b") return children.trim() ? `**${children}**` : children
  if (tag === "em" || tag === "i") return children.trim() ? `*${children}*` : children
  if (tag === "code") {
    if (el.parentElement?.tagName.toLowerCase() === "pre") return children
    return children ? `\`${children}\`` : ""
  }
  if (tag === "pre") return `\n\`\`\`\n${el.textContent ?? ""}\n\`\`\`\n`
  if (tag === "br") return "\n"
  if (tag === "li") return `- ${children.trim()}\n`
  if (tag === "p" || tag === "blockquote" || tag === "div") return `${children}\n\n`
  if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${children.trim()}\n\n`

  return children
}

function extractSelectionMarkdown(range: Range, fallbackText: string): string {
  if (typeof range.cloneContents !== "function") return fallbackText
  try {
    const fragment = range.cloneContents()
    const raw = Array.from(fragment.childNodes)
      .map(serializeNodeToMarkdown)
      .join("")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    return raw || fallbackText
  } catch {
    return fallbackText
  }
}

export function readSelection(root: HTMLElement | null): SelectionAnchor | null {
  if (!root || typeof window === "undefined") return null
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const node = selection.anchorNode
  if (!node || !root.contains(node)) return null

  const text = selection
    .toString()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SNIPPET_LENGTH)
  if (text.length < 3) return null

  const range = selection.getRangeAt(0)
  const clonedRange = typeof range.cloneRange === "function" ? range.cloneRange() : range
  const rect = range.getBoundingClientRect()
  const markdown = extractSelectionMarkdown(range, text)
  return {
    markdown,
    node,
    range: clonedRange,
    rect: {
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: rect.width,
    },
    text,
  }
}

/**
 * The section whose heading precedes `node` in document order, restricted to the
 * ids the chapter manifest knows. Walks the headings once, so a selection under
 * "2.3 Precipitação" links back to that anchor and not to the chapter top.
 */
export function sectionIdOf(
  node: Node,
  root: HTMLElement | null,
  sections: readonly { id: string }[],
): string | null {
  if (!root) return null
  const known = new Set(sections.map((section) => section.id))
  const headings = root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")
  let found: string | null = null

  for (const heading of headings) {
    if (!heading.id || !known.has(heading.id)) continue
    // FOLLOWING means the heading sits before the selected node.
    if (heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) {
      found = heading.id
    } else {
      break
    }
  }

  return found
}
