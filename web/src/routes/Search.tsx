import type { FormEvent } from "react"
import { SearchIcon } from "lucide-react"
import { Link } from "react-router"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { ResultSummary } from "@/features/search/ResultSummary"
import { SearchDialog } from "@/features/search/SearchDialog"
import { useSearch } from "@/features/search/useSearch"

function statusMessage({
  isPending,
  results,
  status,
  query,
}: {
  isPending: boolean
  results: number
  status: "loading" | "ready" | "unavailable"
  query: string
}): string {
  if (status === "unavailable") {
    return "O índice de busca ainda não foi publicado. Rode o build do conteúdo e recarregue a página."
  }
  if (query === "") return ""
  if (query.length === 1) return "Digite ao menos duas letras."
  if (isPending) return "Buscando…"
  if (results === 0) {
    return `Nenhum resultado para “${query}”. Tente sem acentos ou com menos palavras.`
  }
  return `${results} ${results === 1 ? "resultado" : "resultados"} para “${query}”.`
}

/**
 * `/busca`: the same index and hook as the command palette, laid out as a page so results
 * can be scanned, linked and kept in history. Recent queries come from `localStorage`.
 */
export function Search() {
  const { query, setQuery, results, groups, status, isPending, recentQueries, remember, clearRecent } =
    useSearch()
  const trimmed = query.trim()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    remember(trimmed)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        description="Procure por capítulo ou trecho. Acentos são opcionais."
        kicker="Busca"
        title="Busca"
      />

      <form
        className="flex w-full max-w-[var(--measure)] flex-col gap-3"
        onSubmit={onSubmit}
        role="search"
      >
        <div className="flex items-center gap-2">
          <SearchIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <Input
            aria-label="Buscar no conteúdo"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="magnesio, solucao solida, niobio…"
            size="lg"
            type="search"
            value={query}
          />
        </div>

        <p className="flex items-center gap-2 text-meta text-muted-foreground">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          abre a busca rápida de qualquer página
        </p>
      </form>

      {recentQueries.length > 0 ? (
        <div className="flex max-w-[var(--measure)] flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-kicker uppercase text-muted-foreground">Buscas recentes</p>
            <button
              className="rounded-md px-2 py-1 text-meta text-muted-foreground hover:text-foreground"
              onClick={clearRecent}
              type="button"
            >
              Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentQueries.map((term) => (
              <Button
                key={term}
                onClick={() => setQuery(term)}
                size="xs"
                type="button"
                variant="outline"
              >
                {term}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <p
        aria-live="polite"
        className="max-w-[var(--measure)] text-meta text-muted-foreground"
        role="status"
      >
        {statusMessage({ isPending, results: results.length, status, query: trimmed })}
      </p>

      {trimmed === "" && status === "ready" ? (
        <p className="max-w-[var(--measure)] text-body text-muted-foreground">
          Digite uma palavra para buscar nos capítulos publicados. O índice ignora acentos e
          ranqueia acertos no título acima dos acertos no corpo do texto.
        </p>
      ) : null}

      <div className="flex max-w-[var(--measure)] flex-col gap-8">
        {groups.map((group) => (
          <section
            aria-labelledby={`search-group-${group.guideId}`}
            className="flex flex-col gap-2"
            key={group.guideId}
          >
            <h2
              className="text-kicker uppercase text-muted-foreground"
              id={`search-group-${group.guideId}`}
            >
              {group.guideTitle}
            </h2>
            <ul className="flex flex-col gap-1">
              {group.hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    className="flex flex-col gap-0.5 rounded-lg border border-transparent px-3 py-2 transition-colors duration-150 ease-enter hover:border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => remember(trimmed)}
                    to={`/g/${hit.guideId}/c/${hit.chapterId}`}
                  >
                    <ResultSummary hit={hit} query={query} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* T28 mounts the palette from this route because only these files are owned here.
          Render <SearchDialog /> once in Shell to make Cmd/Ctrl+K global, then drop this. */}
      <SearchDialog />
    </div>
  )
}
