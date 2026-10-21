import { XIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import type { Subject } from "@/lib/catalog"

type SubjectFilterProps = {
  value: string
  onChange: (value: string) => void
  subjects: Subject[]
  /** Guides still visible; announced in a polite status line. */
  resultCount: number
}

/**
 * Fuzzy subject filter for the covers page. The query is folded (no accents, no
 * case) in `filterGuidesBySubject`; the chips are shortcuts with 44px targets, not
 * a second filter.
 */
export function SubjectFilter({ value, onChange, subjects, resultCount }: SubjectFilterProps) {
  const trimmed = value.trim()

  return (
    <div role="search" className="flex w-full max-w-[var(--measure)] flex-col gap-3">
      <label
        htmlFor="filtro-disciplina"
        className="text-kicker uppercase text-muted-foreground"
      >
        Filtrar por disciplina
      </label>

      <Input
        id="filtro-disciplina"
        type="search"
        size="lg"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="metalurgia, programacao, dsa…"
        aria-describedby="filtro-disciplina-status"
      />

      <div className="flex flex-wrap items-center gap-2">
        {subjects.map((subject) => {
          const selected = trimmed !== "" && subject.title === value
          return (
            <button
              key={subject.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(subject.title)}
              className="min-h-11 rounded-chip border border-border px-3 text-caption font-medium text-muted-foreground transition-colors duration-150 ease-enter hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-brand aria-pressed:bg-accent-soft aria-pressed:text-brand-ink"
            >
              {subject.title}
            </button>
          )
        })}
        {trimmed === "" ? null : (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex min-h-11 items-center gap-1 rounded-chip px-2 text-caption font-medium text-brand transition-colors duration-150 ease-enter hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
            Limpar filtro
          </button>
        )}
      </div>

      <p
        id="filtro-disciplina-status"
        role="status"
        aria-live="polite"
        className="text-meta text-muted-foreground"
      >
        {trimmed === ""
          ? `${resultCount} ${resultCount === 1 ? "guia publicado" : "guias publicados"}`
          : `${resultCount} ${resultCount === 1 ? "guia" : "guias"} para “${trimmed}”`}
      </p>
    </div>
  )
}
