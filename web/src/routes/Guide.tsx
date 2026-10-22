/**
 * Guide cover: `/g/:guideId`.
 *
 * Title, source metadata (discipline, professor, when it was generated, how many
 * files it came from), the guide-wide meter, the cover markdown the build moved
 * out of the chapters (the manual `Índice`, `Conventions`, `How to use this
 * guide`), and the chapter list with a kind label and its own `done/total` per
 * chapter.
 *
 * The cover markdown is normalised like a chapter body, so its own `#` heading
 * becomes an h2 below the page h1 instead of a second h1.
 */

import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react"
import { lazy, Suspense, useMemo } from "react"
import { Link, useParams } from "react-router"

import { normalizeLeadingHeading } from "@/features/reader/leading-heading"
import { GuideMeter } from "@/features/progress/GuideMeter"
import { useProgress } from "@/features/progress/useProgress"
import { guideTrail, useCatalogIndex } from "@/lib/catalog"
import { chapterUnitIds, guideUnitIds, kindLabel, useGuideContent } from "@/lib/content"

/** Same split as the chapter route: the markdown stack is its own chunk. */
const MarkdownRenderer = lazy(async () => {
  const module = await import("@/features/reader/MarkdownRenderer")
  return { default: module.MarkdownRenderer }
})

/**
 * Breadcrumb from the catalog: `Estantes › Metalurgia › Não-Ferrosos`. The subject
 * and the folder have no page of their own, so they are text; only Estantes links
 * back, and it renders even for a guide the catalog does not know, so the error
 * state keeps a way out. The crumbs appear once the index resolves.
 */
function GuideTrail({ guideId }: { guideId: string }) {
  const { index } = useCatalogIndex()
  const trail = index ? guideTrail(index, guideId) : null

  return (
    <nav aria-label="Trilha" className="flex min-h-11 flex-wrap items-center gap-1.5 text-meta">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-1.5 font-semibold text-brand underline-offset-4 hover:underline"
        to="/estantes"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Estantes
      </Link>
      {trail ? (
        <>
          <ChevronRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-faint" />
          <span className="text-muted-foreground">{trail.subject.title}</span>
          {trail.group ? (
            <>
              <ChevronRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-faint" />
              <span className="text-muted-foreground">{trail.group.title}</span>
            </>
          ) : null}
        </>
      ) : null}
    </nav>
  )
}

export function Guide() {
  const { guideId = "" } = useParams()
  const guide = useGuideContent(guideId)
  const progress = useProgress(guideId)

  const data = guide.data
  const title = data?.title ?? guideId
  const cover = useMemo(
    () => (data ? normalizeLeadingHeading(data.cover.markdown, data.title) : ""),
    [data],
  )
  const totals = useMemo(() => (data ? guideUnitIds(guideId, data) : []), [data, guideId])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-[var(--measure)] flex-col gap-3">
        <GuideTrail guideId={guideId} />

        <p className="text-kicker uppercase text-brand">{data ? kindLabel(data.type) : "Guia"}</p>

        <h1 className="font-heading text-page text-foreground">{title}</h1>

        {data ? (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-meta text-muted-foreground">
            {data.meta.discipline ? (
              <div className="flex gap-1.5">
                <dt className="text-faint">Disciplina</dt>
                <dd>{data.meta.discipline}</dd>
              </div>
            ) : null}
            {data.meta.professor ? (
              <div className="flex gap-1.5">
                <dt className="text-faint">Professor</dt>
                <dd>{data.meta.professor}</dd>
              </div>
            ) : null}
            {data.meta.generated ? (
              <div className="flex gap-1.5">
                <dt className="text-faint">Gerado em</dt>
                <dd className="tabular-nums">{data.meta.generated}</dd>
              </div>
            ) : null}
            {data.meta.sources.length > 0 ? (
              <div className="flex gap-1.5">
                <dt className="text-faint">Fontes</dt>
                <dd className="tabular-nums">{data.meta.sources.length}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {data ? (
          <GuideMeter
            className="mt-1"
            counts={progress.counts(totals)}
            label="Progresso do guia"
          />
        ) : null}
      </header>

      {guide.status === "loading" ? (
        <div aria-busy="true" data-slot="guide-loading">
          <span className="sr-only">Carregando guia…</span>
          <div aria-hidden="true" className="flex flex-col gap-3">
            <div className="h-4 w-2/3 rounded bg-code" />
            <div className="h-4 w-full rounded bg-code" />
            <div className="h-4 w-4/5 rounded bg-code" />
          </div>
        </div>
      ) : null}

      {guide.status === "error" ? (
        <div
          className="max-w-[var(--measure)] rounded-card border border-border bg-card p-6"
          data-slot="guide-error"
          role="status"
        >
          <p className="text-body font-semibold text-foreground">Guia não encontrado.</p>
          <p className="mt-1 text-meta text-muted-foreground">
            Nenhum guia publicado com este identificador. Volte às estantes para ver o catálogo.
          </p>
          <p className="mt-3 text-caption text-faint">{guide.error}</p>
        </div>
      ) : null}

      {data && cover.trim() !== "" ? (
        <section aria-label="Sobre este guia" data-slot="guide-cover">
          <Suspense fallback={<p className="text-meta text-muted-foreground">Carregando o índice…</p>}>
            <MarkdownRenderer markdown={cover} />
          </Suspense>
        </section>
      ) : null}

      {data ? (
        <section className="flex max-w-[var(--measure)] flex-col gap-3">
          <h2 className="font-heading text-h2 text-foreground">Capítulos</h2>
          <ol
            aria-label="Capítulos do guia"
            className="flex flex-col divide-y divide-border border-y border-border"
            data-slot="chapter-list"
          >
            {data.chapters.map((chapter) => {
              const counts = progress.counts(chapterUnitIds(guideId, chapter))
              return (
                <li
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  key={chapter.id}
                >
                  <Link
                    className="flex min-h-11 min-w-0 flex-col gap-0.5 rounded-md hover:text-brand"
                    to={`/g/${guideId}/c/${chapter.slug}`}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="text-caption tabular-nums text-faint">
                        {String(chapter.number).padStart(2, "0")}
                      </span>
                      <span className="text-body font-medium text-foreground">
                        {chapter.title}
                      </span>
                    </span>
                    {chapter.part ? (
                      <span className="text-caption text-faint">{chapter.part}</span>
                    ) : null}
                  </Link>

                  <span className="flex shrink-0 items-center gap-3 self-start ps-7 sm:self-auto sm:ps-0">
                    <span className="rounded-chip border border-border px-2 py-0.5 text-kicker uppercase text-muted-foreground">
                      {kindLabel(chapter.kind)}
                    </span>
                    <span
                      aria-label={`Progresso de ${chapter.title}`}
                      className="min-w-9 text-meta tabular-nums text-muted-foreground"
                    >
                      {`${counts.done}/${counts.total}`}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}
    </div>
  )
}
