/**
 * Layout preferences: the panel width is a persisted, device-local setting, so the
 * tests cover what a reader can actually do (toggle full width, drag the margin)
 * and the part that must never drift (the phone stays at 20px, the stored value is
 * sanitized, a reload keeps the choice).
 */

import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import {
  CONTENT_MAX_PX,
  DEFAULT_LAYOUT,
  GUTTER,
  LAYOUT_STORAGE_KEY,
  getLayoutPrefs,
  resetLayout,
  resetLayoutStore,
  sanitizeLayout,
  setLayoutGutter,
  setLayoutMode,
  useLayout,
} from "@/features/preferences/layout"

describe("layout preferences", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetLayout()
    resetLayoutStore()
  })

  it("starts centered with the default margin", () => {
    expect(getLayoutPrefs()).toEqual(DEFAULT_LAYOUT)
    expect(getLayoutPrefs().mode).toBe("centered")
    expect(getLayoutPrefs().gutter).toBe(GUTTER.default)
  })

  it("writes the custom properties the shell reads", () => {
    setLayoutMode("centered")
    expect(document.documentElement.style.getPropertyValue("--content-gutter-pref")).toBe(
      `${GUTTER.default}px`,
    )
    expect(document.documentElement.style.getPropertyValue("--content-max")).toBe(
      `${CONTENT_MAX_PX}px`,
    )

    setLayoutMode("full")
    expect(document.documentElement.style.getPropertyValue("--content-max")).toBe("none")
    expect(document.documentElement.dataset.layout).toBe("full")
  })

  it("persists the choice for the next visit", () => {
    setLayoutMode("full")
    setLayoutGutter(64)

    expect(JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? "{}")).toEqual({
      mode: "full",
      gutter: 64,
    })

    resetLayoutStore()
    expect(getLayoutPrefs()).toEqual({ mode: "full", gutter: 64 })
  })

  it("clamps and steps the margin instead of trusting the input", () => {
    setLayoutGutter(-40)
    expect(getLayoutPrefs().gutter).toBe(GUTTER.min)

    setLayoutGutter(1000)
    expect(getLayoutPrefs().gutter).toBe(GUTTER.max)

    setLayoutGutter(23)
    expect(getLayoutPrefs().gutter % GUTTER.step).toBe(0)
  })

  it("falls back to defaults for a corrupt or foreign stored value", () => {
    expect(sanitizeLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(sanitizeLayout("full")).toEqual(DEFAULT_LAYOUT)
    expect(sanitizeLayout({ mode: "diagonal", gutter: "wide" })).toEqual(DEFAULT_LAYOUT)

    window.localStorage.setItem(LAYOUT_STORAGE_KEY, "{not json")
    resetLayoutStore()
    expect(getLayoutPrefs()).toEqual(DEFAULT_LAYOUT)
  })

  it("resets both the mode and the margin", () => {
    setLayoutMode("full")
    setLayoutGutter(80)
    resetLayout()

    expect(getLayoutPrefs()).toEqual(DEFAULT_LAYOUT)
    expect(document.documentElement.dataset.layout).toBe("centered")
  })

  it("exposes the hook shape the settings menu consumes", () => {
    const api = renderHook(() => useLayout()).result.current
    expect(api.isFullWidth).toBe(false)
    expect(typeof api.setMode).toBe("function")
    expect(typeof api.setGutter).toBe("function")
    expect(typeof api.reset).toBe("function")
  })
})
