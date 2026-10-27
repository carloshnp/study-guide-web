/**
 * "Guia resumido" (summary mode) preference: one device-local on/off switch.
 *
 * Why a store instead of React state: the setting is read in more than one place
 * at once (the settings menu and the chapter body) and it must survive a reload
 * on the same device. One module owns the value, persists it and notifies
 * subscribers, so no component has to pass props down the tree.
 *
 * Storage is deliberately a raw string, not JSON: the key holds "1" when summary
 * mode is on and "0" when it is off. Anything else — a foreign value, a corrupt
 * write from an older build, a storage that refuses to answer — reads as OFF.
 * Summary mode never turns itself on by accident.
 */

"use client"

import { useSyncExternalStore } from "react"

export const SUMMARY_STORAGE_KEY = "estudos-resumo"

export type SummaryStorage = Pick<Storage, "getItem" | "setItem">

/** Only the literal string "1" means on; everything else means off. */
export function sanitizeSummary(raw: unknown): boolean {
  return raw === "1"
}

function read(storage: SummaryStorage | undefined): boolean {
  if (!storage) return false
  try {
    return sanitizeSummary(storage.getItem(SUMMARY_STORAGE_KEY))
  } catch {
    // Storage blocked (private mode, disabled cookies): the session works, off.
    return false
  }
}

let current: boolean = read(typeof window === "undefined" ? undefined : window.localStorage)
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getSummaryMode(): boolean {
  return current
}

export function subscribeSummary(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function commit(next: boolean): void {
  if (next === current) return
  current = next
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SUMMARY_STORAGE_KEY, next ? "1" : "0")
    } catch {
      // Private mode or a full quota: the session keeps working, the reload forgets.
    }
  }
  emit()
}

export function setSummaryMode(on: boolean): void {
  commit(on === true)
}

/** Test seam: drops in-memory state and re-reads storage. */
export function resetSummaryStore(): void {
  current = read(typeof window === "undefined" ? undefined : window.localStorage)
  emit()
}

export type UseSummaryModeResult = {
  on: boolean
  setOn: (on: boolean) => void
}

export function useSummaryMode(): UseSummaryModeResult {
  const on = useSyncExternalStore(subscribeSummary, getSummaryMode, getSummaryMode)
  return { on, setOn: setSummaryMode }
}
