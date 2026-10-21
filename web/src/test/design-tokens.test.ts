import { describe, expect, it } from "vitest"

import css from "../index.css?raw"
import html from "../../index.html?raw"

/** Every token from design-system/estudos/MASTER.md, with the documented value per theme. */
const MASTER_TOKENS: Record<string, { light: string; dark: string }> = {
  "--background": { light: "#ffffff", dark: "#0f1116" },
  "--foreground": { light: "#15181e", dark: "#e8eaef" },
  "--muted-foreground": { light: "#5c6470", dark: "#a3abba" },
  "--faint": { light: "#8a92a0", dark: "#7b8496" },
  "--card": { light: "#ffffff", dark: "#15181e" },
  "--border": { light: "#e7eaf0", dark: "#262b36" },
  "--accent": { light: "#1d4ed8", dark: "#7aa2ff" },
  "--accent-ink": { light: "#14357f", dark: "#c7d6ff" },
  "--accent-soft": { light: "#eef3fe", dark: "#16213c" },
  "--success": { light: "#157347", dark: "#4ade80" },
  "--warning": { light: "#b42318", dark: "#f87171" },
  "--code-bg": { light: "#f5f7fa", dark: "#111522" },
}

/** Tokens that exist only in the design system's layout/type/motion sections. */
const DERIVED_TOKENS = [
  "--font-sans",
  "--font-heading",
  "--font-mono",
  "--radius",
  "--shadow-pop",
  "--dur-fast",
  "--dur-base",
  "--dur-slow",
  "--ease-enter",
  "--ease-exit",
  "--z-bar",
  "--z-sidebar",
  "--z-drawer",
  "--z-dialog",
  "--z-toast",
  "--sidebar-w",
  "--rail-w",
  "--bar-h",
  "--bar-h-phone",
  "--reading-gutter",
]

function declarationsFor(selector: string): Map<string, string> {
  const found = new Map<string, string>()
  const pattern = new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "gm")
  let match: RegExpExecArray | null
  while ((match = pattern.exec(css)) !== null) {
    const open = css.indexOf("{", match.index)
    let depth = 0
    let end = -1
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1
      if (css[index] === "}") {
        depth -= 1
        if (depth === 0) {
          end = index
          break
        }
      }
    }
    if (end < 0) throw new Error(`unterminated block for ${selector}`)
    const body = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, "")
    const declaration = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g
    let decl: RegExpExecArray | null
    while ((decl = declaration.exec(body)) !== null) {
      found.set(decl[1], decl[2].trim())
    }
  }
  return found
}

const light = declarationsFor(":root")
const dark = declarationsFor(".dark")

describe("design tokens", () => {
  it("carries every MASTER.md colour token in the light theme", () => {
    for (const [token, values] of Object.entries(MASTER_TOKENS)) {
      expect(light.get(token), `${token} in :root`).toBe(values.light)
    }
  })

  it("carries every MASTER.md colour token in the dark theme", () => {
    for (const [token, values] of Object.entries(MASTER_TOKENS)) {
      expect(dark.get(token), `${token} in .dark`).toBe(values.dark)
    }
  })

  it("overrides the coss preset with the design-system shapes", () => {
    for (const token of DERIVED_TOKENS) {
      expect(light.get(token), `${token} in :root`).toBeTruthy()
    }
    expect(light.get("--font-sans")).toContain("Montserrat")
    expect(light.get("--font-heading")).toContain("Montserrat")
    expect(light.get("--radius")).toBe("12px")
    expect(light.get("--dur-fast")).toBe("120ms")
    expect(light.get("--dur-base")).toBe("180ms")
    expect(light.get("--dur-slow")).toBe("240ms")
  })

  it("drives the coss primitives from semantic tokens only", () => {
    const theme = declarationsFor("@theme inline")
    expect(theme.get("--color-background")).toBe("var(--background)")
    expect(theme.get("--color-foreground")).toBe("var(--foreground)")
    expect(theme.get("--color-border")).toBe("var(--border)")
    // coss reserves `accent` for its subtle hover surface; the blue is exposed as `brand`.
    expect(theme.get("--color-accent")).toBe("var(--accent-soft)")
    expect(theme.get("--color-brand")).toBe("var(--accent)")
    expect(theme.get("--color-primary")).toBe("var(--accent)")
  })

  it("declares Montserrat from self-hosted woff2 files", () => {
    expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*"Montserrat"/)
    expect(css).toContain("/fonts/montserrat-latin.woff2")
    expect(css).toContain("/fonts/montserrat-latin-italic.woff2")
    expect(css).not.toContain("@fontsource-variable/inter")
    expect(css).not.toContain('@import "geist"')
  })

  it("sets the color scheme before paint so the wrong theme never flashes", () => {
    const head = html.slice(0, html.indexOf("</head>"))
    expect(head).toContain("estudos-theme")
    expect(head).toContain("color-scheme")
    expect(head).toContain("prefers-color-scheme")
    expect(head.indexOf("estudos-theme")).toBeLessThan(html.indexOf("/src/main.tsx"))
    expect(html).toContain('lang="pt-BR"')
  })

  it("honours reduced motion and keeps a visible focus ring", () => {
    expect(css).toContain("prefers-reduced-motion: reduce")
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/)
  })
})
