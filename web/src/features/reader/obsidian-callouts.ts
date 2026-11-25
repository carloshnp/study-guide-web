/**
 * Rehype plugin that turns Obsidian-syntax blockquotes (`> [!type][+-]? Title`)
 * into structured callout nodes for `Prose.tsx › Callout`.
 *
 * Runs AFTER `rehype-katex` so inline math inside callout titles (such as
 * `> [!theorem] Regra $1/3$ de Simpson`) arrives already rendered as KaTeX
 * spans and is preserved intact inside the header row.
 *
 * Plain blockquotes and legacy `> **Atenção:**` blocks are left completely
 * untouched so older published guides render identically.
 */

import { CALLOUT_MARKER_RE, getCalloutSpec } from "@/lib/callouts"
import type { HastNode } from "./hast"

function isWhitespaceText(node: HastNode): boolean {
  return node.type === "text" && typeof node.value === "string" && node.value.trim() === ""
}

function hasVisibleContent(nodes: readonly HastNode[]): boolean {
  return nodes.some((child) => !isWhitespaceText(child))
}

function splitFirstParagraphAtNewline(children: readonly HastNode[]): {
  titleNodes: HastNode[]
  bodyNodes: HastNode[]
} {
  const titleNodes: HastNode[] = []
  const bodyNodes: HastNode[] = []
  let afterNewline = false

  for (const child of children) {
    if (afterNewline) {
      bodyNodes.push(child)
      continue
    }

    if (child.type === "text" && typeof child.value === "string") {
      const nlIndex = child.value.indexOf("\n")
      if (nlIndex !== -1) {
        const before = child.value.slice(0, nlIndex).replace(/[ \t]+$/, "")
        const after = child.value.slice(nlIndex + 1).replace(/^[ \t]+/, "")
        if (before.length > 0) {
          titleNodes.push({ ...child, value: before })
        }
        if (after.length > 0) {
          bodyNodes.push({ ...child, value: after })
        }
        afterNewline = true
        continue
      }
    }

    titleNodes.push(child)
  }

  return { bodyNodes, titleNodes }
}

function transformBlockquote(node: HastNode): void {
  const children = node.children
  if (!Array.isArray(children) || children.length === 0) return

  const firstIdx = children.findIndex((child) => !isWhitespaceText(child))
  if (firstIdx === -1) return

  const firstChild = children[firstIdx]
  if (firstChild.type !== "element" || firstChild.tagName !== "p") return

  const pChildren = firstChild.children
  if (!Array.isArray(pChildren) || pChildren.length === 0) return

  const lead = pChildren[0]
  if (lead.type !== "text" || typeof lead.value !== "string") return

  const match = CALLOUT_MARKER_RE.exec(lead.value)
  if (!match) return

  const rawType = match[1].toLowerCase()
  const spec = getCalloutSpec(rawType)

  // Strip `[!type][+-]` and any horizontal spaces directly following it on line 1,
  // preserving a leading `\n` so body-on-line-2 still splits cleanly.
  const remainingLead = lead.value.slice(match[0].length).replace(/^[ \t]+/, "")
  const cleanedChildren: HastNode[] =
    remainingLead.length > 0
      ? [{ ...lead, value: remainingLead }, ...pChildren.slice(1)]
      : pChildren.slice(1)

  const { titleNodes, bodyNodes } = splitFirstParagraphAtNewline(cleanedChildren)
  const resolvedTitle: HastNode[] = hasVisibleContent(titleNodes)
    ? titleNodes
    : [{ type: "text", value: spec.label }]

  node.properties = {
    ...(node.properties ?? {}),
    "data-callout-icon": spec.icon,
    "data-callout-tone": spec.tone,
    "data-callout-type": rawType,
  }

  const titleNode: HastNode = {
    children: resolvedTitle,
    properties: { "data-callout-part": "title" },
    tagName: "div",
    type: "element",
  }

  const replacement: HastNode[] = [titleNode]
  if (hasVisibleContent(bodyNodes)) {
    replacement.push({
      children: bodyNodes,
      properties: {},
      tagName: "p",
      type: "element",
    })
  }

  node.children = [
    ...children.slice(0, firstIdx),
    ...replacement,
    ...children.slice(firstIdx + 1),
  ]
}

function visit(node: HastNode): void {
  if (node.type === "element" && node.tagName === "blockquote") {
    transformBlockquote(node)
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visit(child)
    }
  }
}

export function rehypeObsidianCallouts() {
  return (tree: HastNode) => {
    visit(tree)
  }
}
