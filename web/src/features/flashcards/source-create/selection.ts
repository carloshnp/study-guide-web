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
  /** Node the selection starts at, used to find the enclosing section heading. */
  node: Node
  /** Viewport rect of the range, for positioning the floating button. */
  rect: { bottom: number; height: number; left: number; right: number; top: number; width: number }
}

/** Longer passages are still usable, but a card is not an essay; keep 800 chars. */
export const MAX_SNIPPET_LENGTH = 800

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

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  return {
    node,
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
