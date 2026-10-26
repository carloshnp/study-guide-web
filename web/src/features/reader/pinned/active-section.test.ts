import { describe, expect, it } from "vitest"

import { pickActiveSection, readingLineOffset } from "./active-section"

const TOPS = [
  { id: "a", top: -400 },
  { id: "b", top: 90 },
  { id: "c", top: 800 },
]

describe("pickActiveSection", () => {
  it("is null before the first heading reaches the reading line", () => {
    expect(pickActiveSection([{ id: "a", top: 300 }], 200)).toBeNull()
  })

  it("is null when the chapter has no headings", () => {
    expect(pickActiveSection([], 200)).toBeNull()
  })

  it("picks the last heading at or above the line", () => {
    expect(pickActiveSection(TOPS, 200)).toBe("b")
    expect(pickActiveSection(TOPS, 90)).toBe("b")
    expect(pickActiveSection(TOPS, 89)).toBe("a")
    expect(pickActiveSection(TOPS, 5000)).toBe("c")
  })

  it("makes the last section active once the pane is scrolled to its end", () => {
    expect(pickActiveSection(TOPS, 200, true)).toBe("c")
  })
})

describe("readingLineOffset", () => {
  it("sits 30% down the pane, never closer than 96px to the top", () => {
    expect(readingLineOffset(1000)).toBe(300)
    expect(readingLineOffset(200)).toBe(96)
    expect(readingLineOffset(0)).toBe(96)
  })
})
