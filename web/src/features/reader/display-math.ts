/**
 * Makes `$$…$$` math render as *display* math.
 *
 * Two shapes need work:
 *
 *  1. `$$x$$` on a single line. `remark-math` reads it as inline math with a
 *     doubled delimiter, so the formula keeps `displaystyle: false` and never
 *     gets the scrollable block the reader promises (MASTER.md › Reading
 *     elements › Math).
 *  2. A block whose delimiters share a line with the formula:
 *     `$$\begin{align}` … `\end{align}$$`. micromark's math flow only closes on
 *     a line that is *just* `$$`, so that closer was ignored and every heading
 *     after it disappeared inside one huge math node (KaTeX then painted the
 *     rest of the chapter as a `katex-error` span).
 *
 * Both are rewritten into the three-line flow form (`$$` / body / `$$`). Nothing
 * inside a fence is touched — there `$$` is code, not math — and a line with text
 * around the delimiters is left alone because it really is inline math.
 */

const FENCE_OPEN = /^[ \t]*(```|~~~)/
const SOLE_DISPLAY_MATH = /^[ \t]*\$\$(.+?)\$\$[ \t]*$/

export function normalizeDisplayMath(markdown: string): string {
  let fenced = false
  let display = false
  const out: string[] = []

  for (const line of markdown.split("\n")) {
    if (FENCE_OPEN.test(line)) {
      fenced = !fenced
      out.push(line)
      continue
    }
    if (fenced) {
      out.push(line)
      continue
    }

    const trimmed = line.trim()

    if (!display) {
      if (trimmed === "$$") {
        display = true
        out.push(line)
        continue
      }

      if (trimmed.startsWith("$$")) {
        const oneLine = SOLE_DISPLAY_MATH.exec(line)
        if (oneLine) {
          const body = oneLine[1].trim()
          // `$$a$$ and $$b$$` is two inline formulas, not one display block.
          if (body !== "" && !body.includes("$$")) {
            out.push("$$", body, "$$")
            continue
          }
          out.push(line)
          continue
        }

        // `$$\begin{align}`: opener carrying the first line of the formula.
        const rest = trimmed.slice(2)
        if (rest !== "" && !rest.includes("$$")) {
          out.push("$$", rest)
          display = true
          continue
        }
        out.push(line)
        continue
      }

      out.push(line)
      continue
    }

    if (trimmed === "$$") {
      display = false
      out.push(line)
      continue
    }

    // `\end{align}$$`: closer carrying the last line of the formula.
    if (trimmed.endsWith("$$") && !trimmed.startsWith("$$")) {
      const body = trimmed.slice(0, -2)
      if (body.trim() !== "") out.push(body)
      out.push("$$")
      display = false
      continue
    }

    out.push(line)
  }

  return out.join("\n")
}
