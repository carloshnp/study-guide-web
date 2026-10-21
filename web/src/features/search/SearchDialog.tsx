import { HistoryIcon, SearchIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { useNavigate } from "react-router"

import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { ResultSummary } from "@/features/search/ResultSummary"
import { useSearch, type SearchHit } from "@/features/search/useSearch"
import { cn } from "@/lib/utils"

const optionId = (hit: SearchHit): string => `search-option-${hit.id}`

/**
 * Command palette: `Cmd/Ctrl+K` from anywhere it is mounted, arrow keys to move, `Enter`
 * to open the chapter, `Esc` to close. Results come from the same `useSearch` hook as the
 * `/busca` page, grouped by guide, with accent-insensitive highlights and recent queries
 * read from `localStorage`.
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const {
    query,
    setQuery,
    groups,
    results,
    status,
    isPending,
    recentQueries,
    remember,
    clearRecent,
  } = useSearch()

  const hits = useMemo(() => groups.flatMap((group) => group.hits), [groups])
  const currentIndex = hits.length === 0 ? -1 : Math.min(activeIndex, hits.length - 1)
  const currentHit = currentIndex === -1 ? null : hits[currentIndex]
  const trimmedQuery = query.trim()

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setActiveIndex(0)
  }, [setQuery])

  // One setter for every query change, so the active option always restarts at the top.
  const updateQuery = useCallback(
    (value: string) => {
      setActiveIndex(0)
      setQuery(value)
    },
    [setQuery],
  )

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return
      event.preventDefault()
      setOpen((previous) => !previous)
    }

    window.addEventListener("keydown", onWindowKeyDown)
    return () => window.removeEventListener("keydown", onWindowKeyDown)
  }, [])

  const select = (hit: SearchHit) => {
    remember(query)
    close()
    navigate(`/g/${hit.guideId}/c/${hit.chapterId}`)
  }

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (hits.length > 0) {
        setActiveIndex((index) => (Math.min(index, hits.length - 1) + 1) % hits.length)
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      if (hits.length > 0) {
        setActiveIndex((index) => (Math.max(index, 0) - 1 + hits.length) % hits.length)
      }
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (currentHit) select(currentHit)
    } else if (event.key === "Escape") {
      event.preventDefault()
      close()
    }
  }

  const showRecent = trimmedQuery === "" && recentQueries.length > 0
  const showHint = trimmedQuery === "" && recentQueries.length === 0
  const showShortQuery = trimmedQuery.length === 1
  const showUnavailable = status === "unavailable"
  const showEmpty =
    status === "ready" && results.length === 0 && trimmedQuery.length >= 2 && !isPending
  const showResults = results.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogPopup
        bottomStickOnMobile={false}
        className="max-w-xl gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Busca rápida</DialogTitle>

        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <SearchIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <Input
            aria-activedescendant={currentHit ? optionId(currentHit) : undefined}
            aria-autocomplete="list"
            aria-controls="search-dialog-results"
            aria-expanded={true}
            aria-label="Busca rápida"
            autoFocus
            className="border-transparent bg-transparent shadow-none"
            onChange={(event) => updateQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Buscar capítulos e trechos…"
            ref={inputRef}
            role="combobox"
            size="lg"
            type="search"
            value={query}
          />
          <Kbd className="hidden sm:inline-flex">esc</Kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {showHint ? (
            <p className="px-3 py-6 text-center text-meta text-muted-foreground">
              Digite para buscar nos capítulos publicados. Acentos são opcionais.
            </p>
          ) : null}

          {showShortQuery ? (
            <p className="px-3 py-6 text-center text-meta text-muted-foreground">
              Digite ao menos duas letras.
            </p>
          ) : null}

          {showUnavailable ? (
            <p className="px-3 py-6 text-center text-meta text-muted-foreground">
              O índice de busca ainda não foi publicado.
            </p>
          ) : null}

          {showRecent ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <p className="text-kicker uppercase text-muted-foreground">Buscas recentes</p>
                <button
                  className="rounded-md px-2 py-1 text-meta text-muted-foreground hover:text-foreground"
                  onClick={clearRecent}
                  type="button"
                >
                  Limpar
                </button>
              </div>
              {recentQueries.map((term) => (
                <button
                  className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-start text-body text-foreground hover:bg-accent"
                  key={term}
                  onClick={() => {
                    updateQuery(term)
                    inputRef.current?.focus()
                  }}
                  type="button"
                >
                  <HistoryIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <span className="truncate">{term}</span>
                </button>
              ))}
            </div>
          ) : null}

          {showResults ? (
            <div
              aria-label="Resultados da busca"
              className="flex flex-col gap-1"
              id="search-dialog-results"
              role="listbox"
            >
              {groups.map((group) => (
                <div
                  aria-labelledby={`search-group-${group.guideId}`}
                  className="flex flex-col gap-0.5"
                  key={group.guideId}
                  role="group"
                >
                  <p
                    className="px-3 pb-1 pt-2 text-kicker uppercase text-muted-foreground"
                    id={`search-group-${group.guideId}`}
                  >
                    {group.guideTitle}
                  </p>
                  {group.hits.map((hit) => {
                    const active = hit.id === currentHit?.id
                    return (
                      <div
                        aria-selected={active}
                        className={cn(
                          "flex min-h-11 cursor-pointer flex-col justify-center rounded-lg px-3 py-2",
                          active ? "bg-accent text-accent-foreground" : "text-foreground",
                        )}
                        id={optionId(hit)}
                        key={hit.id}
                        onClick={() => select(hit)}
                        onMouseEnter={() => setActiveIndex(hits.findIndex((item) => item.id === hit.id))}
                        role="option"
                      >
                        <ResultSummary hit={hit} query={query} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : null}

          {showEmpty ? (
            <p className="px-3 py-6 text-center text-meta text-muted-foreground">
              Nenhum resultado para “{trimmedQuery}”. Tente outra palavra.
            </p>
          ) : null}

          {isPending && trimmedQuery !== "" ? (
            <p className="px-3 py-2 text-center text-meta text-muted-foreground">Buscando…</p>
          ) : null}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-meta text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> abrir
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd> fechar
          </span>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
