import { describe, expect, it } from "vitest"

import { pickActiveSection, pickImageIndex, readingLineOffset } from "./active-section"

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

describe("pickImageIndex", () => {
  const PLACES = [120, 540, 980]

  it("shows the first picture before any picture has reached the reading line", () => {
    expect(pickImageIndex(PLACES, 100)).toBe(0)
    expect(pickImageIndex([], 100)).toBe(0)
  })

  it("switches to a picture when its place in the text reaches the reading line", () => {
    expect(pickImageIndex(PLACES, 120)).toBe(0)
    expect(pickImageIndex(PLACES, 121)).toBe(0)
    expect(pickImageIndex(PLACES, 540)).toBe(1)
    expect(pickImageIndex(PLACES, 700)).toBe(1)
    expect(pickImageIndex(PLACES, 5000)).toBe(2)
  })
})

describe("readingLineOffset", () => {
  it("sits 30% down the pane, never closer than 96px to the top", () => {
    expect(readingLineOffset(1000)).toBe(300)
    expect(readingLineOffset(200)).toBe(96)
    expect(readingLineOffset(0)).toBe(96)
  })
})
