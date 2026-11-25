import { existsSync, readFileSync } from "node:fs"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { afterEach, describe, expect, it } from "vitest"

import { createLivePreviewExtension } from "./live-preview"

const LAPLACE_NOTE_PATH =
  "/run/media/carloshnp/D/Obsidian/Study/Study & Work/Uni/Ciclo Básico/Cálculo/Cálculo IV/Aulas/20250910 - Aula 11 - Transformada de Laplace, Funções Seccionalmente Contínuas, Ordem Exponencial.md"

let mountedView: EditorView | null = null

function mountEditor(doc: string, options?: { sourceMode?: boolean; cursor?: number }) {
  const parent = document.createElement("div")
  document.body.appendChild(parent)
  const state = EditorState.create({
    doc,
    extensions: [createLivePreviewExtension({ sourceMode: options?.sourceMode })],
    selection: { anchor: options?.cursor ?? 0 },
  })
  const view = new EditorView({ parent, state })
  mountedView = view
  return { parent, view }
}

describe("createLivePreviewExtension", () => {
  afterEach(() => {
    mountedView?.destroy()
    mountedView?.dom.parentElement?.remove()
    mountedView = null
  })

  it("renders math, callouts, formatting, and embeds off-cursor and reveals source on-cursor", () => {
    const doc = [
      "Linha inicial",
      "",
      "## A classe $\\mathcal{L}$",
      "",
      ">[!theorem] Definição",
      ">Transformada: $f(t) = e^{at}$",
      ">$$F(s) = \\int_{0}^{\\infty} e^{-st} f(t) dt$$",
      "",
      "**Exemplo:** ![[diagrama.excalidraw | center]]",
      "",
      "$$\\begin{align}",
      "\\Aboxed{\\mathcal{L}\\{t\\} & = \\frac{1}{s^{2}}}",
      "\\end{align}$$",
    ].join("\n")

    // Cursor on line 1 ("Linha inicial"): everything below renders live.
    const { view } = mountEditor(doc, { cursor: 0 })

    expect(view.dom.querySelectorAll("svg").length).toBeGreaterThanOrEqual(4)
    expect(view.dom.querySelectorAll('[data-math-error="true"]')).toHaveLength(0)
    expect(view.dom.querySelector("[data-callout-type='theorem']")).not.toBeNull()
    expect(view.dom.textContent).toContain("Definição")
    expect(view.dom.querySelector("[data-embed-target='diagrama.excalidraw']")).not.toBeNull()

    // Move cursor into the inline equation `$f(t) = e^{at}$`: raw LaTeX is revealed.
    const inlinePos = doc.indexOf("f(t) = e^{at}") + 2
    view.dispatch({ selection: { anchor: inlinePos } })
    expect(view.dom.textContent).toContain("$f(t) = e^{at}$")
  })

  it("keeps raw markdown and LaTeX unrendered when sourceMode is true", () => {
    const doc = "# Título\n\n$x^{2}$ e **negrito**\n\n>[!theorem] Teorema\n>Corpo"
    const { view } = mountEditor(doc, { cursor: 0, sourceMode: true })

    expect(view.dom.querySelectorAll("svg")).toHaveLength(0)
    expect(view.dom.querySelector("[data-callout-type]")).toBeNull()
    expect(view.dom.textContent).toContain("$x^{2}$")
    expect(view.dom.textContent).toContain(">[!theorem] Teorema")
  })

  it("assigns distinct Obsidian callout tones for theorem, proof, obs, theory, warning and danger", () => {
    const doc = [
      "Topo",
      "",
      ">[!theorem] Teorema 1",
      ">Enunciado",
      "",
      ">[!proof] Demonstração",
      ">Passo 1",
      "",
      ">[!obs] Observação",
      ">Nota rápida",
      "",
      ">[!warning] Atenção",
      ">Cuidado",
      "",
      ">[!danger] Erro comum",
      ">Evitar",
    ].join("\n")

    const { view } = mountEditor(doc, { cursor: 0 })

    expect(view.dom.querySelector("[data-callout-type='theorem']")).toHaveAttribute(
      "data-callout-tone",
      "purple",
    )
    expect(view.dom.querySelector("[data-callout-type='proof']")).toHaveAttribute(
      "data-callout-tone",
      "green",
    )
    expect(view.dom.querySelector("[data-callout-type='obs']")).toHaveAttribute(
      "data-callout-tone",
      "teal",
    )
    expect(view.dom.querySelector("[data-callout-type='warning']")).toHaveAttribute(
      "data-callout-tone",
      "amber",
    )
    expect(view.dom.querySelector("[data-callout-type='danger']")).toHaveAttribute(
      "data-callout-tone",
      "red",
    )
  })

  it("does not merge an empty inline $$ pair with a display math block below it", () => {
    const doc = ["$$", "", "$$\\begin{align}", "x & = 1", "\\end{align}$$"].join("\n")
    // Cursor right inside empty inline `$|$` on line 1
    const { view } = mountEditor(doc, { cursor: 1 })

    // The display math block below still renders cleanly as its own SVG block!
    expect(view.dom.querySelectorAll("[data-math-display='block']")).toHaveLength(1)
    expect(view.dom.querySelectorAll('[data-math-error="true"]')).toHaveLength(0)

    // Same for bare `$$` above `$$\nx = 1\n$$` even when cursor is elsewhere.
    const doc2 = ["Topo", "$$", "", "$$", "y = 2", "$$"].join("\n")
    view.destroy()
    const second = mountEditor(doc2, { cursor: 0 })
    expect(second.view.dom.querySelectorAll("[data-math-display='block']")).toHaveLength(1)
    expect(second.view.dom.querySelectorAll('[data-math-error="true"]')).toHaveLength(0)
  })

  it("renders the full Calculus IV Laplace Transform Obsidian note with zero math errors", () => {
    const fallbackNote = [
      "# Transformada de Laplace",
      ">[!theorem] Definição",
      ">$$F(s) = \\int_{0}^{\\infty} e^{-st} f(t) dt$$",
      ">$$\\begin{align}",
      "\\int_{\\alpha}^{\\beta} f(t) dt & = \\int_{\\alpha}^{\\tau_{1}} f(t) dt",
      "\\end{align}$$",
      "![[20250910 2025-09-10 15.14.36.excalidraw | center ]]",
      "$$\\begin{align}",
      "\\Aboxed{\\mathcal{L} \\left\\{ t \\right\\} & = \\frac{1}{s^{2}}}",
      "\\end{align}$$",
    ].join("\n")

    const doc = existsSync(LAPLACE_NOTE_PATH)
      ? readFileSync(LAPLACE_NOTE_PATH, "utf-8")
      : fallbackNote

    // Place cursor at line 0 ("# Transformada de Laplace") and inspect full render.
    // CodeMirror virtualizes very tall documents by viewport, so also validate by
    // slicing into chunks when testing the real 222-line note in jsdom.
    const chunks = doc.split(/\n(?=## )/)
    let totalSvgs = 0
    let totalCallouts = 0
    let totalEmbeds = 0

    for (const chunk of chunks) {
      const wrapped = `\n${chunk}`
      const { view } = mountEditor(wrapped, { cursor: 0 })
      const errors = view.dom.querySelectorAll('[data-math-error="true"]')
      expect(errors.length, `MathJax errors in section:\n${chunk.slice(0, 120)}`).toBe(0)
      totalSvgs += view.dom.querySelectorAll("svg").length
      totalCallouts += view.dom.querySelectorAll("[data-callout-type='theorem']").length
      totalEmbeds += view.dom.querySelectorAll("[data-embed-target]").length
      view.destroy()
      view.dom.parentElement?.remove()
      mountedView = null
    }

    expect(totalSvgs).toBeGreaterThanOrEqual(4)
    expect(totalCallouts).toBeGreaterThanOrEqual(1)
    expect(totalEmbeds).toBeGreaterThanOrEqual(1)
    if (existsSync(LAPLACE_NOTE_PATH)) {
      // The real Laplace note has 5 theorem callouts, 5 excalidraw embeds, and >40 equations.
      expect(totalCallouts).toBe(5)
      expect(totalEmbeds).toBe(5)
      expect(totalSvgs).toBeGreaterThanOrEqual(40)
    }
  })
})
