import { ArrowRightIcon } from "lucide-react"
import { Link } from "react-router"

import { lastReadHref, type LastRead } from "@/features/catalog/last-read"

/**
 * The single "Continuar" entry point. Rendered only when `localStorage` holds a
 * last-read chapter (`MASTER.md` › Home: one primary action per screen).
 */
export function ContinueRow({ entry }: { entry: LastRead }) {
  return (
    <Link
      to={lastReadHref(entry)}
      className="flex min-h-11 items-center gap-3 rounded-card border border-border bg-card px-4 py-3 transition-colors duration-150 ease-enter hover:border-brand/60 hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="text-kicker shrink-0 uppercase text-brand">Continuar</span>
      <span className="min-w-0 truncate text-meta font-semibold text-foreground">
        {entry.guideTitle}
      </span>
      <span className="min-w-0 truncate text-caption text-muted-foreground">{entry.title}</span>
      <ArrowRightIcon aria-hidden="true" className="ms-auto size-4 shrink-0 text-brand" />
    </Link>
  )
}
