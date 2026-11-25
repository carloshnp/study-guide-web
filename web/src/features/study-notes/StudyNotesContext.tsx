/**
 * Lightweight shared context bridging study-guide routes (e.g. `Chapter`) and
 * the docked right-hand `NotesSidebar` without prop drilling across routes.
 */

"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export type StudyNoteQuote = {
  text: string
  markdown?: string
  guideId: string
  chapterSlug: string
  chapterTitle?: string
  sectionId: string | null
}

export type StudyNotesContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  pendingQuote: StudyNoteQuote | null
  requestInsertQuote: (quote: StudyNoteQuote) => void
  consumePendingQuote: () => void
}

const NOOP_CONTEXT: StudyNotesContextValue = {
  consumePendingQuote: () => undefined,
  open: false,
  pendingQuote: null,
  requestInsertQuote: () => undefined,
  setOpen: () => undefined,
  toggle: () => undefined,
}

const StudyNotesContext = createContext<StudyNotesContextValue>(NOOP_CONTEXT)

export function StudyNotesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pendingQuote, setPendingQuote] = useState<StudyNoteQuote | null>(null)

  const toggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const requestInsertQuote = useCallback((quote: StudyNoteQuote) => {
    setPendingQuote(quote)
    setOpen(true)
  }, [])

  const consumePendingQuote = useCallback(() => {
    setPendingQuote(null)
  }, [])

  const value = useMemo<StudyNotesContextValue>(
    () => ({
      consumePendingQuote,
      open,
      pendingQuote,
      requestInsertQuote,
      setOpen,
      toggle,
    }),
    [consumePendingQuote, open, pendingQuote, requestInsertQuote, toggle],
  )

  return <StudyNotesContext.Provider value={value}>{children}</StudyNotesContext.Provider>
}

export function useStudyNotes(): StudyNotesContextValue {
  return useContext(StudyNotesContext)
}
