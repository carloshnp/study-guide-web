/**
 * Guide (or chapter) progress meter: `done / total`, the rounded percentage, and
 * review counted on its own line.
 *
 * Review units are *not* done (MASTER.md › Progress UI), so the meter value is
 * `done` only; the review count is surfaced as text so colour is never the sole
 * signal. Totals come from `summarizeByChapter` in `@/lib/progress`.
 */

"use client"

import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
} from "@/components/ui/meter"
import { cn } from "@/lib/utils"
import { percentDone, type ProgressCounts } from "@/lib/progress"

export type GuideMeterProps = {
  counts: ProgressCounts
  /** Visible + accessible name, e.g. "Progresso do guia". */
  label?: string
  className?: string
}

export function GuideMeter({ counts, label = "Progresso", className }: GuideMeterProps) {
  const { done, review, total } = counts
  const percent = percentDone(counts)
  // A guide with no units still needs a valid range; value stays 0.
  const max = total > 0 ? total : 1

  return (
    <Meter
      className={cn("gap-2", className)}
      getAriaValueText={() =>
        `${done} de ${total} concluídos${review > 0 ? `, ${review} em revisão` : ""}`
      }
      max={max}
      value={done}
    >
      <div className="flex items-baseline justify-between gap-3">
        <MeterLabel className="text-kicker text-brand uppercase">{label}</MeterLabel>
        <span className="text-meta text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground" data-slot="guide-meter-counts">
            {`${done}/${total}`}
          </span>
          <span className="ms-2">{`${percent}%`}</span>
          {review > 0 ? (
            <span className="ms-2 text-warning" data-slot="guide-meter-review">
              {`· ${review} em revisão`}
            </span>
          ) : null}
        </span>
      </div>
      <MeterTrack className="h-1.5 overflow-hidden rounded-full">
        <MeterIndicator className="rounded-full bg-brand" />
      </MeterTrack>
    </Meter>
  )
}
