import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { afterEach, describe, expect, it } from "vitest"

import { createLatexSuiteExtension } from "./latex-suite"

let mountedView: EditorView | null = null

function mountSuite(doc = "", cursor = doc.length) {
  const parent = document.createElement("div")
  document.body.appendChild(parent)
  const state = EditorState.create({
    doc,
    extensions: [createLatexSuiteExtension()],
    selection: { anchor: cursor },
  })
  const view = new EditorView({ parent, state })
  mountedView = view
  return view
}

/** Simulate typing characters through CM6's real inputHandler pipeline. */
function typeInto(view: EditorView, text: string) {
  for (const ch of text) {
    const { from, to } = view.state.selection.main
    let handled = false
    for (const handler of view.state.facet(EditorView.inputHandler)) {
      if (handler(view, from, to, ch, () => view.state.update({ changes: { from, insert: ch, to } }))) {
        handled = true
        break
      }
    }
    if (!handled) {
      view.dispatch(view.state.replaceSelection(ch))
    }
  }
}

/** Invoke a key binding registered via CM6's keymap facet. */
function pressKey(view: EditorView, key: string): boolean {
  const bindings = view.state.facet(keymap).flat()
  for (const binding of bindings) {
    if (binding.key === key && binding.run) {
      if (binding.run(view)) return true
    }
  }
  return false
}

describe("createLatexSuiteExtension", () => {
  afterEach(() => {
    mountedView?.destroy()
    mountedView?.dom.parentElement?.remove()
    mountedView = null
  })

  it("expands text/math snippets, regex captures, function snippets, and linked tabstops", () => {
    const view = mountSuite("")

    // `mk` in text mode creates `$ $` with cursor in the middle.
    typeInto(view, "mk")
    expect(view.state.doc.toString()).toBe("$$")
    expect(view.state.selection.main.head).toBe(1)

    // Inside math: Greek `@a`, power `sr`, space + auto-subscript `x2`, `//` fraction + Tab stops.
    typeInto(view, "@asr + x2 + //")
    expect(view.state.doc.toString()).toBe("$\\alpha^{2} + x_{2} + \\frac{}{}$")

    // Type numerator, Tab to denominator, type denominator, Tab past fraction.
    typeInto(view, "1")
    expect(pressKey(view, "Tab")).toBe(true)
    typeInto(view, "s")
    expect(pressKey(view, "Tab")).toBe(true)
    expect(view.state.doc.toString()).toBe("$\\alpha^{2} + x_{2} + \\frac{1}{s}$")

    // Function snippet `iden2` in display math.
    const view2 = mountSuite("$$\n\n$$", 3)
    typeInto(view2, "iden2")
    expect(view2.state.doc.toString()).toBe("$$\n\\begin{pmatrix}\n1 & 0 \\\\\n0 & 1\n\\end{pmatrix}\n$$")

    // Linked tabstop `beg` edits both \begin{$0} and \end{$0} together.
    const view3 = mountSuite("$$\n\n$$", 3)
    typeInto(view3, "beg")
    typeInto(view3, "align")
    expect(view3.state.doc.toString()).toBe("$$\n\\begin{align}\n\n\\end{align}\n$$")

    // Space-triggered manual snippet `par `.
    const view4 = mountSuite("$par$", 4)
    typeInto(view4, " ")
    expect(view4.state.doc.toString()).toBe("$\\frac{ \\partial y }{ \\partial x } $")

    view2.destroy()
    view3.destroy()
    view4.destroy()
  })

  it("wraps selected math with ${VISUAL} snippets and handles Backspace on empty $$", () => {
    const view = mountSuite("$x+1$", 1)
    view.dispatch({ selection: EditorSelection.range(1, 4) })
    typeInto(view, "U")
    expect(view.state.doc.toString()).toBe("$\\underbrace{ x+1 }_{  }$")

    const view2 = mountSuite("$$", 1)
    expect(pressKey(view2, "Backspace")).toBe(true)
    expect(view2.state.doc.toString()).toBe("")
    view2.destroy()
  })

  it("supports autofraction, matrix shortcuts, and tabout past closing delimiters", () => {
    // Autofraction `a/` -> `\frac{a}{}`
    const view = mountSuite("$a$", 2)
    typeInto(view, "/")
    expect(view.state.doc.toString()).toBe("$\\frac{a}{}$")

    // Matrix shortcuts inside pmatrix: Tab -> ` & `, Enter -> ` \\\\\n`
    const matDoc = "$$\n\\begin{pmatrix}\n1\n\\end{pmatrix}\n$$"
    const matView = mountSuite(matDoc, matDoc.indexOf("1") + 1)
    expect(pressKey(matView, "Tab")).toBe(true)
    typeInto(matView, "2")
    expect(pressKey(matView, "Enter")).toBe(true)
    expect(matView.state.doc.toString()).toContain("1 & 2 \\\\\n")

    // Tabout past `)` and `$`
    const tabView = mountSuite("$(x)$", 3)
    expect(pressKey(tabView, "Tab")).toBe(true)
    expect(tabView.state.selection.main.head).toBe(4)
    expect(pressKey(tabView, "Tab")).toBe(true)
    expect(tabView.state.selection.main.head).toBe(5)

    matView.destroy()
    tabView.destroy()
  })

  it("shows a floating MathJax SVG preview tooltip above active raw math", () => {
    const view = mountSuite("Texto $\\frac{1}{s^{2}}$ fim", 10)
    const preview = view.dom.querySelector("[data-slot='math-live-preview']")
    expect(preview).not.toBeNull()
    expect(preview?.querySelector("svg")).not.toBeNull()
    expect(preview?.querySelector('[data-math-error="true"]')).toBeNull()

    // Moving cursor outside math hides the tooltip.
    view.dispatch({ selection: { anchor: 1 } })
    expect(view.dom.querySelector("[data-slot='math-live-preview']")).toBeNull()
  })

  it("expands int, sin, alpha at the very start of $...$ and $$...$$ while preserving dint", () => {
    const v1 = mountSuite("$$", 1)
    typeInto(v1, "int")
    expect(v1.state.doc.toString()).toBe("$\\int$")
    v1.destroy()

    const v2 = mountSuite("$$\n\n$$", 3)
    typeInto(v2, "int")
    expect(v2.state.doc.toString()).toBe("$$\n\\int\n$$")
    v2.destroy()

    const v3 = mountSuite("$$", 1)
    typeInto(v3, "dint")
    expect(v3.state.doc.toString()).toBe("$\\int_{0}^{1}  \\, dx $")
    v3.destroy()

    const v4 = mountSuite("$$", 1)
    typeInto(v4, "sin")
    expect(v4.state.doc.toString()).toBe("$\\sin$")
    v4.destroy()
  })

  it("auto-enlarges enclosing brackets around fractions and colorizes nested raw LaTeX brackets", () => {
    const view = mountSuite("$()$", 2)
    typeInto(view, "//")
    expect(view.state.doc.toString()).toBe("$\\left(\\frac{}{}\\right)$")

    const colorView = mountSuite("$((a+b))$", 2)
    expect(colorView.dom.querySelector(".cm-math-bracket-0")).not.toBeNull()
    expect(colorView.dom.querySelector(".cm-math-bracket-1")).not.toBeNull()
    colorView.destroy()
  })

  it("keeps empty inline $$ isolated from a display math block below it", () => {
    const doc = "Texto $$\n\n$$\ny = 2\n$$"
    const view = mountSuite(doc, doc.indexOf("$$") + 1)
    typeInto(view, "@a")
    expect(view.state.doc.toString()).toBe("Texto $\\alpha$\n\n$$\ny = 2\n$$")
  })
})
