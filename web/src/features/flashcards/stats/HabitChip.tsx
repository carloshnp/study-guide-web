/**
 * Habit strip: streak, available freezes and active days.
 *
 * Framed as a regularity tool, never as a promise: a missed day spends a freeze
 * and nothing punishes the user (spec › Habit). The chip states plainly whether
 * a freeze is available, so a break is never a surprise.
 */

"use client"

import { FlameIcon, ShieldCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Habits } from "../api"

export type HabitChipProps = {
  habits: Habits
  className?: string
}

export function HabitChip({ habits, className }: HabitChipProps) {
  const frozen = habits.freezes > 0

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-4 py-3",
        className,
      )}
      data-slot="habit-chip"
    >
      <span
        aria-label={`Sequência de ${habits.streak} ${habits.streak === 1 ? "dia" : "dias"}`}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-chip border border-brand/30 bg-accent-soft px-2.5 text-meta font-semibold text-brand-ink"
      >
        <FlameIcon aria-hidden="true" className="size-4" />
        {habits.streak} {habits.streak === 1 ? "dia" : "dias"}
      </span>

      <span className="inline-flex items-center gap-1.5 text-meta text-muted-foreground">
        <ShieldCheckIcon
          aria-hidden="true"
          className={cn("size-4 shrink-0", frozen ? "text-success" : "text-faint")}
        />
        {frozen
          ? `${habits.freezes} ${habits.freezes === 1 ? "congelamento disponível" : "congelamentos disponíveis"}`
          : "Sem congelamentos — um dia perdido zera a sequência"}
      </span>

      <span className="ms-auto text-caption text-faint tabular-nums">
        {habits.activeDays} {habits.activeDays === 1 ? "dia ativo" : "dias ativos"}
      </span>
    </div>
  )
}
