/**
 * Last chapter opened on this device, kept in `localStorage` so the home page can
 * offer one "Continuar" row (`MASTER.md` › Home). The reader records the visit; the
 * catalog only reads. A stored value is never trusted as a URL: the href is rebuilt
 * from the two ids after both pass a segment check, so a tampered entry cannot send
 * the link off-site.
 */

"use client"

import { useEffect, useState } from "react"

import { chapterHref } from "@/lib/catalog"

export const LAST_READ_KEY = "estudos:last-read"

export type LastRead = {
  guideId: string
  chapterSlug: string
  guideTitle: string
  title: string
  /** ISO timestamp of the visit. */
  at: string
}

export type LastReadStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

/** One path segment: letters, numbers, then letters, numbers, dot, dash, underscore. */
const SAFE_SEGMENT = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function safeSegment(value: unknown): value is string {
  return typeof value === "string" && SAFE_SEGMENT.test(value)
}

function optionalText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function defaultStorage(): LastReadStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function lastReadHref(entry: Pick<LastRead, "guideId" | "chapterSlug">): string {
  return chapterHref(entry.guideId, entry.chapterSlug)
}

/** The stored visit, or null when it is absent, unreadable or malformed. */
export function readLastRead(storage: LastReadStorage | null = defaultStorage()): LastRead | null {
  if (!storage) return null

  let raw: string | null
  try {
    raw = storage.getItem(LAST_READ_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  if (!safeSegment(parsed.guideId) || !safeSegment(parsed.chapterSlug)) return null

  return {
    at: optionalText(parsed.at),
    chapterSlug: parsed.chapterSlug,
    guideId: parsed.guideId,
    guideTitle: optionalText(parsed.guideTitle),
    title: optionalText(parsed.title),
  }
}

/** Record the chapter the reader is on. Returns the stored entry, or null on failure. */
export function writeLastRead(
  entry: Omit<LastRead, "at"> & { at?: string },
  storage: LastReadStorage | null = defaultStorage(),
): LastRead | null {
  if (!storage) return null
  if (!safeSegment(entry.guideId) || !safeSegment(entry.chapterSlug)) return null

  const stored: LastRead = {
    at: entry.at ?? new Date().toISOString(),
    chapterSlug: entry.chapterSlug,
    guideId: entry.guideId,
    guideTitle: entry.guideTitle,
    title: entry.title,
  }

  try {
    storage.setItem(LAST_READ_KEY, JSON.stringify(stored))
  } catch {
    return null
  }
  return stored
}

export function clearLastRead(storage: LastReadStorage | null = defaultStorage()): void {
  try {
    storage?.removeItem(LAST_READ_KEY)
  } catch {
    // A read-only store simply keeps the old entry; nothing to report.
  }
}

/**
 * Reads the entry on mount and refreshes it when another tab writes one. Home uses
 * this instead of a provider so the catalog needs nothing mounted in the shell.
 */
export function useLastRead(): LastRead | null {
  const [entry, setEntry] = useState<LastRead | null>(() => readLastRead())

  useEffect(() => {
    const refresh = () => setEntry(readLastRead())
    window.addEventListener("storage", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [])

  return entry
}
