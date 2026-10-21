/**
 * h1–h4 of a chapter, wrapped in the gutter that holds their progress check.
 *
 * The heading gets the section id the build assigned, so `ChapterToc` links and
 * `#fragment` deep links land on it (`[id] { scroll-margin-top }` in the global
 * sheet keeps the sticky bar from covering it). It also gets a `SectionCheck`
 * when the chapter identity is known: on desktop the check sits in the 20px
 * gutter to the left, on touch it becomes a 44px row above the heading
 * (`touch-target-size`, `hover-vs-tap`).
 *
 * A heading the section list does not know (a front-matter block, a heading the
 * build folded in) still gets a stable slug id so the anchor is never empty.
 */

import type { ReactNode } from "react"

import { SectionCheck } from "@/features/progress/SectionCheck"
import { textOfNode } from "../hast"
import { slugifyHeading, type createSectionResolver } from "../leading-heading"

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type ChapterHeadingProps = {
  level: HeadingLevel
  children?: ReactNode
  node?: unknown
  /** id the markdown itself carries (GFM footnotes, for instance). */
  id?: string
  resolveSection: ReturnType<typeof createSectionResolver>
  guideId?: string
  chapterSlug?: string
  className?: string
}

const LEVEL_CLASS: Record<HeadingLevel, string> = {
  1: "font-heading text-chapter text-foreground",
  2: "font-heading text-h2 text-foreground",
  3: "font-heading text-h3 text-foreground",
  4: "font-heading text-h4 text-foreground",
  5: "font-heading text-h4 text-foreground",
  6: "font-heading text-h4 text-muted-foreground",
}

/** Headings that can carry a unit; the chapter title is the page h1. */
const CHECKABLE: ReadonlySet<number> = new Set([2, 3, 4])

export function ChapterHeading({
  level,
  children,
  node,
  id,
  resolveSection,
  guideId,
  chapterSlug,
  className,
}: ChapterHeadingProps) {
  const title = textOfNode(node).trim()
  const section = title === "" ? undefined : resolveSection(title, level)
  const anchorId = section?.id ?? id ?? slugifyHeading(title)
  const checkable = Boolean(section && guideId && chapterSlug && CHECKABLE.has(level))

  const Tag = `h${level}` as const

  return (
    <div
      className={className ? `group/heading relative mt-8 first:mt-0 ${className}` : "group/heading relative mt-8 first:mt-0"}
      data-level={level}
      data-slot="chapter-heading"
    >
      {checkable && section && guideId && chapterSlug ? (
        <SectionCheck
          chapterSlug={chapterSlug}
          guideId={guideId}
          sectionId={section.id}
          title={section.title}
        />
      ) : null}
      {/* Concatenated, not merged: `text-h2` is a custom size and tailwind-merge
          would treat it as a colour and drop it next to `text-foreground`. */}
      <Tag className={`${LEVEL_CLASS[level]} text-balance`} id={anchorId}>
        {children}
      </Tag>
    </div>
  )
}
