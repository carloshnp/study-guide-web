/**
 * Panel width preferences: centred by default, optionally edge to edge, with a
 * side margin the reader controls.
 *
 * Why a store instead of React state: the setting is consumed in three places at
 * once (the top-bar settings menu, the shell's content column and the chapter's
 * two-column body), and it must survive a reload on the same device. One module
 * owns the value, writes the CSS custom properties the layout already reads, and
 * notifies subscribers, so no component has to pass props down the tree.
 *
 * Mobile safety: the chosen margin is written to `--content-gutter-pref`, and the
 * stylesheet derives `--content-gutter` from it with a phone override. A laptop
 * setting of 80px therefore cannot squeeze a 390px screen.
 */

"use client"

import { useSyncExternalStore } from "react"

export type LayoutMode = "centered" | "full"

export type LayoutPrefs = {
  /** `centered` caps the content block and centres it; `full` spans the main area. */
  mode: LayoutMode
  /** Side margin in px, applied through `--content-gutter-pref`. */
  gutter: number
}

export const LAYOUT_STORAGE_KEY = "estudos-layout"
export const CONTENT_MAX_PX = 1280

export const GUTTER = {
  min: 0,
  max: 96,
  step: 4,
  default: 24,
} as const

export const DEFAULT_LAYOUT: LayoutPrefs = { mode: "centered", gutter: GUTTER.default }

export type LayoutStorage = Pick<Storage, "getItem" | "setItem">

function clampGutter(value: number): number {
  if (!Number.isFinite(value)) return GUTTER.default
  const stepped = Math.round(value / GUTTER.step) * GUTTER.step
  return Math.min(GUTTER.max, Math.max(GUTTER.min, stepped))
}

export function sanitizeLayout(value: unknown): LayoutPrefs {
  if (typeof value !== "object" || value === null) return DEFAULT_LAYOUT
  const record = value as Record<string, unknown>
  const mode: LayoutMode = record.mode === "full" ? "full" : "centered"
  const gutter = typeof record.gutter === "number" ? clampGutter(record.gutter) : GUTTER.default
  return { mode, gutter }
}

function read(storage: LayoutStorage | undefined): LayoutPrefs {
  if (!storage) return DEFAULT_LAYOUT
  try {
    const raw = storage.getItem(LAYOUT_STORAGE_KEY)
    if (raw === null) return DEFAULT_LAYOUT
    return sanitizeLayout(JSON.parse(raw))
  } catch {
    return DEFAULT_LAYOUT
  }
}

/**
 * Writes the two custom properties the shell and the chapter body read, plus a
 * `data-layout` attribute so CSS can adjust a layout without a JS branch.
 */
export function applyLayout(prefs: LayoutPrefs, root: HTMLElement | null = null): void {
  const element = root ?? (typeof document === "undefined" ? null : document.documentElement)
  if (element === null) return
  element.style.setProperty("--content-gutter-pref", `${prefs.gutter}px`)
  element.style.setProperty("--content-max", prefs.mode === "full" ? "none" : `${CONTENT_MAX_PX}px`)
  element.dataset.layout = prefs.mode
}

let current: LayoutPrefs = read(typeof window === "undefined" ? undefined : window.localStorage)
const listeners = new Set<() => void>()

if (typeof document !== "undefined") applyLayout(current)

function emit(): void {
  for (const listener of listeners) listener()
}

export function getLayoutPrefs(): LayoutPrefs {
  return current
}

export function subscribeLayout(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function commit(next: LayoutPrefs): void {
  if (next.mode === current.mode && next.gutter === current.gutter) return
  current = next
  applyLayout(current)
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(current))
    } catch {
      // Private mode or a full quota: the session keeps working, the reload forgets.
    }
  }
  emit()
}

export function setLayout(next: Partial<LayoutPrefs>): void {
  commit(sanitizeLayout({ ...current, ...next }))
}

export function setLayoutMode(mode: LayoutMode): void {
  setLayout({ mode })
}

export function setLayoutGutter(gutter: number): void {
  setLayout({ gutter })
}

export function resetLayout(): void {
  commit({ ...DEFAULT_LAYOUT })
}

/** Test seam: drops in-memory state and re-reads storage. */
export function resetLayoutStore(): void {
  current = read(typeof window === "undefined" ? undefined : window.localStorage)
  applyLayout(current)
  emit()
}

export type UseLayoutResult = LayoutPrefs & {
  isFullWidth: boolean
  setMode: (mode: LayoutMode) => void
  setGutter: (gutter: number) => void
  reset: () => void
}

export function useLayout(): UseLayoutResult {
  const prefs = useSyncExternalStore(subscribeLayout, getLayoutPrefs, getLayoutPrefs)
  return {
    ...prefs,
    isFullWidth: prefs.mode === "full",
    setMode: setLayoutMode,
    setGutter: setLayoutGutter,
    reset: resetLayout,
  }
}
