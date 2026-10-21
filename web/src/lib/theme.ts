/**
 * Theme selection, shared by the pre-paint script in `index.html` and the React app.
 *
 * Three choices, one storage key, one resolved theme. `auto` follows the operating
 * system, `light`/`dark` are explicit and survive a reload. The inline script in
 * `index.html` mirrors `applyTheme` so the first paint already has the right scheme.
 */

export const THEME_STORAGE_KEY = "estudos-theme"

export const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)"

export type ThemeChoice = "auto" | "light" | "dark"

export type ResolvedTheme = "light" | "dark"

/** Cycle order for the top-bar control: auto → light → dark → auto. */
const THEME_ORDER: readonly ThemeChoice[] = ["auto", "light", "dark"]

export const THEME_LABEL: Record<ThemeChoice, string> = {
  auto: "Auto",
  light: "Claro",
  dark: "Escuro",
}

export function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === "auto" || value === "light" || value === "dark"
}

export function nextTheme(choice: ThemeChoice): ThemeChoice {
  const index = THEME_ORDER.indexOf(choice)
  return THEME_ORDER[(index + 1) % THEME_ORDER.length]
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === "auto") return prefersDark ? "dark" : "light"
  return choice
}

/** Reads the stored choice; anything unrecognised or unreadable falls back to `auto`. */
export function readStoredTheme(getItem: (key: string) => string | null): ThemeChoice {
  try {
    const stored = getItem(THEME_STORAGE_KEY)
    return isThemeChoice(stored) ? stored : "auto"
  } catch {
    return "auto"
  }
}

export function storeTheme(setItem: (key: string, value: string) => void, choice: ThemeChoice): void {
  try {
    setItem(THEME_STORAGE_KEY, choice)
  } catch {
    /* Private mode can refuse the write; the choice still applies to this session. */
  }
}

/**
 * Applies the theme to an element (the document root in the app, a container in tests).
 * Returns the resolved theme so callers can render the same answer they painted.
 */
export function applyTheme(
  root: HTMLElement,
  choice: ThemeChoice,
  prefersDark: boolean,
): ResolvedTheme {
  const resolved = resolveTheme(choice, prefersDark)
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
  root.dataset.theme = choice
  return resolved
}
