/**
 * Summary mode ("guia resumido"): a single device-local on/off switch, so the
 * tests cover what a reader can actually do (turn it on, turn it off, reload and
 * keep the choice) and the part that must never drift (the raw storage value is
 * sanitized: only "1" means on).
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getSummaryMode,
  resetSummaryStore,
  sanitizeSummary,
  setSummaryMode,
  subscribeSummary,
  SUMMARY_STORAGE_KEY,
  useSummaryMode,
} from "@/features/preferences/summary"

describe("summary mode preference", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetSummaryStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    resetSummaryStore()
  })

  it("starts off when nothing has been stored", () => {
    expect(SUMMARY_STORAGE_KEY).toBe("estudos-resumo")
    expect(getSummaryMode()).toBe(false)
    expect(window.localStorage.getItem(SUMMARY_STORAGE_KEY)).toBeNull()
  })

  it("sanitizes anything other than '1' to off", () => {
    expect(sanitizeSummary("1")).toBe(true)

    for (const raw of ["0", "", "true", "yes", " 1", "01", "on", null, undefined, true, 1]) {
      expect(sanitizeSummary(raw)).toBe(false)
    }
  })

  it("turns on and persists '1' for the next visit", () => {
    setSummaryMode(true)

    expect(getSummaryMode()).toBe(true)
    expect(window.localStorage.getItem(SUMMARY_STORAGE_KEY)).toBe("1")

    // A reload: drop in-memory state and read storage again.
    resetSummaryStore()
    expect(getSummaryMode()).toBe(true)
  })

  it("turns off and persists '0' for the next visit", () => {
    setSummaryMode(true)
    setSummaryMode(false)

    expect(getSummaryMode()).toBe(false)
    expect(window.localStorage.getItem(SUMMARY_STORAGE_KEY)).toBe("0")

    resetSummaryStore()
    expect(getSummaryMode()).toBe(false)
  })

  it("reads a stored '1' back as on and any other stored value as off", () => {
    window.localStorage.setItem(SUMMARY_STORAGE_KEY, "1")
    resetSummaryStore()
    expect(getSummaryMode()).toBe(true)

    window.localStorage.setItem(SUMMARY_STORAGE_KEY, "true")
    resetSummaryStore()
    expect(getSummaryMode()).toBe(false)
  })

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSummary(listener)

    setSummaryMode(true)
    expect(listener).toHaveBeenCalledTimes(1)

    setSummaryMode(false)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    setSummaryMode(true)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("does not notify when the value does not change", () => {
    setSummaryMode(true)
    const listener = vi.fn()
    const unsubscribe = subscribeSummary(listener)

    setSummaryMode(true)
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })

  it("keeps working when storage refuses to write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded")
    })

    expect(() => setSummaryMode(true)).not.toThrow()
    expect(getSummaryMode()).toBe(true)
  })

  it("exposes the hook shape the settings menu consumes", () => {
    const { result } = renderHook(() => useSummaryMode())

    expect(result.current.on).toBe(false)
    expect(typeof result.current.setOn).toBe("function")

    act(() => {
      result.current.setOn(true)
    })
    expect(result.current.on).toBe(true)
    expect(getSummaryMode()).toBe(true)

    // A change from outside the hook reaches the component too.
    act(() => {
      setSummaryMode(false)
    })
    expect(result.current.on).toBe(false)
  })
})
