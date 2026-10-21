/**
 * Chapter route: `/g/:guideId/c/:chapterSlug`.
 *
 * Renders exactly one chapter — its own JSON only (SPEC.md › Success criteria 2)
 * — as: a back link to the guide, the chapter number as kicker, the single h1,
 * the reading column and, from 1280px up, the in-page table of contents. The
 * previous/next footer takes its titles from `guide.json`, so the reader never
 * has to guess what comes next.
 *
 * The body's own leading heading is dropped or demoted before rendering
 * (`normalizeLeadingHeading`), because the page already carries that title as its
 * h1 and the design system forbids two h1s or a skipped level.
 *
 * A missing chapter states that plainly, keeps the URL's slug visible and invents
 * no prose.
 */

import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { lazy, Suspense, useEffect, useMemo } from "react"
import { Link, useParams } from "react-router"

import { writeLastRead } from "@/features/catalog/last-read"
import { ChapterToc } from "@/features/reader/ChapterToc"
import { prepareChapterBody } from "@/features/reader/leading-heading"
import { SectionCheck } from "@/features/progress/SectionCheck"
import {
  kindLabel,
  useChapterContent,
  useGuideContent,
  type ChapterSummary,
  type GuideJson,
} from "@/lib/content"
import { cn } from "@/lib/utils"

type Neighbours = {
  previous: ChapterSummary | null
  next: ChapterSummary | null
}

/**
 * The markdown stack (react-markdown + KaTeX + highlight.js) is the heaviest
 * dependency in the app and only the reader needs it, so it loads as its own
 * chunk instead of blocking the catalog (`bundle-splitting`).
 */
const MarkdownRenderer = lazy(async () => {
  const module = await import("@/features/reader/MarkdownRenderer")
  return { default: module.MarkdownRenderer }
})

function neighboursOf(guide: GuideJson | null, chapterSlug: string): Neighbours {
  if (!guide) return { next: null, previous: null }
  const index = guide.chapters.findIndex(
    (chapter) => chapter.slug === chapterSlug || chapter.id === chapterSlug,
  )
  if (index === -1) return { next: null, previous: null }
  return {
    next: guide.chapters[index + 1] ?? null,
    previous: guide.chapters[index - 1] ?? null,
  }
}

function NeighbourLink({
  chapter,
  direction,
  guideId,
}: {
  chapter: ChapterSummary | null
  direction: "previous" | "next"
  guideId: string
}) {
  const isNext = direction === "next"

  return (
    <div className={cn("flex flex-col gap-1", isNext && "sm:items-end sm:text-end")}>
      <p className="text-kicker uppercase text-muted-foreground">
        {isNext ? "Próximo" : "Anterior"}
      </p>
      {chapter ? (
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-body font-semibold text-brand underline-offset-4 hover:underline"
          rel={isNext ? "next" : "prev"}
          to={`/g/${guideId}/c/${chapter.slug}`}
        >
          {isNext ? null : <ChevronLeftIcon aria-hidden="true" className="size-4 shrink-0" />}
          <span>{chapter.title}</span>
          {isNext ? <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0" /> : null}
        </Link>
      ) : (
        <span className="text-meta text-faint">{isNext ? "Fim do guia" : "Início do guia"}</span>
      )}
    </div>
  )
}

export function Chapter() {
  const { guideId = "", chapterSlug = "" } = useParams()
  const chapter = useChapterContent(guideId, chapterSlug)
  const guide = useGuideContent(guideId)

  const data = chapter.data
  const title = data?.title ?? chapterSlug
  const kicker = data ? `Capítulo ${data.number}` : "Capítulo"
  const prepared = useMemo(
    () => (data ? prepareChapterBody(data.markdown, data.title, data.sections) : null),
    [data],
  )
  const body = prepared?.markdown ?? ""
  const sections = prepared?.sections ?? []
  const neighbours = useMemo(
    () => neighboursOf(guide.data, chapterSlug),
    [chapterSlug, guide.data],
  )

  // Records what this device is reading, so home can offer one "Continuar" row.
  useEffect(() => {
    if (!data) return
    writeLastRead({
      guideId,
      chapterSlug: data.slug,
      guideTitle: guide.data?.title ?? guideId,
      title: data.title,
    })
  }, [chapterSlug, data, guide.data?.title, guideId])

  return (
    <div className="flex flex-col gap-6" data-slot="chapter-root">
      <header className="flex max-w-[var(--measure)] flex-col gap-3" data-slot="chapter-header">
        <Link
          className="inline-flex min-h-11 w-fit items-center gap-1.5 text-meta font-semibold text-brand underline-offset-4 hover:underline"
          to={`/g/${guideId}`}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Voltar ao guia
        </Link>

        <p className="text-kicker uppercase text-brand">
          {data ? `${kicker} · ${kindLabel(data.kind)}` : kicker}
        </p>

        <h1 className="font-heading text-chapter text-foreground sm:text-page">{title}</h1>

        {data?.part ? <p className="text-meta text-faint">{data.part}</p> : null}

        {data && data.sections.length === 0 ? (
          <div className="relative mt-1 w-fit">
            <SectionCheck chapterSlug={chapterSlug} guideId={guideId} title={data.title} />
          </div>
        ) : null}
      </header>

      <div className="flex flex-col gap-12 xl:flex-row xl:items-start xl:gap-16" data-slot="chapter-body">
        <article className="min-w-0 max-w-[var(--measure)] flex-1">
          {chapter.status === "loading" ? (
            <div aria-busy="true" data-slot="chapter-loading">
              <span className="sr-only">Carregando capítulo…</span>
              <div aria-hidden="true" className="flex flex-col gap-3">
                <div className="h-4 w-3/4 rounded bg-code" />
                <div className="h-4 w-full rounded bg-code" />
                <div className="h-4 w-5/6 rounded bg-code" />
                <div className="h-4 w-2/3 rounded bg-code" />
              </div>
            </div>
          ) : null}

          {chapter.status === "error" ? (
            <div
              className="rounded-card border border-border bg-card p-6"
              data-slot="chapter-error"
              role="status"
            >
              <p className="text-body font-semibold text-foreground">Capítulo não encontrado.</p>
              <p className="mt-1 text-meta text-muted-foreground">
                O conteúdo pode não ter sido publicado ainda. Confira o endereço ou volte ao guia.
              </p>
              <p className="mt-3 text-caption text-faint">{chapter.error}</p>
            </div>
          ) : null}

          {data ? (
            <Suspense
              fallback={<p className="text-meta text-muted-foreground">Carregando o texto…</p>}
            >
              <MarkdownRenderer
                chapterSlug={chapterSlug}
                guideId={guideId}
                images={data.images}
                markdown={body}
                sections={sections}
              />
            </Suspense>
          ) : null}

          <nav
            aria-label="Capítulos vizinhos"
            className="mt-16 grid gap-6 border-t border-border pt-6 sm:grid-cols-2"
          >
            <NeighbourLink chapter={neighbours.previous} direction="previous" guideId={guideId} />
            <NeighbourLink chapter={neighbours.next} direction="next" guideId={guideId} />
          </nav>
        </article>

        <ChapterToc sections={sections} />
      </div>
    </div>
  )
}
