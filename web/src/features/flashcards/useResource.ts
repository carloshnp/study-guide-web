/**
 * Minimal async resource hook for the flashcards screens.
 *
 * The catalog has its own module cache; the flashcards API is per-user and has
 * to be re-read after every save, so a tiny hook with an explicit `reload` is
 * enough. `load` is kept in a ref so callers can pass an inline closure without
 * re-firing the request on every render — the effect keyed by `key` decides
 * when to fetch again.
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { errorMessage } from "@/lib/api"

export type ResourceStatus = "loading" | "ready" | "error"

export type Resource<T> = {
  status: ResourceStatus
  data: T | null
  error: string | null
  reload: () => void
}

export function useResource<T>(key: string, load: () => Promise<T>): Resource<T> {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Omit<Resource<T>, "reload">>({
    data: null,
    error: null,
    status: "loading",
  })
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, error: null, status: "loading" }))

    loadRef
      .current()
      .then((data) => {
        if (!active) return
        setState({ data, error: null, status: "ready" })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({ data: null, error: errorMessage(error), status: "error" })
      })

    return () => {
      active = false
    }
  }, [attempt, key])

  const reload = useCallback(() => setAttempt((current) => current + 1), [])

  return { ...state, reload }
}
