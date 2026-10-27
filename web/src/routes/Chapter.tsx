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

import { ArrowLeftIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"

import { writeLastRead } from "@/features/catalog/last-read"
import { Editor, type EditorSeed } from "@/features/flashcards/editor/Editor"
import { SelectionCardMenu } from "@/features/flashcards/source-create/SelectionCardMenu"
import { ChapterToc } from "@/features/reader/ChapterToc"
import { useLayout } from "@/features/preferences/layout"
import { prepareChapterBody, shiftHeadings } from "@/features/reader/leading-heading"
import { PinnedReader } from "@/features/reader/pinned/PinnedReader"
import { dropPinnedFigures } from "@/features/reader/pinned/drop-pinned-figures"
import { SectionCheck } from "@/features/progress/SectionCheck"
import { useSummaryMode } from "@/features/preferences/summary"
import {
  kindLabel,
  useChapterContent,
  useGuideContent,
  useResumoContent,
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

/**
 * The resumo file opens with its own `# Resumo: …` title, which the page h1
 * already covers. Drop that line and lift the `###` sections one level so they
 * sit where the chapter's own top-level headings sit. Section ids stay the
 * build's, because the text is untouched: the TOC keeps pointing at the same
 * anchors. Kept local to the reader so the shared heading module stays as it was.
 */
function resumoMarkdown(markdown: string): string {
  const lines = markdown.split("\n")
  let cursor = 0
  while (cursor < lines.length && lines[cursor].trim() === "") cursor += 1
  if (cursor >= lines.length) return markdown

  const heading = /^(#{1,6})[ \t]+(.*)$/.exec(lines[cursor].trim())
  if (!heading || heading[1].length !== 1) return markdown

  const rest = lines.slice(cursor + 1)
  while (rest.length > 0 && rest[0].trim() === "") rest.shift()
  return shiftHeadings(rest.join("\n"), -1)
}

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
  const [editorOpen, setEditorOpen] = useState(false)
  const [seed, setSeed] = useState<EditorSeed | undefined>(undefined)
  const [savedCard, setSavedCard] = useState<string | null>(null)

  const data = chapter.data
  const title = data?.title ?? chapterSlug
  const kicker = data ? `Capítulo ${data.number}` : "Capítulo"
  const prepared = useMemo(
    () => (data ? prepareChapterBody(data.markdown, data.title, data.sections) : null),
    [data],
  )
  const sections = prepared?.sections ?? []

  // "Guia resumido": when the reader asked for short versions and this chapter
  // has one, its markdown replaces the full body. The load is only requested
  // once the guide and the chapter are known, and until it succeeds the full
  // chapter stays on screen, so the page never blanks.
  const summary = useSummaryMode()
  const resumoListed = Boolean(data && guide.data?.resumos.includes(data.id))
  const resumo = useResumoContent(guideId, data?.id ?? "", summary.on && resumoListed)
  const preparedResumo = useMemo(
    () =>
      summary.on && resumoListed && resumo.status === "ready" && resumo.data
        ? resumoMarkdown(resumo.data.markdown)
        : null,
    [resumo.data, resumo.status, resumoListed, summary.on],
  )
  const body = preparedResumo ?? prepared?.markdown ?? ""
  const images = preparedResumo && resumo.data ? resumo.data.images : (data?.images ?? [])
  const neighbours = useMemo(
    () => neighboursOf(guide.data, chapterSlug),
    [chapterSlug, guide.data],
  )

  // The "imagem fixa" view is a reading setting; it only applies to a chapter
  // that actually carries pictures pinned to its sections. Any other chapter
  // keeps the continuous text whatever the setting says.
  const layout = useLayout()
  const sectionImages = data?.sectionImages ?? {}
  const pinned = layout.isPinnedView && Object.keys(sectionImages).length > 0
  // The pinned pane already shows each section's picture, so the text drops its
  // inline copy (same alt text) while the view is on. Continuous text is untouched.
  const pinnedAlts = pinned ? Object.values(sectionImages).flat().map((image) => image.alt) : []
  const textBody = pinned ? dropPinnedFigures(body, pinnedAlts) : body

  // Deep link to the exact passage a flashcard was created from: the link
  // carries a snippet fragment (?snippet=...); scroll to the paragraph whose
  // text contains it and give it a temporary highlight.
  const [search] = useSearchParams()
  const snippet = search.get("snippet")

  useEffect(() => {
    if (!data || !snippet) return
    const fragment = snippet.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR")
    if (!fragment) return

    // The markdown renderer is lazy (chunk + Suspense), so the passage may not
    // be in the DOM when this effect first runs. Poll for up to ~5s until a
    // paragraph containing the fragment exists, then scroll and highlight it.
    let timer = 0
    let tries = 0
    let highlightCleanup = 0

    const attempt = () => {
      tries += 1
      const article = document.querySelector("[data-slot='chapter-body'] article")
      const candidates = article
        ? article.querySelectorAll("p, li, td, blockquote, h1, h2, h3, h4")
        : []
      let target: Element | null = null
      if (candidates.length > 0) {
        // Try the full fragment first, then progressively shorter prefixes: the
        // rendered text can differ near math/entities, so a shorter prefix still
        // lands on the right paragraph.
        for (const prefixLength of [fragment.length, 60, 40, 24]) {
          const prefix = fragment.slice(0, prefixLength)
          if (prefix.length === 0) break
          for (const node of candidates) {
            const text =
              node.textContent?.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR") ?? ""
            if (text.includes(prefix)) {
              target = node
              break
            }
          }
          if (target) break
        }
      }
      if (!target) {
        if (tries < 20) timer = window.setTimeout(attempt, 250)
        return
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" })
      const element = target as HTMLElement
      element.style.transition = "background-color 300ms ease, box-shadow 300ms ease"
      element.style.backgroundColor = "var(--accent-soft, color-mix(in srgb, var(--accent) 18%, transparent))"
      element.style.boxShadow = "0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)"
      highlightCleanup = window.setTimeout(() => {
        element.style.backgroundColor = ""
        element.style.boxShadow = ""
      }, 4000)
    }

    timer = window.setTimeout(attempt, 100)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(highlightCleanup)
    }
  }, [data, snippet])

  // Sidebar section links navigate with a `#id` hash (SPA); react-router does
  // not scroll on its own, so drive the scroll here once the target heading is
  // in the DOM (the markdown renderer is lazy, hence the polling).
  useEffect(() => {
    if (!data) return
    const raw = decodeURIComponent(location.hash.slice(1))
    if (!raw) {
      window.scrollTo({ top: 0 })
      return
    }
    let timer = 0
    let tries = 0
    const attempt = () => {
      const el = document.getElementById(raw)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      if (tries < 20) timer = window.setTimeout(attempt, 250)
    }
    timer = window.setTimeout(attempt, 100)
    return () => window.clearTimeout(timer)
  }, [data, location.hash])

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

  const savedNotice = savedCard ? (
    <p
      className="flex max-w-[var(--measure)] flex-wrap items-center gap-2 rounded-card border border-success/40 bg-success/8 px-3 py-2 text-meta text-success"
      data-slot="card-created"
      role="status"
    >
      <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
      {savedCard}
      <button
        className="ms-auto min-h-11 rounded-md px-2 text-meta font-semibold text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() => setSavedCard(null)}
        type="button"
      >
        Fechar
      </button>
    </p>
  ) : null

  const articleBody = (
    <>
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
        <SelectionCardMenu
          chapterSlug={chapterSlug}
          guideId={guideId}
          onRequestCreate={(input) => {
            setSeed({
              chapterSlug: input.chapterSlug,
              front: input.front,
              guideId: input.guideId,
              kind: "basic",
              sectionId: input.sectionId,
              sourceSnippet: input.sourceSnippet,
            })
            setEditorOpen(true)
          }}
          sections={sections}
        >
          <Suspense
            fallback={<p className="text-meta text-muted-foreground">Carregando o texto…</p>}
          >
            <MarkdownRenderer
              chapterSlug={chapterSlug}
              guideId={guideId}
              images={images}
              markdown={textBody}
              sections={sections}
            />
          </Suspense>
        </SelectionCardMenu>
      ) : null}

      <nav
        aria-label="Capítulos vizinhos"
        className="mt-16 grid gap-6 border-t border-border pt-6 sm:grid-cols-2"
      >
        <NeighbourLink chapter={neighbours.previous} direction="previous" guideId={guideId} />
        <NeighbourLink chapter={neighbours.next} direction="next" guideId={guideId} />
      </nav>
    </>
  )

  const cardEditor = (
    <Editor
      onOpenChange={setEditorOpen}
      onSaved={() => setSavedCard("Card criado. Ele entra na fila quando vencer.")}
      open={editorOpen}
      seed={seed}
    />
  )

  if (pinned) {
    return (
      <div data-slot="chapter-root">
        <PinnedReader
          key={chapterSlug}
          header={
            <header className="flex min-w-0 items-center gap-2" data-slot="chapter-header">
              <Link
                aria-label="Voltar ao guia"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-brand hover:bg-accent"
                title="Voltar ao guia"
                to={`/g/${guideId}`}
              >
                <ArrowLeftIcon aria-hidden="true" className="size-5" />
              </Link>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-kicker uppercase text-brand">
                  {data ? `${kicker} · ${kindLabel(data.kind)}` : kicker}
                </p>
                <h1 className="line-clamp-2 font-heading text-h3 text-foreground">{title}</h1>
                {preparedResumo ? (
                  <p className="text-caption font-semibold text-brand" data-slot="summary-label">
                    Guia resumido
                  </p>
                ) : null}
              </div>
            </header>
          }
          notice={savedNotice}
          sectionImages={sectionImages}
          sections={sections}
        >
          <article className="min-w-0">{articleBody}</article>
        </PinnedReader>
        {cardEditor}
      </div>
    )
  }

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

        {preparedResumo ? (
          <p className="w-fit text-caption font-semibold text-brand" data-slot="summary-label">
            Guia resumido
          </p>
        ) : null}

        {data?.part ? <p className="text-meta text-faint">{data.part}</p> : null}

        {data && data.sections.length === 0 ? (
          <div className="relative mt-1 w-fit">
            <SectionCheck chapterSlug={chapterSlug} guideId={guideId} title={data.title} />
          </div>
        ) : null}
      </header>

      {savedNotice}

      <div className="flex flex-col gap-12 xl:flex-row xl:items-start xl:gap-16" data-slot="chapter-body">
        <article className="min-w-0 max-w-[var(--measure)] flex-1">{articleBody}</article>

        <ChapterToc sections={sections} />
      </div>

      {cardEditor}
    </div>
  )
}
