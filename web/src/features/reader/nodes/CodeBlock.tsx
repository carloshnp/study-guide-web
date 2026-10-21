/**
 * Fenced code: caption row with the language, a 44px copy button, and the
 * highlighted body scrolling inside its own box (`horizontal-scroll`).
 *
 * The text that reaches the clipboard is the fence source, not the highlighted
 * markup, so it is read from the hast node (`textOfNode`) rather than from the
 * rendered spans. Copying is best-effort: a browser without a clipboard API or a
 * denied permission leaves the button as it was instead of throwing.
 */

import { CheckIcon, CopyIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { firstChildWithTag, languageOf, textOfNode } from "../hast"
import type { MdProps } from "./types"

export function CodeBlock({ node, children }: MdProps<"pre">) {
  const codeNode = firstChildWithTag(node, "code")
  const language = languageOf(codeNode) ?? languageOf(node)
  const source = textOfNode(codeNode ?? node).replace(/\n$/, "")

  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source)
    } catch {
      return
    }

    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <figure
      className="mt-6 overflow-hidden rounded-code border border-border bg-code"
      data-slot="code-block"
    >
      <figcaption className="flex items-center justify-between gap-2 border-b border-border px-3">
        <span className="text-kicker uppercase text-muted-foreground">
          {language ?? "texto"}
        </span>
        <Button
          aria-label={copied ? "Código copiado" : "Copiar código"}
          className="size-11 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => {
            void copy()
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          {copied ? (
            <CheckIcon aria-hidden="true" className="text-success" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
        </Button>
      </figcaption>
      {copied ? (
        <span aria-live="polite" className="sr-only" role="status">
          Código copiado para a área de transferência.
        </span>
      ) : null}
      <div className="overflow-x-auto px-4 py-3">
        <pre className="m-0 w-max min-w-full font-mono text-[13px] leading-[1.6]">{children}</pre>
      </div>
    </figure>
  )
}
