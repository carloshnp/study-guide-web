import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  applyTheme,
  nextTheme,
  PREFERS_DARK_QUERY,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  type ResolvedTheme,
  type ThemeChoice,
} from "@/lib/theme"

type ThemeContextValue = {
  /** What the user picked: auto, light or dark. */
  choice: ThemeChoice
  /** What is actually on screen right now. */
  resolved: ResolvedTheme
  setChoice: (choice: ThemeChoice) => void
  cycle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia(PREFERS_DARK_QUERY).matches
}

function persist(choice: ThemeChoice): void {
  storeTheme((key, value) => window.localStorage.setItem(key, value), choice)
}

/**
 * Owns the theme choice, persists it per device and keeps `documentElement` in sync.
 * The initial choice is read from storage on first render, so the value the inline
 * script painted and the value React renders never disagree.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(() =>
    readStoredTheme((key) => window.localStorage.getItem(key)),
  )
  const [prefersDark, setPrefersDark] = useState<boolean>(systemPrefersDark)

  // Track the system preference so `auto` keeps following it while the page is open.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const query = window.matchMedia(PREFERS_DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    applyTheme(document.documentElement, choice, prefersDark)
  }, [choice, prefersDark])

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next)
    persist(next)
  }, [])

  const cycle = useCallback(() => {
    setChoiceState((current) => {
      const next = nextTheme(current)
      persist(next)
      return next
    })
  }, [])

  const resolved = resolveTheme(choice, prefersDark)

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, resolved, setChoice, cycle }),
    [choice, resolved, setChoice, cycle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme precisa estar dentro de <ThemeProvider>")
  return context
}
