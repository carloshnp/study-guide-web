import { describe, expect, it } from "vitest"

import { renderMathJaxSvg } from "./mathjax"

describe("renderMathJaxSvg", () => {
  it("renders inline math with auto-displaystyle by default and display blocks without errors", () => {
    const inlineAuto = renderMathJaxSvg("\\lim_{n \\to \\infty} \\frac{a}{s^{2}}", {
      display: false,
    })
    const inlinePlain = renderMathJaxSvg("\\lim_{n \\to \\infty} \\frac{a}{s^{2}}", {
      autoDisplayStyle: false,
      display: false,
    })

    expect(inlineAuto.querySelector("svg")).not.toBeNull()
    expect(inlineAuto.dataset.mathError).toBeUndefined()
    // Auto-displaystyle changes the SVG geometry compared to cramped textstyle.
    expect(inlineAuto.innerHTML).not.toBe(inlinePlain.innerHTML)

    const block = renderMathJaxSvg(
      "\\begin{align}\nF(s) & = \\int_{0}^{\\infty} e^{-st} f(t) dt\n\\end{align}",
      { display: true },
    )
    expect(block.querySelector("svg")).not.toBeNull()
    expect(block.dataset.mathError).toBeUndefined()
  })

  it("supports vault preamble macros and MathJax packages (mathtools, enclose, mhchem, braket)", () => {
    const expressions = [
      {
        display: true,
        tex: "\\begin{align}\n\\Aboxed{\\mathcal{L} \\left\\{ t \\right\\} & = \\frac{1}{s^{2}}}\n\\end{align}",
      },
      { display: false, tex: "\\oiint_S \\vec{E} \\cdot d\\vec{A} + \\oiiint_V \\rho\\,dV" },
      { display: false, tex: "\\enclose{horizontalstrike}{x + 1}" },
      { display: false, tex: "\\ce{H2O} + \\pu{10 m/s}" },
      { display: false, tex: "\\braket{\\psi | \\phi}" },
    ]

    for (const { display, tex } of expressions) {
      const el = renderMathJaxSvg(tex, { display })
      expect(el.querySelector("svg"), `expected SVG for: ${tex}`).not.toBeNull()
      expect(el.dataset.mathError, `unexpected math error for: ${tex}`).toBeUndefined()
      expect(el.querySelector('[data-mml-node="merror"]'), `merror for: ${tex}`).toBeNull()
    }
  })

  it("returns an inline error element instead of throwing on incomplete or invalid LaTeX", () => {
    const broken = renderMathJaxSvg("\\frac{1}{", { display: false })
    expect(broken).toBeInstanceOf(HTMLElement)
    expect(broken.dataset.mathError).toBe("true")
  })
})
