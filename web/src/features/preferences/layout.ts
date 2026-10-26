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
 * The text size lives here too: it is the same kind of device-local preference and
 * shares the storage key. It is applied as a `--font-scale` ratio, which every type
 * token multiplies, so the whole interface grows instead of only the article.
 *
 * Mobile safety: the chosen margin is written to `--content-gutter-pref`, and the
 * stylesheet derives `--content-gutter` from it with a phone override. A laptop
 * setting of 80px therefore cannot squeeze a 390px screen.
 */

"use client"

import { useSyncExternalStore } from "react"

export type LayoutMode = "centered" | "full"

/**
 * How a chapter is read. `classic` is the continuous text; `pinned` keeps the
 * picture of the section being read beside (or above) the text and changes it as
 * the reader scrolls. It only applies to chapters that carry section images.
 */
export type ReaderView = "classic" | "pinned"

export type LayoutPrefs = {
  /** `centered` caps the content block and centres it; `full` spans the main area. */
  mode: LayoutMode
  /** Side margin in px, applied through `--content-gutter-pref`. */
  gutter: number
  /** Text size in px, applied as a `--font-scale` ratio. 18 is the design default. */
  fontSize: number
  /** Reading view; device-local like the rest, so a phone and a laptop can differ. */
  readerView: ReaderView
}

export const LAYOUT_STORAGE_KEY = "estudos-layout"
export const CONTENT_MAX_PX = 1120

export const GUTTER = {
  min: 40,
  max: 150,
  step: 5,
  default: 40,
} as const

export const FONT_SIZE = {
  min: 10,
  max: 32,
  step: 1,
  default: 18,
} as const

export const DEFAULT_LAYOUT: LayoutPrefs = {
  mode: "centered",
  gutter: GUTTER.default,
  fontSize: FONT_SIZE.default,
  readerView: "classic",
}

export type LayoutStorage = Pick<Storage, "getItem" | "setItem">

function clampGutter(value: number): number {
  if (!Number.isFinite(value)) return GUTTER.default
  const stepped = Math.round(value / GUTTER.step) * GUTTER.step
  return Math.min(GUTTER.max, Math.max(GUTTER.min, stepped))
}

function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return FONT_SIZE.default
  const stepped = Math.round(value / FONT_SIZE.step) * FONT_SIZE.step
  return Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, stepped))
}

export function sanitizeLayout(value: unknown): LayoutPrefs {
  if (typeof value !== "object" || value === null) return DEFAULT_LAYOUT
  const record = value as Record<string, unknown>
  const mode: LayoutMode = record.mode === "full" ? "full" : "centered"
  const gutter = typeof record.gutter === "number" ? clampGutter(record.gutter) : GUTTER.default
  const fontSize =
    typeof record.fontSize === "number" ? clampFontSize(record.fontSize) : FONT_SIZE.default
  const readerView: ReaderView = record.readerView === "pinned" ? "pinned" : "classic"
  return { mode, gutter, fontSize, readerView }
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
  element.style.setProperty("--font-scale", `${prefs.fontSize / FONT_SIZE.default}`)
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
  if (
    next.mode === current.mode &&
    next.gutter === current.gutter &&
    next.fontSize === current.fontSize &&
    next.readerView === current.readerView
  ) {
    return
  }
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

export function setLayoutFontSize(fontSize: number): void {
  setLayout({ fontSize })
}

export function setLayoutReaderView(readerView: ReaderView): void {
  setLayout({ readerView })
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
  setFontSize: (fontSize: number) => void
  setReaderView: (readerView: ReaderView) => void
  isPinnedView: boolean
  canGrowFont: boolean
  canShrinkFont: boolean
}

export function useLayout(): UseLayoutResult {
  const prefs = useSyncExternalStore(subscribeLayout, getLayoutPrefs, getLayoutPrefs)
  return {
    ...prefs,
    isFullWidth: prefs.mode === "full",
    setMode: setLayoutMode,
    setGutter: setLayoutGutter,
    setFontSize: setLayoutFontSize,
    setReaderView: setLayoutReaderView,
    isPinnedView: prefs.readerView === "pinned",
    canGrowFont: prefs.fontSize < FONT_SIZE.max,
    canShrinkFont: prefs.fontSize > FONT_SIZE.min,
  }
}
