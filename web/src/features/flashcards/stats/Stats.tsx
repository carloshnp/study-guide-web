/**
 * `/flashcards/stats` — heatmap, load forecast, true retention and the habit
 * tools (streak with freeze, daily goal, browser reminder).
 *
 * Reads three endpoints together because they describe the same day: `/stats`
 * for activity, `/habits` for the streak and `/settings` for the goal. Nothing
 * here claims efficacy: the numbers are the user's own history, and retention is
 * described as recall on mature cards.
 */

"use client"

import { ArrowLeftIcon, BellIcon, TargetIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { errorMessage } from "@/lib/api"

import {
  flashcardsApi,
  type FlashcardSettings,
  type Habits,
  type Stats as StatsPayload,
} from "../api"
import { decksHref } from "../links"
import { useResource } from "../useResource"
import { ForecastBars } from "./Forecast"
import { HabitChip } from "./HabitChip"
import { HeatmapCard } from "./Heatmap"
import { addDays, isoDate } from "./heatmap"

const REMINDER_KEY = "flashcards:reminder"

function retentionLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return "—"
  const percent = value <= 1 ? value * 100 : value
  return `${percent.toFixed(0)}%`
}

type NotificationState = NotificationPermission | "unsupported"

function readNotificationState(): NotificationState {
  if (typeof Notification === "undefined") return "unsupported"
  return Notification.permission
}

function readReminder(): boolean {
  try {
    return window.localStorage.getItem(REMINDER_KEY) === "1"
  } catch {
    return false
  }
}

function writeReminder(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(REMINDER_KEY, "1")
    else window.localStorage.removeItem(REMINDER_KEY)
  } catch {
    // Private mode: the toggle still works for this session.
  }
}

function ReminderToggle() {
  const [permission, setPermission] = useState<NotificationState>(() => readNotificationState())
  const [enabled, setEnabled] = useState(() => readReminder())

  useEffect(() => {
    setEnabled(readReminder())
  }, [])

  const enable = async () => {
    if (typeof Notification === "undefined") return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== "granted") return
    writeReminder(true)
    setEnabled(true)
    try {
      new Notification("Lembretes ativados", {
        body: "Um lembrete por dia, enquanto o site estiver aberto. Nada de e-mail.",
      })
    } catch {
      // Some browsers only allow notifications from a service worker; the
      // preference is stored either way.
    }
  }

  const disable = () => {
    writeReminder(false)
    setEnabled(false)
  }

  const blocked = permission === "denied" || permission === "unsupported"

  return (
    <div className="flex flex-col gap-1">
      <label
        className="flex min-h-11 items-center gap-2 text-meta text-foreground"
        htmlFor="reminder-toggle"
      >
        <Switch
          checked={enabled && permission === "granted"}
          disabled={blocked}
          id="reminder-toggle"
          onCheckedChange={(checked) => {
            if (checked) void enable()
            else disable()
          }}
        />
        <BellIcon aria-hidden="true" className="size-4 shrink-0 text-faint" />
        Lembrete diário no navegador
      </label>
      <p className="text-caption text-faint">
        {permission === "denied"
          ? "Notificações bloqueadas para este site; libere nas permissões do navegador para ativar."
          : permission === "unsupported"
            ? "Este navegador não oferece notificações; o lembrete fica de fora."
            : "Só com o site aberto — não há push nem e-mail."}
      </p>
    </div>
  )
}

type GoalCardProps = {
  settings: FlashcardSettings
  onSaved: (settings: FlashcardSettings) => void
}

function GoalCard({ settings, onSaved }: GoalCardProps) {
  const [goal, setGoal] = useState(settings.dailyNewLimit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setGoal(settings.dailyNewLimit)
  }, [settings.dailyNewLimit])

  const changed = goal !== settings.dailyNewLimit

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const next = await flashcardsApi.updateSettings({ dailyNewLimit: goal })
      onSaved(next)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      aria-labelledby="stats-goal"
      className="flex flex-col gap-3 rounded-card border border-border bg-card p-5"
      data-slot="stats-goal"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="flex items-center gap-2 font-heading text-h2 text-foreground" id="stats-goal">
          <TargetIcon aria-hidden="true" className="size-4 text-faint" />
          Meta diária
        </h2>
        <span className="ms-auto text-caption text-faint tabular-nums">
          {goal} {goal === 1 ? "card novo" : "cards novos"}
        </span>
      </div>

      <Slider
        aria-label="Meta diária de cards novos"
        getAriaLabel={() => "Meta diária de cards novos"}
        max={50}
        min={1}
        onValueChange={(value) => setGoal(Array.isArray(value) ? (value[0] ?? goal) : value)}
        value={goal}
      />

      <div className="flex flex-wrap items-center gap-3 text-caption text-faint">
        <span>Teto de revisões por dia: {settings.reviewCap}</span>
        <span>Piso do dia: {settings.floor}</span>
      </div>

      {error ? (
        <p className="text-meta text-warning" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        className="w-fit"
        disabled={!changed || saving}
        onClick={() => void save()}
        size="sm"
        variant="outline"
      >
        {saving ? "Salvando…" : "Salvar meta"}
      </Button>
    </section>
  )
}

type StatsData = {
  stats: StatsPayload
  habits: Habits
  settings: FlashcardSettings
}

export function Stats() {
  const resource = useResource<StatsData>("stats", async () => {
    const to = isoDate(new Date())
    const from = isoDate(addDays(new Date(), -118))
    const [stats, habits, settings] = await Promise.all([
      flashcardsApi.getStats({ from, to }),
      flashcardsApi.getHabits(),
      flashcardsApi.getSettings(),
    ])
    return { habits, settings, stats }
  })

  const data = resource.data

  return (
    <div className="flex flex-col gap-8" data-slot="flashcards-stats">
      <div className="flex flex-col gap-3">
        <Link
          className="inline-flex min-h-11 w-fit items-center gap-1.5 text-meta font-semibold text-brand underline-offset-4 hover:underline"
          to={decksHref()}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Decks
        </Link>

        <PageHeader
          description="Seu histórico de revisões, a carga dos próximos 14 dias e a recordação nos cards maduros. Regularidade vale mais que volume."
          kicker="Flashcards"
          title="Estatísticas"
        />
      </div>

      {resource.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3" data-slot="stats-loading">
          <span className="sr-only">Carregando estatísticas…</span>
          <div aria-hidden="true" className="flex flex-col gap-2">
            <div className="h-16 w-full rounded-card bg-code" />
            <div className="h-40 w-full rounded-card bg-code" />
          </div>
        </div>
      ) : null}

      {resource.status === "error" ? (
        <div
          className="flex max-w-[var(--measure)] flex-col gap-2 rounded-card border border-border bg-card p-6"
          data-slot="stats-error"
          role="status"
        >
          <p className="text-body font-semibold text-foreground">
            Não foi possível carregar as estatísticas.
          </p>
          <p className="text-meta text-muted-foreground">{resource.error}</p>
          <Button className="w-fit" onClick={resource.reload} size="sm" variant="outline">
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <HabitChip habits={data.habits} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <HeatmapCard daily={data.stats.daily} />
            <ForecastBars forecast={data.stats.forecast} />
          </div>

          <section
            aria-labelledby="stats-retention"
            className="flex max-w-[var(--measure)] flex-col gap-2 rounded-card border border-border bg-card p-5"
            data-slot="stats-retention"
          >
            <h2 className="font-heading text-h2 text-foreground" id="stats-retention">
              Recordação real
            </h2>
            <p className="font-heading text-page text-foreground tabular-nums">
              {retentionLabel(data.stats.trueRetention)}
            </p>
            <p className="text-meta text-muted-foreground">
              Acerto nos cards maduros (intervalo de 21 dias ou mais). É a medida que diz se
              o intervalo está bem calibrado — não uma nota sobre você.
              {data.stats.matureReviews === 0
                ? " Ainda não há revisões de cards maduros suficientes para calcular."
                : ""}
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <GoalCard onSaved={resource.reload} settings={data.settings} />
            <section
              aria-labelledby="stats-reminder"
              className="flex flex-col gap-2 rounded-card border border-border bg-card p-5"
            >
              <h2 className="font-heading text-h2 text-foreground" id="stats-reminder">
                Lembrete
              </h2>
              <ReminderToggle />
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}
