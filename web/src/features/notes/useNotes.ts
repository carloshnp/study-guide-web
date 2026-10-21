/**
 * Chapter notes with debounced autosave.
 *
 * Behaviour: the hook loads the note on mount (absent notes are a 200 with an
 * empty body), then every edit schedules one PUT 800ms after the last keystroke.
 * Blank text is sent as-is; the API deletes the row when the body is blank, so
 * "no note" has exactly one representation. A failed save keeps the draft, stops
 * automatic retries for that exact text and exposes `hasFailedDraft` so the UI
 * can require an explicit confirmation before throwing the text away.
 *
 * `retry()` re-sends the draft, `discard()` reverts it to the last saved body,
 * `saveNow()` flushes immediately (used when the sheet closes).
 */

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { api, errorMessage } from "@/lib/api"

/** Debounce window from MASTER.md › Notes. */
export const AUTOSAVE_DELAY_MS = 800

export type NoteStatus = "loading" | "saving" | "saved" | "error"

export type UseNotesResult = {
  /** What the textarea shows. */
  draft: string
  /** Last body the server acknowledged. */
  savedBody: string
  status: NoteStatus
  error: string | null
  isLoading: boolean
  isDirty: boolean
  /** A save failed and the draft differs from the saved body. */
  hasFailedDraft: boolean
  updatedAt: string | null
  change: (next: string) => void
  saveNow: () => Promise<boolean>
  retry: () => Promise<boolean>
  discard: () => void
}

export function useNotes(guideId: string, chapterId: string): UseNotesResult {
  const [draft, setDraft] = useState("")
  const [savedBody, setSavedBody] = useState("")
  const [status, setStatus] = useState<NoteStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const draftRef = useRef("")
  const savedBodyRef = useRef("")
  const touchedRef = useRef(false)
  const failedBodyRef = useRef<string | null>(null)
  const inFlightRef = useRef<{ body: string; promise: Promise<boolean> } | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    touchedRef.current = false
    failedBodyRef.current = null
    inFlightRef.current = null
    setStatus("loading")
    setError(null)

    api
      .getNote(guideId, chapterId)
      .then((note) => {
        if (cancelled) return
        savedBodyRef.current = note.body
        setSavedBody(note.body)
        setUpdatedAt(note.updatedAt)
        if (!touchedRef.current) {
          draftRef.current = note.body
          setDraft(note.body)
        }
        setStatus("saved")
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(errorMessage(cause))
        setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [guideId, chapterId])

  const persist = useCallback(
    (body: string): Promise<boolean> => {
      const pending = inFlightRef.current
      if (pending && pending.body === body) return pending.promise

      setStatus("saving")
      setError(null)

      const promise = api
        .putNote({ body, chapterId, guideId })
        .then((note) => {
          if (!mountedRef.current) return true
          failedBodyRef.current = null
          savedBodyRef.current = note.body
          setSavedBody(note.body)
          setUpdatedAt(note.updatedAt)
          if (draftRef.current === body) {
            // Adopt the server echo: the API may truncate the body it stored.
            draftRef.current = note.body
            setDraft(note.body)
          }
          setStatus("saved")
          return true
        })
        .catch((cause: unknown) => {
          if (!mountedRef.current) return false
          failedBodyRef.current = body
          setError(errorMessage(cause))
          setStatus("error")
          return false
        })
        .finally(() => {
          if (inFlightRef.current?.body === body) inFlightRef.current = null
        })

      inFlightRef.current = { body, promise }
      return promise
    },
    [chapterId, guideId],
  )

  useEffect(() => {
    if (status === "loading") return
    if (draft === savedBody) return
    if (failedBodyRef.current === draft) return
    if (inFlightRef.current?.body === draft) return

    const timer = setTimeout(() => {
      void persist(draft)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [draft, savedBody, status, persist])

  const change = useCallback((next: string) => {
    touchedRef.current = true
    failedBodyRef.current = null
    draftRef.current = next
    setDraft(next)
  }, [])

  const saveNow = useCallback(() => {
    const body = draftRef.current
    if (body === savedBodyRef.current) return Promise.resolve(true)
    return persist(body)
  }, [persist])

  const retry = useCallback(() => {
    failedBodyRef.current = null
    return persist(draftRef.current)
  }, [persist])

  const discard = useCallback(() => {
    failedBodyRef.current = null
    draftRef.current = savedBodyRef.current
    setDraft(savedBodyRef.current)
    setError(null)
    setStatus("saved")
  }, [])

  const isDirty = draft !== savedBody

  return {
    change,
    discard,
    draft,
    error,
    hasFailedDraft: status === "error" && isDirty,
    isDirty,
    isLoading: status === "loading",
    retry,
    savedBody,
    saveNow,
    status,
    updatedAt,
  }
}
