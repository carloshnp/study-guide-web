import { BookOpenIcon, LibraryIcon } from "lucide-react"
import { Link } from "react-router"

import { PageHeader } from "@/components/layout/PageHeader"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ContinueRow } from "@/features/catalog/ContinueRow"
import { GuideList } from "@/features/catalog/GuideList"
import { useLastRead } from "@/features/catalog/last-read"
import { useCatalogGuides } from "@/lib/catalog"

function CatalogUnavailable({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex max-w-[var(--measure)] flex-col items-start gap-3 rounded-card border border-border bg-card p-6">
      <h2 className="font-heading text-h3 text-foreground">Catálogo indisponível</h2>
      <p className="text-meta text-muted-foreground">{message}</p>
      <p className="text-caption text-faint">
        O conteúdo é gerado fora da aplicação. Rode{" "}
        <code className="rounded-inline-code bg-code px-1 py-0.5 font-mono text-caption">
          .venv/bin/python -m pipeline.build --all
        </code>{" "}
        e tente de novo.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-lg border border-border px-4 text-meta font-semibold text-foreground transition-colors duration-150 ease-enter hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Tentar de novo
      </button>
    </div>
  )
}

function CatalogEmpty() {
  return (
    <Empty className="max-w-[var(--measure)] rounded-card border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LibraryIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Nenhum guia publicado ainda</EmptyTitle>
        <EmptyDescription>
          O catálogo lê <code className="font-mono">content/index.json</code>. Acrescente o guia em{" "}
          <code className="font-mono">catalog.yaml</code>, rode o ingest e o build do conteúdo, e
          ele aparece aqui.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

/**
 * `/`: subject groups with one dense row per guide (title, type chip, chapter count,
 * meter) and a single "Continuar" row when this device has a last-read chapter.
 * Loading, empty and unavailable states are explicit so a missing build never looks
 * like an empty catalog.
 */
export function Home() {
  const { status, index, guides, error, reload } = useCatalogGuides()
  const lastRead = useLastRead()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="Estudos"
        title="Guias de estudo"
        description="Todos os guias publicados, agrupados por disciplina e divididos em capítulos legíveis no telefone."
      />

      {status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando guias…</span>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-16 animate-pulse rounded-lg bg-code" />
          ))}
        </div>
      ) : null}

      {status === "error" ? <CatalogUnavailable message={error} onRetry={reload} /> : null}
      {status === "empty" ? <CatalogEmpty /> : null}

      {status === "ready" && index ? (
        <>
          {lastRead ? <ContinueRow entry={lastRead} /> : null}
          <GuideList index={index} guides={guides} />
          <Link
            to="/estantes"
            className="flex min-h-11 w-fit items-center gap-2 rounded-lg px-1 text-meta font-semibold text-brand underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <BookOpenIcon aria-hidden="true" className="size-4" />
            Ver as capas
          </Link>
        </>
      ) : null}
    </div>
  )
}
