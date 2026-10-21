/**
 * Minimal, typed access to the hast nodes `react-markdown` hands to a component.
 *
 * The component map needs three things the React props do not carry: the plain
 * text of a heading (to match it against the section list), the code of a fence
 * (to copy it) and the language class of that fence (for the caption row). The
 * node is `unknown` at the boundary, so every accessor is a guard instead of a
 * cast, and a shape the build never produces degrades to empty values.
 */

export type HastNode = {
  type?: string
  tagName?: string
  value?: unknown
  children?: HastNode[]
  properties?: Record<string, unknown>
}

export function isHastNode(value: unknown): value is HastNode {
  return typeof value === "object" && value !== null
}

export function hastChildren(node: unknown): HastNode[] {
  if (!isHastNode(node)) return []
  const children = node.children
  return Array.isArray(children) ? children : []
}

/** Children that are elements; hast pads block elements with `\n` text nodes. */
export function elementChildren(node: unknown): HastNode[] {
  return hastChildren(node).filter((child) => typeof child.tagName === "string")
}

/** Concatenated text of a node and its descendants. */
export function textOfNode(node: unknown): string {
  if (!isHastNode(node)) return ""
  if (typeof node.value === "string") return node.value
  if (typeof node.value === "number") return String(node.value)
  return hastChildren(node).map((child) => textOfNode(child)).join("")
}

/** Class names of an element, whatever shape the property arrived in. */
export function classListOf(node: unknown): string[] {
  if (!isHastNode(node)) return []
  const className = node.properties?.className
  if (typeof className === "string") return className.split(/\s+/).filter(Boolean)
  if (Array.isArray(className)) {
    return className.filter((entry): entry is string => typeof entry === "string")
  }
  return []
}

export function firstChildWithTag(node: unknown, tagName: string): HastNode | null {
  return elementChildren(node).find((child) => child.tagName === tagName) ?? null
}

/** `language-python` → `python`; null when the fence has no language. */
export function languageOf(node: unknown): string | null {
  for (const className of classListOf(node)) {
    const match = /^language-(.+)$/.exec(className)
    if (match) return match[1]
  }
  return null
}
