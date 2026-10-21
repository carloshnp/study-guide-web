import { LibraryIcon } from "lucide-react"
import { useState } from "react"

import { PageHeader } from "@/components/layout/PageHeader"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { CoversGrid } from "@/features/catalog/CoversGrid"
import { SubjectFilter } from "@/features/catalog/SubjectFilter"
import { filterGuidesBySubject, useCatalogIndex } from "@/lib/catalog"

function HowToAddGuide() {
  return (
    <p className="text-meta text-muted-foreground">
      Para publicar um guia, acrescente-o em{" "}
      <code className="rounded-inline-code bg-code px-1 py-0.5 font-mono text-caption">
        catalog.yaml
      </code>
      , rode{" "}
      <code className="rounded-inline-code bg-code px-1 py-0.5 font-mono text-caption">
        .venv/bin/python -m pipeline.ingest
      </code>{" "}
      e depois{" "}
      <code className="rounded-inline-code bg-code px-1 py-0.5 font-mono text-caption">
        .venv/bin/python -m pipeline.build --all
      </code>
      . O build grava <code className="font-mono">content/index.json</code> e as capas em{" "}
      <code className="font-mono">content/media/covers/</code>.
    </p>
  )
}

function CoversUnavailable({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex max-w-[var(--measure)] flex-col items-start gap-3 rounded-card border border-border bg-card p-6">
      <h2 className="font-heading text-h3 text-foreground">Estantes indisponíveis</h2>
      <p className="text-meta text-muted-foreground">{message}</p>
      <HowToAddGuide />
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

function CoversEmpty() {
  return (
    <Empty className="max-w-[var(--measure)] rounded-card border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LibraryIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Nenhum guia publicado</EmptyTitle>
        <EmptyDescription>
          <span className="block text-start">
            <HowToAddGuide />
          </span>
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

/**
 * `/estantes`: a 16:9 cover per guide (or its typographic placeholder) in a grid
 * grouped by subject, with an accent-insensitive fuzzy subject filter. Zero results
 * explains how a guide gets published instead of showing an empty grid.
 */
export function Covers() {
  const { status, index, error, reload } = useCatalogIndex()
  const [query, setQuery] = useState("")
  const groups = index ? filterGuidesBySubject(index, query) : []
  const resultCount = groups.reduce((total, group) => total + group.guides.length, 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="Estantes"
        title="Estantes"
        description="Todos os guias publicados, agrupados por disciplina. Filtre sem acentos."
      />

      {status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando estantes…</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((card) => (
              <div key={card} className="aspect-[16/10] animate-pulse rounded-card bg-code" />
            ))}
          </div>
        </div>
      ) : null}

      {status === "error" ? <CoversUnavailable message={error} onRetry={reload} /> : null}
      {status === "empty" ? <CoversEmpty /> : null}

      {status === "ready" && index ? (
        <>
          <SubjectFilter
            value={query}
            onChange={setQuery}
            subjects={index.subjects}
            resultCount={resultCount}
          />

          {resultCount === 0 ? (
            <div className="flex max-w-[var(--measure)] flex-col gap-3 rounded-card border border-border bg-card p-6">
              <h2 className="font-heading text-h3 text-foreground">
                {`Nenhuma disciplina corresponde a “${query.trim()}”`}
              </h2>
              <p className="text-meta text-muted-foreground">
                Tente sem acentos, com parte do nome ou apenas as primeiras letras.
              </p>
              <HowToAddGuide />
            </div>
          ) : (
            <CoversGrid groups={groups} />
          )}
        </>
      ) : null}
    </div>
  )
}
