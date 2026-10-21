/**
 * In-page table of contents for a chapter: the section list, at 1280px and up.
 *
 * The right rail only earns its 220px when there is room for it (MASTER.md ›
 * Chapter), so the component reads the `xl` breakpoint instead of leaving a
 * hidden landmark in the accessibility tree on a phone. Section levels are kept
 * in `data-level` so an h4 reads as a sub-item without a second list nesting.
 */

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { ChapterSection } from "@/lib/content"

const INDENT: Record<number, string> = {
  2: "ps-0",
  3: "ps-3",
  4: "ps-6",
}

export type ChapterTocProps = {
  sections: readonly ChapterSection[]
  className?: string
}

export function ChapterToc({ sections, className }: ChapterTocProps) {
  const wide = useMediaQuery("xl")

  if (!wide || sections.length === 0) return null

  return (
    <nav
      aria-label="Neste capítulo"
      className={cn(
        "sticky top-[calc(var(--bar-h)+24px)] flex max-h-[calc(100dvh-var(--bar-h)-48px)] w-[220px] shrink-0 flex-col gap-2 overflow-y-auto",
        className,
      )}
      data-slot="chapter-toc"
    >
      <p className="text-kicker uppercase text-muted-foreground">Neste capítulo</p>
      <ol className="flex flex-col gap-0.5">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              className={`flex min-h-8 items-start rounded-md py-1 text-meta text-muted-foreground hover:text-brand ${
                INDENT[section.level] ?? "ps-0"
              }`}
              data-level={section.level}
              href={`#${section.id}`}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
