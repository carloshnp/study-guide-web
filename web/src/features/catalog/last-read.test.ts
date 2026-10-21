import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  clearLastRead,
  LAST_READ_KEY,
  lastReadHref,
  readLastRead,
  writeLastRead,
} from "@/features/catalog/last-read"

const VISIT = {
  chapterSlug: "01-o-aluminio",
  guideId: "aluminio",
  guideTitle: "Alumínio",
  title: "O alumínio como metal de engenharia",
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe("last-read store", () => {
  it("writes and reads back the visit a chapter recorded", () => {
    const stored = writeLastRead({ ...VISIT, at: "2026-10-21T10:00:00Z" })

    expect(stored).toEqual({ ...VISIT, at: "2026-10-21T10:00:00Z" })
    expect(readLastRead()).toEqual(stored)
    expect(lastReadHref(stored!)).toBe("/g/aluminio/c/01-o-aluminio")
  })

  it("returns null when nothing was stored", () => {
    expect(readLastRead()).toBeNull()
  })

  it("ignores malformed JSON and a payload without usable ids", () => {
    window.localStorage.setItem(LAST_READ_KEY, "{not json")
    expect(readLastRead()).toBeNull()

    window.localStorage.setItem(LAST_READ_KEY, JSON.stringify({ guideId: "aluminio" }))
    expect(readLastRead()).toBeNull()

    window.localStorage.setItem(
      LAST_READ_KEY,
      JSON.stringify({ chapterSlug: "../../etc", guideId: "aluminio" }),
    )
    expect(readLastRead()).toBeNull()
  })

  it("refuses to store an id that is not a single path segment", () => {
    expect(writeLastRead({ ...VISIT, guideId: "../fora" })).toBeNull()
    expect(readLastRead()).toBeNull()
  })

  it("clears the entry", () => {
    writeLastRead(VISIT)
    clearLastRead()

    expect(readLastRead()).toBeNull()
  })
})
