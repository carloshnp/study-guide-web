/**
 * Heatmap: one cell per day, intensity from the number of reviews.
 *
 * The grid is decorative for screen readers as a whole (`role="img"` with a
 * summary), while each cell keeps a `title` and a `data-date` for the pointer and
 * for tests; the numbers that matter (active days, total) are in the caption.
 */

"use client"

import { useMemo } from "react"

import { cn } from "@/lib/utils"

import type { StatsDay } from "../api"
import { buildHeatmap, type HeatLevel } from "./heatmap"

const LEVEL_CLASS: Record<HeatLevel, string> = {
  0: "border border-border bg-code",
  1: "bg-brand/20",
  2: "bg-brand/40",
  3: "bg-brand/70",
  4: "bg-brand",
}

export type HeatmapCardProps = {
  daily: readonly StatsDay[]
  weeks?: number
  className?: string
}

export function HeatmapCard({ daily, weeks = 14, className }: HeatmapCardProps) {
  const heatmap = useMemo(() => buildHeatmap(daily, { weeks }), [daily, weeks])
  const first = heatmap.columns[0]?.[0]?.date ?? ""
  const last = heatmap.columns.at(-1)?.[6]?.date ?? ""

  return (
    <section
      aria-labelledby="stats-heatmap"
      className={cn("flex flex-col gap-3 rounded-card border border-border bg-card p-5", className)}
      data-slot="stats-heatmap"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-heading text-h2 text-foreground" id="stats-heatmap">
          Revisões por dia
        </h2>
        <span className="ms-auto text-caption text-faint tabular-nums">
          {heatmap.activeDays} {heatmap.activeDays === 1 ? "dia ativo" : "dias ativos"} ·{" "}
          {heatmap.totalReviews} revisões
        </span>
      </div>

      <p className="text-caption text-faint">
        {first} – {last}
      </p>

      <div className="overflow-x-auto pb-1">
        <div
          aria-label={`Mapa de calor de revisões: ${heatmap.activeDays} dias ativos e ${heatmap.totalReviews} revisões entre ${first} e ${last}`}
          className="grid w-max grid-flow-col grid-rows-7 gap-1"
          role="img"
        >
          {heatmap.columns.flatMap((column) =>
            column.map((cell) => (
              <span
                className={cn(
                  "size-3.5 rounded-sm",
                  cell.isFuture ? "bg-transparent" : LEVEL_CLASS[cell.level],
                )}
                data-date={cell.date}
                data-level={cell.level}
                key={cell.date}
                title={`${cell.date}: ${cell.reviews} ${cell.reviews === 1 ? "revisão" : "revisões"}`}
              />
            )),
          )}
        </div>
      </div>

      <div aria-hidden="true" className="flex items-center gap-1.5 text-caption text-faint">
        <span>menos</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            className={cn("size-3 rounded-sm", LEVEL_CLASS[level as HeatLevel])}
            key={level}
          />
        ))}
        <span>mais</span>
      </div>
    </section>
  )
}
