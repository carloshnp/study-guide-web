/**
 * The reader's one markdown entry point: markdown in, accessible DOM out.
 *
 * Plugin chain (SPEC.md › Locked decisions): `remark-gfm` for tables, task lists
 * and footnotes; `remark-math` + `rehype-katex` for `$…$` and `$$…$$`;
 * `rehype-highlight` for fenced code. Every node type is mapped to a named
 * component — there is no `dangerouslySetInnerHTML` and no HTML blob, so a
 * chapter can only ever produce elements the design system styles.
 *
 * Props carry what the pure markdown cannot know: the image manifest (real
 * dimensions and the original file for the lightbox), the section list (stable
 * anchor ids and the progress units behind each heading) and the chapter
 * identity the `SectionCheck` writes against.
 *
 * `throwOnError: false` on KaTeX is deliberate: one malformed formula in a
 * 3000-line chapter renders as an inline error instead of blanking the page.
 */

import "katex/dist/katex.min.css"
import "./reader.css"

import { useMemo, type ReactNode } from "react"
import Markdown, { type Components } from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import type { PluggableList } from "unified"

import type { ChapterImage, ChapterSection } from "@/lib/content"
import { cn } from "@/lib/utils"
import { normalizeDisplayMath } from "./display-math"
import { createSectionResolver } from "./leading-heading"
import { ChapterHeading, type HeadingLevel } from "./nodes/Heading"
import { ChapterLink } from "./nodes/ChapterLink"
import { CodeBlock } from "./nodes/CodeBlock"
import {
  ChapterTable,
  ChapterTableBody,
  ChapterTableCell,
  ChapterTableHead,
  ChapterTableHeadCell,
  ChapterTableRow,
} from "./nodes/DataTable"
import { ChapterFigure } from "./nodes/Figure"
import { PinnedAnchor } from "./nodes/PinnedAnchor"
import {
  Callout,
  CodeSpan,
  FootnoteSection,
  ListItem,
  OrderedList,
  Paragraph,
  Rule,
  TaskCheckbox,
  UnorderedList,
} from "./nodes/Prose"

export type MarkdownRendererProps = {
  markdown: string
  /** `images[]` of the chapter JSON: dimensions, srcset and the original file. */
  images?: readonly ChapterImage[]
  /** `sections[]` of the chapter JSON: the id every heading and TOC entry uses. */
  sections?: readonly ChapterSection[]
  guideId?: string
  chapterSlug?: string
  className?: string
  /**
   * "Imagem fixa" view: each picture becomes a zero-height marker at its place in
   * the text, and the pinned pane shows the picture there.
   */
  pinnedAnchors?: boolean
}

type ElementProps = {
  children?: ReactNode
  node?: unknown
  className?: string
  id?: string
}

const NO_IMAGES: readonly ChapterImage[] = []
const NO_SECTIONS: readonly ChapterSection[] = []

const REMARK_PLUGINS: PluggableList = [remarkGfm, remarkMath]
const REHYPE_PLUGINS: PluggableList = [
  [rehypeKatex, { strict: false, throwOnError: false }],
  [rehypeHighlight, { detect: false, plainText: ["text", "output", "log"] }],
]

/**
 * Display math arrives as `<span class="katex-display">`. It is kept as a block
 * that scrolls inside itself (`horizontal-scroll`); inline math keeps its own
 * span untouched.
 */
function MathSpan({ className, children, node: _node, ...props }: ElementProps) {
  if (className?.split(/\s+/).includes("katex-display")) {
    return (
      <span
        className={cn("block max-w-full overflow-x-auto overflow-y-hidden py-1", className)}
        data-slot="math-display"
        {...props}
      >
        {children}
      </span>
    )
  }

  return (
    <span className={className} {...props}>
      {children}
    </span>
  )
}

export function MarkdownRenderer({
  markdown,
  images = NO_IMAGES,
  sections = NO_SECTIONS,
  guideId,
  chapterSlug,
  className,
  pinnedAnchors = false,
}: MarkdownRendererProps) {
  // A fresh resolver on every render: it hands sections out in document order,
  // so repeated headings (`Resposta`) keep distinct ids, and a re-render after a
  // progress toggle must start the queue over rather than continue consuming it.
  const resolveSection = createSectionResolver(sections)
  // One-line `$$…$$` paragraphs win nothing from KaTeX unless they are re-flowed.
  const source = useMemo(() => normalizeDisplayMath(markdown), [markdown])

  const components: Components = (() => {
    const heading =
      (level: HeadingLevel) =>
      ({ children, node, id }: ElementProps) => (
        <ChapterHeading
          chapterSlug={chapterSlug}
          guideId={guideId}
          id={id}
          level={level}
          node={node}
          resolveSection={resolveSection}
        >
          {children}
        </ChapterHeading>
      )

    return {
      a: ChapterLink,
      blockquote: Callout,
      code: CodeSpan,
      h1: heading(1),
      h2: heading(2),
      h3: heading(3),
      h4: heading(4),
      h5: heading(5),
      h6: heading(6),
      hr: Rule,
      img: (props) =>
        pinnedAnchors ? <PinnedAnchor {...props} /> : <ChapterFigure {...props} images={images} />,
      input: TaskCheckbox,
      li: ListItem,
      ol: OrderedList,
      p: Paragraph,
      pre: CodeBlock,
      section: FootnoteSection,
      span: MathSpan,
      table: ChapterTable,
      tbody: ChapterTableBody,
      td: ChapterTableCell,
      th: ChapterTableHeadCell,
      thead: ChapterTableHead,
      tr: ChapterTableRow,
      ul: UnorderedList,
    }
  })()

  return (
    <div
      className={cn("reader-prose max-w-[var(--measure)] text-body text-foreground", className)}
      data-slot="reader-prose"
    >
      <Markdown
        components={components}
        rehypePlugins={REHYPE_PLUGINS}
        remarkPlugins={REMARK_PLUGINS}
      >
        {source}
      </Markdown>
    </div>
  )
}
