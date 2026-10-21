/**
 * The remaining prose nodes of the component map: paragraph, lists, callout,
 * inline code, rule and footnote section.
 *
 * Every markdown node type gets a named component (no raw HTML blob anywhere),
 * and each one owns its rhythm from the design system: 16px between blocks,
 * 32px before a heading block (the heading itself contributes that), 44px touch
 * targets and no hover-only affordance.
 */

import type { ComponentPropsWithoutRef, ReactNode } from "react"

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

/** Blockquote as a callout: 3px accent rule, soft background, no shadow. */
export function Callout({ children }: MdProps<"blockquote">) {
  return (
    <blockquote
      className="mt-6 rounded-e-lg border-s-[3px] border-brand bg-brand-soft px-4 py-3 text-body text-foreground [&>p:first-child]:mt-0 [&>p]:mt-2"
      data-slot="callout"
    >
      {children}
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
