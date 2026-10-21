import { describe, expect, it } from "vitest"

import { normalizeDisplayMath } from "./display-math"

describe("normalizeDisplayMath", () => {
  it("turns a one-line $$…$$ paragraph into the flow form", () => {
    const markdown = ["Texto.", "", "$$\\boxed{\\sigma = \\sigma_0}$$", "", "Depois."].join("\n")

    expect(normalizeDisplayMath(markdown)).toBe(
      ["Texto.", "", "$$", "\\boxed{\\sigma = \\sigma_0}", "$$", "", "Depois."].join("\n"),
    )
  })

  it("leaves inline math with text around it alone", () => {
    const markdown = "A tensão $$\\sigma$$ domina o escoamento."

    expect(normalizeDisplayMath(markdown)).toBe(markdown)
  })

  it("leaves an already multi-line block alone", () => {
    const markdown = ["$$", "E = mc^2", "$$"].join("\n")

    expect(normalizeDisplayMath(markdown)).toBe(markdown)
  })

  it("never rewrites a fence", () => {
    const markdown = ["```latex", "$$a$$", "```"].join("\n")

    expect(normalizeDisplayMath(markdown)).toBe(markdown)
  })

  it("keeps two formulas on one line as two inline formulas", () => {
    const markdown = "$$a$$ e $$b$$"

    expect(normalizeDisplayMath(markdown)).toBe(markdown)
  })
})
