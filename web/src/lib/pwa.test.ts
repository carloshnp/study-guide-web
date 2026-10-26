import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

import { registerServiceWorker } from "@/lib/register-sw"
import { applyTheme, THEME_COLOR } from "@/lib/theme"

const PUBLIC_DIR = join(__dirname, "..", "..", "public")
const readPublic = (name: string) => readFileSync(join(PUBLIC_DIR, name), "utf8")

describe("installable app manifest", () => {
  const manifest = JSON.parse(readPublic("manifest.webmanifest")) as {
    name: string
    short_name: string
    start_url: string
    scope: string
    display: string
    icons: { src: string; sizes: string; type: string; purpose: string }[]
  }

  it("opens the app without browser chrome, at the site root", () => {
    expect(manifest.display).toBe("standalone")
    expect(manifest.start_url).toBe("/")
    expect(manifest.scope).toBe("/")
    expect(manifest.name).toBe("Estudos")
  })

  it("ships the 192/512 icons Chrome requires plus a maskable one, all present on disk", () => {
    const sizes = manifest.icons.map((icon) => icon.sizes)
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]))
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true)
    for (const icon of manifest.icons) {
      expect(existsSync(join(PUBLIC_DIR, icon.src.replace(/^\//, "")))).toBe(true)
    }
  })

  it("is linked from index.html together with the iOS icon and a theme colour", () => {
    const html = readFileSync(join(__dirname, "..", "..", "index.html"), "utf8")
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon" href="/pwa/apple-touch-icon.png"')
    expect(html).toContain('name="theme-color"')
    expect(existsSync(join(PUBLIC_DIR, "pwa", "apple-touch-icon.png"))).toBe(true)
    expect(existsSync(join(PUBLIC_DIR, "sw.js"))).toBe(true)
  })
})

describe("registerServiceWorker", () => {
  it("registers /sw.js at the root scope in production", async () => {
    const register = vi.fn().mockResolvedValue(undefined)
    registerServiceWorker({ serviceWorker: { register } } as unknown as Navigator, true)
    await Promise.resolve()
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" })
  })

  it("does nothing outside production or without service worker support", () => {
    const register = vi.fn().mockResolvedValue(undefined)
    registerServiceWorker({ serviceWorker: { register } } as unknown as Navigator, false)
    registerServiceWorker({} as Navigator, true)
    registerServiceWorker(undefined, true)
    expect(register).not.toHaveBeenCalled()
  })

  it("survives a refused registration", async () => {
    const register = vi.fn().mockRejectedValue(new Error("blocked"))
    expect(() =>
      registerServiceWorker({ serviceWorker: { register } } as unknown as Navigator, true),
    ).not.toThrow()
    await Promise.resolve()
  })
})

describe("theme colour of the browser bar", () => {
  it("follows the resolved theme", () => {
    const meta = document.createElement("meta")
    meta.name = "theme-color"
    meta.content = THEME_COLOR.light
    document.head.append(meta)

    applyTheme(document.documentElement, "dark", false)
    expect(meta.content).toBe(THEME_COLOR.dark)
    applyTheme(document.documentElement, "light", true)
    expect(meta.content).toBe(THEME_COLOR.light)
    meta.remove()
  })
})
