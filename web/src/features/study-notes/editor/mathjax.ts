/**
 * Offline synchronous MathJax SVG renderer for the notes editor.
 *
 * Matches the user's Obsidian math stack:
 * - `auto-displaystyle-inline-math`: prepends `\displaystyle ` to inline math by default.
 * - `obsidian-latex` + `preamble.sty`: preloads `\oiint` and `\oiiint` and enables
 *   `ams`, `mathtools` (`\Aboxed`, `\mathllap`), `mhchem`, `enclose`, `braket`,
 *   `cancel`, `cases`, `boldsymbol`, `color`, `newcommand`, `textmacros`, `upgreek`.
 *
 * Uses MathJax's `browserAdaptor` directly so real DOM nodes are produced without
 * `innerHTML` or `dangerouslySetInnerHTML`.
 */

import { mathjax } from "mathjax-full/js/mathjax.js"
import { TeX } from "mathjax-full/js/input/tex.js"
import { SVG } from "mathjax-full/js/output/svg.js"
import { browserAdaptor } from "mathjax-full/js/adaptors/browserAdaptor.js"
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js"

import "mathjax-full/js/input/tex/base/BaseConfiguration.js"
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js"
import "mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js"
import "mathjax-full/js/input/tex/braket/BraketConfiguration.js"
import "mathjax-full/js/input/tex/cancel/CancelConfiguration.js"
import "mathjax-full/js/input/tex/cases/CasesConfiguration.js"
import "mathjax-full/js/input/tex/color/ColorConfiguration.js"
import "mathjax-full/js/input/tex/configmacros/ConfigMacrosConfiguration.js"
import "mathjax-full/js/input/tex/enclose/EncloseConfiguration.js"
import "mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js"
import "mathjax-full/js/input/tex/mhchem/MhchemConfiguration.js"
import "mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js"
import "mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration.js"
import "mathjax-full/js/input/tex/upgreek/UpgreekConfiguration.js"
import "mathjax-full/js/input/tex/unicode/UnicodeConfiguration.js"
import "mathjax-full/js/input/tex/verb/VerbConfiguration.js"

const PACKAGES = [
  "base",
  "ams",
  "boldsymbol",
  "braket",
  "cancel",
  "cases",
  "color",
  "configmacros",
  "enclose",
  "mathtools",
  "mhchem",
  "newcommand",
  "textmacros",
  "upgreek",
  "unicode",
  "verb",
]

const PREAMBLE_MACROS: Record<string, string> = {
  oiint: "{\\subset\\!\\supset} \\mathllap{\\iint}",
  oiiint: "{\\Large{\\subset\\!\\supset}} \\mathllap{\\iiint}",
}

const MAX_CACHE_SIZE = 400
const STYLE_ELEMENT_ID = "estudos-mathjax-svg-styles"

export type RenderMathOptions = {
  display: boolean
  /** Mirrors Obsidian's `auto-displaystyle-inline-math` plugin (default: true). */
  autoDisplayStyle?: boolean
}

type MathDocumentHandle = {
  convert: (tex: string, options: { display: boolean }) => HTMLElement
}

let cachedDocument: MathDocumentHandle | null = null
const renderCache = new Map<string, HTMLElement>()

function getMathDocument(): MathDocumentHandle {
  if (cachedDocument) return cachedDocument

  const adaptor = browserAdaptor()
  RegisterHTMLHandler(adaptor)

  const tex = new TeX({
    macros: PREAMBLE_MACROS,
    packages: PACKAGES,
    tags: "none",
  })
  const svg = new SVG({
    fontCache: "none",
    merrorInheritFont: true,
    mtextInheritFont: true,
  })
  const doc = mathjax.document(typeof document !== "undefined" ? document : "", {
    InputJax: tex,
    OutputJax: svg,
  })

  if (typeof document !== "undefined" && !document.getElementById(STYLE_ELEMENT_ID)) {
    const sheet = svg.styleSheet(doc) as unknown as HTMLStyleElement
    if (sheet && document.head) {
      sheet.id = STYLE_ELEMENT_ID
      document.head.appendChild(sheet)
    }
  }

  cachedDocument = {
    convert: (source: string, options: { display: boolean }) =>
      doc.convert(source, { display: options.display }) as unknown as HTMLElement,
  }
  return cachedDocument
}

function makeErrorContainer(tex: string, display: boolean, message: string): HTMLElement {
  const container = document.createElement("span")
  container.className = display ? "cm-math-error cm-math-error-block" : "cm-math-error"
  container.dataset.mathError = "true"
  container.title = message
  container.textContent = tex
  return container
}

function setCached(key: string, node: HTMLElement): void {
  if (renderCache.size >= MAX_CACHE_SIZE) {
    const oldest = renderCache.keys().next().value
    if (oldest !== undefined) renderCache.delete(oldest)
  }
  renderCache.set(key, node)
}

export function renderMathJaxSvg(tex: string, options: RenderMathOptions): HTMLElement {
  const display = options.display
  const autoDisplayStyle = options.autoDisplayStyle ?? true
  const trimmed = tex.trim()
  const key = `${display ? "D" : "I"}:${autoDisplayStyle ? "1" : "0"}:${trimmed}`

  const hit = renderCache.get(key)
  if (hit) {
    return hit.cloneNode(true) as HTMLElement
  }

  if (!trimmed) {
    const empty = makeErrorContainer("", display, "Expressão matemática vazia")
    setCached(key, empty)
    return empty.cloneNode(true) as HTMLElement
  }

  const effectiveTex =
    !display && autoDisplayStyle && !trimmed.startsWith("\\displaystyle")
      ? `\\displaystyle ${trimmed}`
      : trimmed

  try {
    const node = getMathDocument().convert(effectiveTex, { display })
    const merror = node.querySelector('[data-mml-node="merror"]')
    if (merror) {
      node.dataset.mathError = "true"
      node.title = merror.getAttribute("title") ?? merror.textContent ?? "Erro de sintaxe LaTeX"
    }
    setCached(key, node)
    return node.cloneNode(true) as HTMLElement
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Erro ao renderizar LaTeX"
    const fallback = makeErrorContainer(trimmed, display, message)
    setCached(key, fallback)
    return fallback.cloneNode(true) as HTMLElement
  }
}
