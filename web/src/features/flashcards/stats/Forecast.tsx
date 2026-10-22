/**
 * Load forecast: one bar per day for the next two weeks.
 *
 * Heights are relative to the busiest day in the window, so an empty week stays
 * flat instead of dividing by zero; each bar carries its date and count in a
 * `title` and the chart is summarised in a single accessible label. Bars and
 * day labels are two rows of the same flex grid, so a full-height bar can never
 * push its label out of the card.
 */

"use client"

import { cn } from "@/lib/utils"

import type { ForecastDay } from "../api"

export type ForecastBarsProps = {
  forecast: readonly ForecastDay[]
  className?: string
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]

function weekday(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!match) return ""
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return WEEKDAYS[parsed.getDay()] ?? ""
}

function dayOfMonth(date: string): string {
  return date.slice(8, 10)
}

export function ForecastBars({ forecast, className }: ForecastBarsProps) {
  const max = forecast.reduce((value, day) => Math.max(value, day.count), 0)
  const total = forecast.reduce((sum, day) => sum + day.count, 0)

  return (
    <section
      aria-labelledby="stats-forecast"
      className={cn("flex flex-col gap-3 rounded-card border border-border bg-card p-5", className)}
      data-slot="stats-forecast"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-heading text-h2 text-foreground" id="stats-forecast">
          Carga prevista
        </h2>
        <span className="ms-auto text-caption text-faint tabular-nums">
          {total} {total === 1 ? "revisão" : "revisões"} em {forecast.length} dias
        </span>
      </div>

      {forecast.length === 0 ? (
        <p className="text-meta text-muted-foreground">
          Sem previsão ainda: avalie alguns cards para o modelo projetar a carga.
        </p>
      ) : (
        <div
          aria-label={`Previsão de carga: ${total} revisões nos próximos ${forecast.length} dias`}
          className="flex flex-col gap-1"
          role="img"
        >
          <div className="flex h-28 items-end gap-1">
            {forecast.map((day) => (
              <div className="flex h-full min-w-0 flex-1 items-end" key={day.date}>
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-colors duration-150 ease-enter",
                    day.count === 0 ? "bg-code" : "bg-brand/70",
                  )}
                  data-count={day.count}
                  data-date={day.date}
                  style={{
                    height: day.count === 0 ? "2px" : `${Math.max(8, (day.count / max) * 100)}%`,
                  }}
                  title={`${day.date}: ${day.count} ${day.count === 1 ? "card" : "cards"}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {forecast.map((day, index) => (
              <span
                className="min-w-0 flex-1 text-center text-caption text-faint tabular-nums"
                key={day.date}
              >
                {index % 2 === 0 ? dayOfMonth(day.date) : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {forecast.length > 0 ? (
        <p className="text-caption text-faint">
          Maior dia: {max} {max === 1 ? "card" : "cards"} · {weekday(forecast[0]?.date ?? "")} a{" "}
          {weekday(forecast.at(-1)?.date ?? "")}
        </p>
      ) : null}
    </section>
  )
}
