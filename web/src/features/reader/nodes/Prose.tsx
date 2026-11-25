/**
 * The remaining prose nodes of the component map: paragraph, lists, callout,
 * inline code, rule and footnote section.
 *
 * Every markdown node type gets a named component (no raw HTML blob anywhere),
 * and each one owns its rhythm from the design system: 16px between blocks,
 * 32px before a heading block (the heading itself contributes that), 44px touch
 * targets and no hover-only affordance.
 */

import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react"

import type { CalloutTone } from "@/lib/callouts"
import { cn } from "@/lib/utils"

/** react-markdown hands the hast node along with the element props. */
type MdProps<Tag extends keyof React.JSX.IntrinsicElements> = ComponentPropsWithoutRef<Tag> & {
  node?: unknown
}

export function Paragraph({ children }: MdProps<"p">) {
  return <p className="mt-4 text-body text-foreground first:mt-0">{children}</p>
}

export function UnorderedList({ children }: MdProps<"ul">) {
  return (
    <ul className="mt-4 flex list-disc flex-col gap-1 ps-6 text-body text-foreground">
      {children}
    </ul>
  )
}

export function OrderedList({ children }: MdProps<"ol">) {
  return (
    <ol className="mt-4 flex list-decimal flex-col gap-1 ps-6 text-body text-foreground">
      {children}
    </ol>
  )
}

export function ListItem({ children }: MdProps<"li">) {
  return <li className="ps-1 marker:text-faint [&>p]:mt-0">{children}</li>
}

type CalloutProps = MdProps<"blockquote"> & {
  "data-callout-type"?: string
  "data-callout-tone"?: CalloutTone
  "data-callout-icon"?: string
}

function isCalloutTitleNode(child: ReactNode): boolean {
  if (!isValidElement<{ "data-callout-part"?: string }>(child)) return false
  return child.props["data-callout-part"] === "title"
}

/**
 * Blockquote as a callout: legacy blockquotes keep the calm single-accent strip,
 * while Obsidian callouts (`> [!theorem]`, `> [!proof]`, `> [!obs]`, …) render
 * always expanded with their tone, icon and title matching the study-notes editor.
 */
export function Callout({
  children,
  "data-callout-type": calloutType,
  "data-callout-tone": tone = "blue",
  "data-callout-icon": icon = "•",
}: CalloutProps) {
  if (!calloutType) {
    return (
      <blockquote
        className="mt-6 rounded-e-lg border-s-[3px] border-brand bg-brand-soft px-4 py-3 text-body text-foreground [&>p:first-child]:mt-0 [&>p]:mt-2"
        data-slot="callout"
      >
        {children}
      </blockquote>
    )
  }

  const allChildren = Children.toArray(children)
  const titleEl = allChildren.find((child) => isCalloutTitleNode(child))
  const bodyNodes = allChildren.filter((child) => {
    if (isCalloutTitleNode(child)) return false
    if (typeof child === "string" && child.trim() === "") return false
    return true
  })

  const titleContent = isValidElement<{ children?: ReactNode }>(titleEl)
    ? titleEl.props.children
    : calloutType

  return (
    <blockquote
      className="reader-callout mt-6 rounded-e-lg border-s-[3px] px-4 py-3 text-body text-foreground"
      data-callout-tone={tone}
      data-callout-type={calloutType}
      data-slot="callout"
    >
      <div className="reader-callout-header flex items-center gap-2">
        <span aria-hidden="true" className="reader-callout-icon shrink-0">
          {icon}
        </span>
        <span className="reader-callout-title min-w-0 flex-1">{titleContent}</span>
      </div>
      {bodyNodes.length > 0 ? (
        <div className="reader-callout-body mt-2 [&>p:first-child]:mt-0 [&>p]:mt-2 [&>ul:first-child]:mt-0 [&>ol:first-child]:mt-0">
          {bodyNodes}
        </div>
      ) : null}
    </blockquote>
  )
}

export function Rule() {
  return <hr className="mt-8 border-0 border-t border-border" />
}

/**
 * Inline code. Fences reach this component too (they are `code` inside `pre`),
 * and they carry the highlight or language class, so styling only applies to the
 * ones without a class.
 */
export function CodeSpan({ children, className, node: _node, ...props }: MdProps<"code">) {
  if (className?.includes("language-") || className?.includes("hljs")) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }

  return (
    <code
      className={cn(
        "rounded-[var(--radius-inline-code)] bg-code px-1.5 py-0.5 font-mono text-[0.92em] text-foreground",
        "[overflow-wrap:anywhere]",
        className,
      )}
      data-slot="inline-code"
      {...props}
    >
      {children}
    </code>
  )
}

export type SimpleNodeProps = { children?: ReactNode; node?: unknown }

/**
 * GFM task-list checkboxes (`- [ ] feito`). They are decorative in the rendered
 * reader — the real state lives in the progress store — so they stay disabled and
 * out of the tab order.
 */
export function TaskCheckbox() {
  return (
    <input
      aria-hidden="true"
      className="me-2 size-4 translate-y-0.5 accent-brand"
      disabled
      type="checkbox"
    />
  )
}

/** GFM footnotes: a calm section at the end of the chapter with a back reference. */
export function FootnoteSection({ children, ...props }: SimpleNodeProps) {
  return (
    <section
      className="mt-12 border-t border-border pt-6 text-meta text-muted-foreground [&_h2]:mt-0 [&_h2]:text-kicker [&_h2]:uppercase [&_h2]:tracking-[0.16em] [&_li]:mt-2 [&_ol]:mt-3"
      data-slot="footnotes"
      {...props}
    >
      {children}
    </section>
  )
}
