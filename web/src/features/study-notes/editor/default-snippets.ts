/**
 * User's Obsidian LaTeX Suite snippets & variables imported verbatim from
 * `/run/media/carloshnp/D/Obsidian/Study/latex-snippets.js` and
 * `.obsidian/plugins/obsidian-latex-suite/data.json`.
 */

export type LatexSnippetReplacement = string | ((match: RegExpExecArray) => string)

export type LatexSnippet = {
  trigger: string | RegExp
  replacement: LatexSnippetReplacement
  options: string
  description?: string
  priority?: number
}

export const DEFAULT_SNIPPET_VARIABLES: Record<string, string> = {
  "${GREEK}":
    "alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|vartheta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|omicron|pi|rho|varrho|sigma|Sigma|tau|upsilon|Upsilon|phi|varphi|Phi|chi|psi|omega|Omega",
  "${MORE_SYMBOLS}":
    "leq|geq|neq|gg|ll|equiv|sim|propto|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|to|mapsto|cap|cup|in|sum|prod|exp|ln|log|det|dots|vdots|ddots|pm|mp|int|iint|iiint|oint",
  "${SYMBOL}":
    "parallel|perp|partial|nabla|hbar|ell|infty|oplus|ominus|otimes|oslash|square|star|dagger|vee|wedge|subseteq|subset|supseteq|supset|emptyset|exists|nexists|forall|implies|impliedby|iff|setminus|neg|lor|land|bigcup|bigcap|cdot|times|simeq|approx",
}

export const DEFAULT_SNIPPETS: readonly LatexSnippet[] = [
  // Math mode
  { options: "tA", replacement: "$$0$", trigger: "mk" },
  { options: "tAw", replacement: "$$\n$0\n$$", trigger: "dm" },
  { options: "mA", replacement: "\\begin{$0}\n$1\n\\end{$0}", trigger: "beg" },

  // Greek letters
  { options: "mA", replacement: "\\alpha", trigger: "@a" },
  { options: "mA", replacement: "\\beta", trigger: "@b" },
  { options: "mA", replacement: "\\gamma", trigger: "@g" },
  { options: "mA", replacement: "\\Gamma", trigger: "@G" },
  { options: "mA", replacement: "\\delta", trigger: "@d" },
  { options: "mA", replacement: "\\Delta", trigger: "@D" },
  { options: "mA", replacement: "\\epsilon", trigger: "@e" },
  { options: "mA", replacement: "\\varepsilon", trigger: ":e" },
  { options: "mA", replacement: "\\zeta", trigger: "@z" },
  { options: "mA", replacement: "\\theta", trigger: "@t" },
  { options: "mA", replacement: "\\Theta", trigger: "@T" },
  { options: "mA", replacement: "\\vartheta", trigger: ":t" },
  { options: "mA", replacement: "\\iota", trigger: "@i" },
  { options: "mA", replacement: "\\kappa", trigger: "@k" },
  { options: "mA", replacement: "\\lambda", trigger: "@l" },
  { options: "mA", replacement: "\\Lambda", trigger: "@L" },
  { options: "mA", replacement: "\\sigma", trigger: "@s" },
  { options: "mA", replacement: "\\Sigma", trigger: "@S" },
  { options: "mA", replacement: "\\upsilon", trigger: "@u" },
  { options: "mA", replacement: "\\Upsilon", trigger: "@U" },
  { options: "mA", replacement: "\\omega", trigger: "@o" },
  { options: "mA", replacement: "\\Omega", trigger: "@O" },
  { options: "mA", replacement: "\\omega", trigger: "ome" },
  { options: "mA", replacement: "\\Omega", trigger: "Ome" },
  { options: "mA", replacement: "\\rho", trigger: "@r" },

  // Text environment
  { options: "mA", replacement: "\\text{$0}$1", trigger: "text" },
  { options: "mA", replacement: "\\text{$0}$1", trigger: '"' },
  { options: "mA", replacement: "\\quad", trigger: "quad" },

  // Basic operations
  { options: "mA", replacement: "^{2}", trigger: "sr" },
  { options: "mA", replacement: "^{3}", trigger: "cb" },
  { options: "mA", replacement: "^{$0}$1", trigger: "rd" },
  { options: "mA", replacement: "_{$0}$1", trigger: "_" },
  { options: "mA", replacement: "_\\text{$0}", trigger: "sts" },
  { options: "mA", replacement: "\\sqrt{ $0 }$1", trigger: "sq" },
  { options: "mA", replacement: "\\frac{$0}{$1}$2", trigger: "//" },
  { options: "mA", replacement: "e^{ $0 }$1", trigger: "ee" },
  { options: "mA", replacement: "^{-1}", trigger: "invs" },
  {
    description: "Auto letter subscript",
    options: "rmA",
    priority: -1,
    replacement: "[[0]]_{[[1]]}",
    trigger: /([A-Za-z])(\d)/,
  },

  { options: "rmA", replacement: "[[0]]\\[[1]]", trigger: /([^\\])(exp|log|ln)/ },
  { options: "mA", replacement: "^{*}", trigger: "conj" },
  { options: "mA", replacement: "\\mathrm{Re}", trigger: "Re" },
  { options: "mA", replacement: "\\mathrm{Im}", trigger: "Im" },
  { options: "mA", replacement: "\\mathbf{$0}", trigger: "bf" },
  { options: "mA", replacement: "\\mathrm{$0}$1", trigger: "rm" },

  // Linear algebra
  { options: "rmA", replacement: "[[0]]\\[[1]]", trigger: /([^\\])(det)/ },
  { options: "mA", replacement: "\\mathrm{Tr}", trigger: "trace" },

  // More operations
  { options: "rmA", replacement: "\\hat{[[0]]}", trigger: "([a-zA-Z])hat" },
  { options: "rmA", replacement: "\\bar{[[0]]}", trigger: "([a-zA-Z])bar" },
  { options: "rmA", priority: -1, replacement: "\\dot{[[0]]}", trigger: "([a-zA-Z])dot" },
  { options: "rmA", priority: 1, replacement: "\\ddot{[[0]]}", trigger: "([a-zA-Z])ddot" },
  { options: "rmA", replacement: "\\tilde{[[0]]}", trigger: "([a-zA-Z])tilde" },
  { options: "rmA", replacement: "\\underline{[[0]]}", trigger: "([a-zA-Z])und" },
  { options: "rmA", replacement: "\\vec{[[0]]}", trigger: "([a-zA-Z])vec" },
  { options: "rmA", replacement: "\\mathbf{[[0]]}", trigger: "([a-zA-Z]),\\." },
  { options: "rmA", replacement: "\\mathbf{[[0]]}", trigger: "([a-zA-Z])\\.," },
  { options: "rmA", replacement: "\\boldsymbol{\\[[0]]}", trigger: "\\\\(${GREEK}),\\." },
  { options: "rmA", replacement: "\\boldsymbol{\\[[0]]}", trigger: "\\\\(${GREEK})\\.," },

  { options: "mA", replacement: "\\hat{$0}$1", trigger: "hat" },
  { options: "mA", replacement: "\\bar{$0}$1", trigger: "bar" },
  { options: "mA", priority: -1, replacement: "\\dot{$0}$1", trigger: "dot" },
  { options: "mA", replacement: "\\ddot{$0}$1", trigger: "ddot" },
  { options: "mA", replacement: "\\cdot", trigger: "cdot" },
  { options: "mA", replacement: "\\tilde{$0}$1", trigger: "tilde" },
  { options: "mA", replacement: "\\underline{$0}$1", trigger: "und" },
  { options: "mA", replacement: "\\vec{$0}$1", trigger: "vec" },
  { options: "mA", replacement: "\\enclose{horizontalstrike}{$0}$1", trigger: "strike" },

  // More auto letter subscript
  { options: "rmA", replacement: "[[0]]_{[[1]]}", trigger: /([A-Za-z])_(\d\d)/ },
  { options: "rmA", replacement: "\\hat{[[0]]}_{[[1]]}", trigger: /\\hat{([A-Za-z])}(\d)/ },
  { options: "rmA", replacement: "\\vec{[[0]]}_{[[1]]}", trigger: /\\vec{([A-Za-z])}(\d)/ },
  { options: "rmA", replacement: "\\mathbf{[[0]]}_{[[1]]}", trigger: /\\mathbf{([A-Za-z])}(\d)/ },

  { options: "mA", replacement: "x_{n}", trigger: "xnn" },
  { options: "mA", priority: 1, replacement: "x_{i}", trigger: "\\xii" },
  { options: "mA", replacement: "x_{j}", trigger: "xjj" },
  { options: "mA", replacement: "x_{n+1}", trigger: "xp1" },
  { options: "mA", replacement: "y_{n}", trigger: "ynn" },
  { options: "mA", replacement: "y_{i}", trigger: "yii" },
  { options: "mA", replacement: "y_{j}", trigger: "yjj" },

  // Symbols
  { options: "mA", replacement: "\\infty", trigger: "ooo" },
  { options: "mA", replacement: "\\sum", trigger: "sum" },
  { options: "mA", replacement: "\\prod", trigger: "prod" },
  { options: "m", replacement: "\\sum_{${0:n}=${1:1}}^{${2:\\infty}} $3", trigger: "\\sum" },
  { options: "m", replacement: "\\prod_{${0:n}=${1:1}}^{${2:N}} $3", trigger: "\\prod" },
  { options: "mA", replacement: "\\lim_{ ${0:n} \\to ${1:\\infty} } $2", trigger: "lim" },
  { options: "mA", replacement: "\\pm", trigger: "+-" },
  { options: "mA", replacement: "\\mp", trigger: "-+" },
  { options: "mA", replacement: "\\dots", trigger: "..." },
  { options: "mA", replacement: "\\nabla", trigger: "nabl" },
  { options: "mA", replacement: "\\nabla", trigger: "del" },
  { options: "mA", replacement: "\\times", trigger: "xx" },
  { options: "mA", replacement: "\\cdot", trigger: "**" },
  { options: "mA", replacement: "\\parallel", trigger: "para" },

  { options: "mA", replacement: "\\equiv", trigger: "===" },
  { options: "mA", replacement: "\\neq", trigger: "!=" },
  { options: "mA", replacement: "\\geq", trigger: ">=" },
  { options: "mA", replacement: "\\leq", trigger: "<=" },
  { options: "mA", replacement: "\\gg", trigger: ">>" },
  { options: "mA", replacement: "\\ll", trigger: "<<" },
  { options: "mA", replacement: "\\sim", trigger: "simm" },
  { options: "mA", replacement: "\\simeq", trigger: "sim=" },
  { options: "mA", replacement: "\\propto", trigger: "prop" },
  { options: "mA", replacement: "^{$0}", trigger: "^" },
  { options: "mA", replacement: "\\frac{$0}{$1}", trigger: "frac" },

  { options: "mA", replacement: "\\leftrightarrow ", trigger: "<->" },
  { options: "mA", replacement: "\\to", trigger: "->" },
  { options: "mA", replacement: "\\mapsto", trigger: "!>" },
  { options: "mA", replacement: "\\implies", trigger: "=>" },
  { options: "mA", replacement: "\\impliedby", trigger: "=<" },
  { options: "mA", replacement: "\\pm", trigger: "pm" },

  { options: "mA", replacement: "\\cap", trigger: "and" },
  { options: "mA", replacement: "\\cup", trigger: "orr" },
  { options: "mA", replacement: "\\in", trigger: "inn" },
  { options: "mA", replacement: "\\not\\in", trigger: "notin" },
  { options: "mA", replacement: "\\setminus", trigger: "\\\\\\" },
  { options: "mA", replacement: "\\subseteq", trigger: "sub=" },
  { options: "mA", replacement: "\\supseteq", trigger: "sup=" },
  { options: "mA", replacement: "\\emptyset", trigger: "eset" },
  { options: "mA", replacement: "\\{ $0 \\}$1", trigger: "set" },
  { options: "mA", priority: 1, replacement: "\\exists", trigger: "e\\xi sts" },

  { options: "mA", replacement: "\\mathcal{L}", trigger: "LL" },
  { options: "mA", replacement: "\\mathcal{H}", trigger: "HH" },
  { options: "mA", replacement: "\\mathbb{C}", trigger: "CC" },
  { options: "mA", replacement: "\\mathbb{R}", trigger: "RR" },
  { options: "mA", replacement: "\\mathbb{Z}", trigger: "ZZ" },
  { options: "mA", replacement: "\\mathbb{N}", trigger: "NN" },
  { options: "mA", replacement: "\\mathbb{Q}", trigger: "QQ" },

  // Handle spaces and backslashes
  { options: "mA", replacement: "\\\\[5pt]", trigger: "spoint" },
  { options: "mA", replacement: "\\vphantom{\\rule{0pt}{5mm}}", trigger: "space" },
  { options: "mA", replacement: "\\ ", trigger: "sep" },
  { options: "mA", replacement: "\\", trigger: "backs" },
  { options: "mA", replacement: "\\\\", trigger: "newl" },
  { options: "mA", replacement: "\\substack{ $0 }", trigger: "subst" },
  { options: "mA", replacement: "\\displaystyle", trigger: "diss" },

  // Snippet variable rules
  {
    description: "Add backslash before Greek letters",
    options: "rmA",
    replacement: "[[0]]\\[[1]]",
    trigger: "([^\\\\])(${GREEK})",
  },
  {
    description: "Add backslash before symbols",
    options: "rmA",
    replacement: "[[0]]\\[[1]]",
    trigger: "([^\\\\])(${SYMBOL})",
  },
  {
    options: "rmA",
    replacement: "\\[[0]] [[1]]",
    trigger: "\\\\(${GREEK}|${SYMBOL}|${MORE_SYMBOLS})([A-Za-z])",
  },
  { options: "rmA", replacement: "\\[[0]]^{2}", trigger: "\\\\(${GREEK}|${SYMBOL}) sr" },
  { options: "rmA", replacement: "\\[[0]]^{3}", trigger: "\\\\(${GREEK}|${SYMBOL}) cb" },
  { options: "rmA", replacement: "\\[[0]]^{$0}$1", trigger: "\\\\(${GREEK}|${SYMBOL}) rd" },
  { options: "rmA", replacement: "\\hat{\\[[0]]}", trigger: "\\\\(${GREEK}|${SYMBOL}) hat" },
  { options: "rmA", replacement: "\\dot{\\[[0]]}", trigger: "\\\\(${GREEK}|${SYMBOL}) dot" },
  { options: "rmA", replacement: "\\bar{\\[[0]]}", trigger: "\\\\(${GREEK}|${SYMBOL}) bar" },
  { options: "rmA", replacement: "\\vec{\\[[0]]}", trigger: "\\\\(${GREEK}|${SYMBOL}) vec" },
  { options: "rmA", replacement: "\\tilde{\\[[0]]}", trigger: "\\\\(${GREEK}|${SYMBOL}) tilde" },
  { options: "rmA", replacement: "\\underline{\\[[0]]}", trigger: "\\\\(${GREEK}|${SYMBOL}) und" },

  // Derivatives and integrals
  { options: "m", replacement: "\\frac{ \\partial ${0:y} }{ \\partial ${1:x} } $2", trigger: "par" },
  { options: "rm", replacement: "\\frac{ d [[0]] }{ d [[1]] } ", trigger: /dd\{(.*?)\}\{(.*?)\}/ },
  {
    options: "rm",
    replacement: "\\frac{ \\partial [[0]] }{ \\partial [[1]] } ",
    trigger: /pa\{(.*?)\}\{(.*?)\}/,
  },
  { options: "mA", replacement: "\\frac{d}{dt} ", trigger: "ddt" },

  { options: "rmA", priority: -1, replacement: "[[0]]\\int", trigger: /([^\\])int/ },
  { options: "m", replacement: "\\int $0 \\, d${1:x} $2", trigger: "\\int" },
  { options: "mA", replacement: "\\int_{${0:0}}^{${1:1}} $2 \\, d${3:x} $4", trigger: "dint" },
  { options: "mA", replacement: "\\oint", trigger: "oint" },
  { options: "mA", replacement: "\\iint", trigger: "iint" },
  { options: "mA", replacement: "\\iiint", trigger: "iiint" },
  { options: "mA", replacement: "\\int_{0}^{\\infty} $0 \\, d${1:x} $2", trigger: "oinf" },
  { options: "mA", replacement: "\\int_{-\\infty}^{\\infty} $0 \\, d${1:x} $2", trigger: "infi" },

  // Trigonometry
  {
    description: "Add backslash before trig funcs",
    options: "rmA",
    replacement: "[[0]]\\[[1]]",
    trigger: /([^\\])(arcsin|sin|arccos|cos|arctan|tan|csc|sec|cot)/,
  },
  {
    description: "Add space after trig funcs. Skips letter h to allow sinh, cosh, etc.",
    options: "rmA",
    replacement: "\\[[0]] [[1]]",
    trigger: /\\(arcsin|sin|arccos|cos|arctan|tan|csc|sec|cot)([A-Za-gi-z])/,
  },
  {
    description: "Add space after hyperbolic trig funcs",
    options: "rmA",
    replacement: "\\[[0]] [[1]]",
    trigger: /\\(sinh|cosh|tanh|coth)([A-Za-z])/,
  },

  // Visual operations
  { options: "mA", replacement: "\\underbrace{ ${VISUAL} }_{ $0 }", trigger: "U" },
  { options: "mA", replacement: "\\overbrace{ ${VISUAL} }^{ $0 }", trigger: "O" },
  { options: "mA", replacement: "\\underset{ $0 }{ ${VISUAL} }", trigger: "B" },
  { options: "mA", replacement: "\\cancel{ ${VISUAL} }", trigger: "C" },
  { options: "mA", replacement: "\\cancelto{ $0 }{ ${VISUAL} }", trigger: "K" },
  { options: "mA", replacement: "\\sqrt{ ${VISUAL} }", trigger: "S" },

  // Physics
  { options: "mA", replacement: "k_{B}T", trigger: "kbt" },
  { options: "mA", replacement: "M_{\\odot}", trigger: "msun" },

  // Quantum mechanics
  { options: "mA", replacement: "^{\\dagger}", trigger: "dag" },
  { options: "mA", replacement: "\\oplus ", trigger: "o+" },
  { options: "mA", replacement: "\\otimes ", trigger: "ox" },
  { options: "mA", replacement: "\\bra{$0} $1", trigger: "bra" },
  { options: "mA", replacement: "\\ket{$0} $1", trigger: "ket" },
  { options: "mA", replacement: "\\braket{ $0 | $1 } $2", trigger: "brk" },
  { options: "mA", replacement: "\\ket{${0:\\psi}} \\bra{${0:\\psi}} $1", trigger: "outer" },

  // Chemistry
  { options: "mA", replacement: "\\pu{ $0 }", trigger: "pu" },
  { options: "mA", replacement: "\\ce{ $0 }", trigger: "cee" },
  { options: "mA", replacement: "{}^{4}_{2}He ", trigger: "he4" },
  { options: "mA", replacement: "{}^{3}_{2}He ", trigger: "he3" },
  { options: "mA", replacement: "{}^{${0:4}}_{${1:2}}${2:He}", trigger: "iso" },

  // Environments
  { options: "MA", replacement: "\\begin{pmatrix}\n$0\n\\end{pmatrix}", trigger: "pmat" },
  { options: "MA", replacement: "\\begin{bmatrix}\n$0\n\\end{bmatrix}", trigger: "bmat" },
  { options: "MA", replacement: "\\begin{Bmatrix}\n$0\n\\end{Bmatrix}", trigger: "Bmat" },
  { options: "MA", replacement: "\\begin{vmatrix}\n$0\n\\end{vmatrix}", trigger: "vmat" },
  { options: "MA", replacement: "\\begin{Vmatrix}\n$0\n\\end{Vmatrix}", trigger: "Vmat" },
  { options: "MA", replacement: "\\begin{matrix}\n$0\n\\end{matrix}", trigger: "matrix" },

  { options: "nA", replacement: "\\begin{pmatrix}$0\\end{pmatrix}", trigger: "pmat" },
  { options: "nA", replacement: "\\begin{bmatrix}$0\\end{bmatrix}", trigger: "bmat" },
  { options: "nA", replacement: "\\begin{Bmatrix}$0\\end{Bmatrix}", trigger: "Bmat" },
  { options: "nA", replacement: "\\begin{vmatrix}$0\\end{vmatrix}", trigger: "vmat" },
  { options: "nA", replacement: "\\begin{Vmatrix}$0\\end{Vmatrix}", trigger: "Vmat" },
  { options: "nA", replacement: "\\begin{matrix}$0\\end{matrix}", trigger: "matrix" },

  { options: "mA", replacement: "\\begin{cases}\n$0\n\\end{cases}", trigger: "cases" },
  { options: "mA", replacement: "\\begin{align}\n$0\n\\end{align}", trigger: "align" },
  { options: "mA", replacement: "\\begin{array}\n$0\n\\end{array}", trigger: "array" },

  // Brackets
  { options: "mA", replacement: "\\langle $0 \\rangle $1", trigger: "avg" },
  { options: "mA", priority: 1, replacement: "\\lvert $0 \\rvert $1", trigger: "norm" },
  { options: "mA", priority: 1, replacement: "\\lVert $0 \\rVert $1", trigger: "Norm" },
  { options: "mA", replacement: "\\lceil $0 \\rceil $1", trigger: "ceil" },
  { options: "mA", replacement: "\\lfloor $0 \\rfloor $1", trigger: "floor" },
  { options: "mA", replacement: "|$0|$1", trigger: "mod" },
  { options: "mA", replacement: "(${VISUAL})", trigger: "(" },
  { options: "mA", replacement: "[${VISUAL}]", trigger: "[" },
  { options: "mA", replacement: "{${VISUAL}}", trigger: "{" },
  { options: "mA", replacement: "($0)$1", trigger: "(" },
  { options: "mA", replacement: "{$0}$1", trigger: "{" },
  { options: "mA", replacement: "[$0]$1", trigger: "[" },
  { options: "mA", replacement: "\\left( $0 \\right) $1", trigger: "lr(" },
  { options: "mA", replacement: "\\left\\{ $0 \\right\\} $1", trigger: "lr{" },
  { options: "mA", replacement: "\\left[ $0 \\right] $1", trigger: "lr[" },
  { options: "mA", replacement: "\\left| $0 \\right| $1", trigger: "lrvba" },
  { options: "mA", replacement: "\\left< $0 \\right> $1", trigger: "lra" },
  { options: "mA", replacement: "\\left. $0 \\right) $1", trigger: "l.r)" },
  { options: "mA", replacement: "\\left. $0 \\right] $1", trigger: "l.r]" },
  { options: "mA", replacement: "\\left. $0 \\right\\} $1", trigger: "l.r}" },
  { options: "mA", replacement: "\\left. $0 \\right| $1", trigger: "l.rvba" },
  { options: "mA", replacement: "\\Longleftrightarrow", trigger: "lr=" },
  { options: "mA", replacement: "\\Aboxed{$0}", trigger: "abx" },
  { options: "mA", replacement: "|$0", trigger: "bvar" },

  // Placeholders
  {
    description: "Taylor expansion",
    options: "mA",
    replacement:
      "${0:f}(${1:x} + ${2:h}) = ${0:f}(${1:x}) + ${0:f}'(${1:x})${2:h} + ${0:f}''(${1:x}) \\frac{${2:h}^{2}}{2!} + \\dots$3",
    trigger: "tayl",
  },

  // JS function replacement
  {
    description: "N x N identity matrix",
    options: "rmA",
    replacement: (match: RegExpExecArray) => {
      const n = Number(match[1])
      const arr: number[][] = []
      for (let j = 0; j < n; j += 1) {
        arr[j] = []
        for (let i = 0; i < n; i += 1) {
          arr[j][i] = i === j ? 1 : 0
        }
      }
      const rows = arr.map((el) => el.join(" & ")).join(" \\\\\n")
      return `\\begin{pmatrix}\n${rows}\n\\end{pmatrix}`
    },
    trigger: /iden(\d)/,
  },
]
