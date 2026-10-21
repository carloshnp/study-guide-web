/**
 * Reading progress as a client store.
 *
 * Why not TanStack Query: no `QueryClientProvider` is mounted in `main.tsx` and
 * this feature does not own that file. A Query client would have to be installed
 * by the shell owner first, so this module keeps a tiny external store instead:
 * one entry per guide, shared by every `SectionCheck` on the page through
 * `useSyncExternalStore`. That also gives the exact optimistic semantics the
 * spec asks for (write first, roll back on failure) without a mutation cache.
 *
 * Contract:
 *   useProgress(guideId)          → { statuses, pending, isLoading, error,
 *                                     statusOf, setStatus, toggle, counts,
 *                                     summary, reload }
 *   useUnitProgress(guideId, id)  → { status, isSaving, error, setStatus, toggle }
 *
 * `setStatus`/`toggle` resolve to true when the PUT persisted and false when it
 * failed (the state is already rolled back and a toast has been raised), so a
 * caller can branch without catching. Aggregates come from `@/lib/progress`.
 */

"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"

import { toastManager } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import {
  countUnits,
  percentDone,
  statusOf,
  summarizeByChapter,
  type ProgressCounts,
  type ProgressStatus,
  type ProgressSummary,
  type StoredProgressStatus,
} from "@/lib/progress"

type GuideEntry = {
  error: string | null
  pending: Readonly<Record<string, true>>
  phase: "idle" | "loading" | "ready" | "error"
  statuses: Readonly<Record<string, ProgressStatus>>
  /** Units the user wrote during the current session; they win over a late GET. */
  touched: Readonly<Record<string, true>>
}

export type UseProgressResult = {
  statuses: Readonly<Record<string, ProgressStatus>>
  pending: Readonly<Record<string, true>>
  isLoading: boolean
  error: string | null
  statusOf: (unitId: string) => ProgressStatus
  setStatus: (unitId: string, status: ProgressStatus) => Promise<boolean>
  toggle: (unitId: string, status: StoredProgressStatus) => Promise<boolean>
  counts: (unitIds: readonly string[]) => ProgressCounts
  summary: (unitIds: readonly string[]) => ProgressSummary
  percent: (unitIds: readonly string[]) => number
  reload: () => Promise<void>
}

export type UseUnitProgressResult = {
  status: ProgressStatus
  isSaving: boolean
  error: string | null
  setStatus: (status: ProgressStatus) => Promise<boolean>
  toggle: (status: StoredProgressStatus) => Promise<boolean>
}

const IDLE_ENTRY: GuideEntry = {
  error: null,
  pending: {},
  phase: "idle",
  statuses: {},
  touched: {},
}

const entries = new Map<string, GuideEntry>()
const listeners = new Set<() => void>()
const inflight = new Map<string, Promise<void>>()
/** Per-unit write counter so a stale failure cannot undo a newer write. */
const revisions = new Map<string, number>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

function entryOf(guideId: string): GuideEntry {
  return entries.get(guideId) ?? IDLE_ENTRY
}

function setEntry(guideId: string, patch: Partial<GuideEntry>): void {
  entries.set(guideId, { ...entryOf(guideId), ...patch })
  emit()
}

/** Drop every cached guide. Tests use it between cases; the app never needs it. */
export function resetProgressStore(): void {
  entries.clear()
  inflight.clear()
  revisions.clear()
  emit()
}

function withStatus(
  statuses: Readonly<Record<string, ProgressStatus>>,
  unitId: string,
  status: ProgressStatus,
): Record<string, ProgressStatus> {
  const next = { ...statuses }
  if (status === "absent") delete next[unitId]
  else next[unitId] = status
  return next
}

function withoutKey(
  record: Readonly<Record<string, true>>,
  key: string,
): Record<string, true> {
  const next = { ...record }
  delete next[key]
  return next
}

function load(guideId: string, force = false): Promise<void> {
  const running = inflight.get(guideId)
  if (running && !force) return running
  if (!force && entryOf(guideId).phase === "ready") return Promise.resolve()

  setEntry(guideId, { error: null, phase: "loading" })

  const request = api
    .getProgress(guideId)
    .then((response) => {
      const current = entryOf(guideId)
      const merged: Record<string, ProgressStatus> = { ...response.units }
      for (const [unitId, status] of Object.entries(current.statuses)) {
        if (current.touched[unitId]) merged[unitId] = status
      }
      setEntry(guideId, { error: null, phase: "ready", statuses: merged })
    })
    .catch((error: unknown) => {
      setEntry(guideId, { error: errorMessage(error), phase: "error" })
    })
    .finally(() => {
      inflight.delete(guideId)
    })

  inflight.set(guideId, request)
  return request
}

function notifyFailure(error: unknown): void {
  toastManager.add({
    description: `${errorMessage(error)} A marcação foi desfeita.`,
    title: "Progresso não salvo",
    type: "error",
  })
}

async function write(
  guideId: string,
  unitId: string,
  status: ProgressStatus,
): Promise<boolean> {
  const key = `${guideId}::${unitId}`
  const entry = entryOf(guideId)
  const previous = statusOf(entry.statuses, unitId)
  const revision = (revisions.get(key) ?? 0) + 1
  revisions.set(key, revision)

  setEntry(guideId, {
    error: null,
    pending: { ...entry.pending, [unitId]: true },
    statuses: withStatus(entry.statuses, unitId, status),
    touched: { ...entry.touched, [unitId]: true },
  })

  try {
    await api.putProgress({ guideId, status, unitId })
    if (revisions.get(key) === revision) {
      setEntry(guideId, { pending: withoutKey(entryOf(guideId).pending, unitId) })
    }
    return true
  } catch (error) {
    if (revisions.get(key) === revision) {
      const current = entryOf(guideId)
      setEntry(guideId, {
        error: errorMessage(error),
        pending: withoutKey(current.pending, unitId),
        statuses: withStatus(current.statuses, unitId, previous),
      })
    }
    notifyFailure(error)
    return false
  }
}

/** Read the guide-level store; loading starts once per guide and is shared. */
export function useProgress(guideId: string): UseProgressResult {
  const entry = useSyncExternalStore(
    subscribe,
    () => entryOf(guideId),
    () => IDLE_ENTRY,
  )

  useEffect(() => {
    void load(guideId)
  }, [guideId])

  const statusOfUnit = useCallback(
    (unitId: string) => statusOf(entry.statuses, unitId),
    [entry.statuses],
  )

  const setStatus = useCallback(
    (unitId: string, status: ProgressStatus) => write(guideId, unitId, status),
    [guideId],
  )

  const toggle = useCallback(
    (unitId: string, status: StoredProgressStatus) =>
      write(guideId, unitId, statusOf(entryOf(guideId).statuses, unitId) === status ? "absent" : status),
    [guideId],
  )

  const counts = useCallback(
    (unitIds: readonly string[]) => countUnits(unitIds, entry.statuses),
    [entry.statuses],
  )

  const summary = useCallback(
    (unitIds: readonly string[]) => summarizeByChapter(guideId, unitIds, entry.statuses),
    [entry.statuses, guideId],
  )

  const percent = useCallback(
    (unitIds: readonly string[]) => percentDone(counts(unitIds)),
    [counts],
  )

  const reload = useCallback(() => load(guideId, true), [guideId])

  return {
    counts,
    error: entry.error,
    isLoading: entry.phase === "idle" || entry.phase === "loading",
    pending: entry.pending,
    percent,
    reload,
    setStatus,
    statuses: entry.statuses,
    statusOf: statusOfUnit,
    summary,
    toggle,
  }
}

/** One unit, the shape a single `SectionCheck` needs. */
export function useUnitProgress(guideId: string, unitId: string): UseUnitProgressResult {
  const progress = useProgress(guideId)
  const { setStatus: setUnitStatus, toggle: toggleUnit } = progress

  const setStatus = useCallback(
    (status: ProgressStatus) => setUnitStatus(unitId, status),
    [setUnitStatus, unitId],
  )

  const toggle = useCallback(
    (status: StoredProgressStatus) => toggleUnit(unitId, status),
    [toggleUnit, unitId],
  )

  return {
    error: progress.error,
    isSaving: Boolean(progress.pending[unitId]),
    setStatus,
    status: statusOf(progress.statuses, unitId),
    toggle,
  }
}
