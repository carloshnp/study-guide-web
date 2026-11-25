/**
 * "Criar card" from a selected passage (spec › Creation entry points: both).
 *
 * Two entry points share the same callback: a floating button above the
 * selection and an item in a small selection menu opened with the right button.
 * Both carry the anchor (guide, chapter, section) and the quoted snippet, so the
 * editor opens pre-filled and the card can link back to that paragraph.
 *
 * The menu is ours rather than the browser's native context menu: the native one
 * cannot be extended, and hijacking it would remove Copiar/Pesquisar.
 */

"use client"

import { NotebookPenIcon, PlusIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react"

import type { HighlightColor } from "@/features/highlights/api"
import { cn } from "@/lib/utils"

import { readSelection, sectionIdOf } from "./selection"

const SWATCHES: readonly { color: HighlightColor; label: string; dotClass: string }[] = [
  {
    color: "yellow",
    dotClass: "bg-amber-300 ring-amber-500/40 dark:bg-amber-400/80",
    label: "Destacar em amarelo",
  },
  {
    color: "green",
    dotClass: "bg-emerald-300 ring-emerald-500/40 dark:bg-emerald-400/80",
    label: "Destacar em verde",
  },
  {
    color: "blue",
    dotClass: "bg-sky-300 ring-sky-500/40 dark:bg-sky-400/80",
    label: "Destacar em azul",
  },
  {
    color: "pink",
    dotClass: "bg-pink-300 ring-pink-500/40 dark:bg-pink-400/80",
    label: "Destacar em rosa",
  },
]

export type CardFromSelection = {
  front: string
  sourceSnippet: string
  markdown?: string
  guideId: string
  chapterSlug: string
  sectionId: string | null
}

export type HighlightFromSelection = {
  color: HighlightColor
  range: Range
  sectionId: string | null
}

export type SelectionCardMenuProps = {
  guideId: string
  chapterSlug: string
  /** Chapter sections, so a passage links to its own heading. */
  sections?: readonly { id: string }[]
  onRequestCreate: (input: CardFromSelection) => void
  onRequestQuote?: (input: CardFromSelection) => void
  onRequestHighlight?: (input: HighlightFromSelection) => void
  children: ReactNode
  className?: string
}

type Pending = {
  text: string
  markdown: string
  range: Range
  sectionId: string | null
  left: number
  top: number
}

type Menu = {
  text: string
  markdown: string
  range: Range
  sectionId: string | null
  x: number
  y: number
}

export function SelectionCardMenu({
  guideId,
  chapterSlug,
  sections = [],
  onRequestCreate,
  onRequestQuote,
  onRequestHighlight,
  children,
  className,
}: SelectionCardMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)

  const dismiss = useCallback(() => {
    setPending(null)
    setMenu(null)
  }, [])

  const capture = useCallback(() => {
    const anchor = readSelection(rootRef.current)
    if (!anchor) {
      setPending(null)
      return
    }
    const estimatedWidth = onRequestHighlight ? 380 : 280
    setPending({
      left: Math.min(Math.max(8, anchor.rect.left), Math.max(8, window.innerWidth - estimatedWidth)),
      markdown: anchor.markdown,
      range: anchor.range,
      sectionId: sectionIdOf(anchor.node, rootRef.current, sections),
      text: anchor.text,
      top: Math.max(8, anchor.rect.top - 52),
    })
  }, [onRequestHighlight, sections])

  useEffect(() => {
    const onScroll = () => setPending(null)
    document.addEventListener("mouseup", capture)
    document.addEventListener("keyup", capture)
    document.addEventListener("touchend", capture)
    window.addEventListener("scroll", onScroll, true)
    return () => {
      document.removeEventListener("mouseup", capture)
      document.removeEventListener("keyup", capture)
      document.removeEventListener("touchend", capture)
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [capture])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [menu])

  const clearNativeSelection = () => {
    window.getSelection()?.removeAllRanges()
  }

  const request = (text: string, sectionId: string | null) => {
    onRequestCreate({ chapterSlug, front: text, guideId, sectionId, sourceSnippet: text })
    clearNativeSelection()
    dismiss()
  }

  const requestQuote = (text: string, markdown: string, sectionId: string | null) => {
    onRequestQuote?.({
      chapterSlug,
      front: text,
      guideId,
      markdown,
      sectionId,
      sourceSnippet: text,
    })
    clearNativeSelection()
    dismiss()
  }

  const requestHighlight = (color: HighlightColor, range: Range, sectionId: string | null) => {
    onRequestHighlight?.({ color, range, sectionId })
    clearNativeSelection()
    dismiss()
  }

  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = readSelection(rootRef.current)
    if (!anchor) return
    event.preventDefault()
    setPending(null)
    setMenu({
      markdown: anchor.markdown,
      range: anchor.range,
      sectionId: sectionIdOf(anchor.node, rootRef.current, sections),
      text: anchor.text,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") dismiss()
  }

  return (
    <div
      className={cn("relative", className)}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      ref={rootRef}
    >
      {children}

      {pending ? (
        <div
          className="fixed z-[var(--z-toast)] inline-flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-pop"
          data-slot="selection-actions"
          style={{ left: pending.left, top: pending.top }}
        >
          {onRequestHighlight ? (
            <>
              <div
                aria-label="Cores de destaque"
                className="inline-flex items-center gap-1 px-1"
                data-slot="selection-highlights"
                role="group"
              >
                {SWATCHES.map((swatch) => (
                  <button
                    aria-label={swatch.label}
                    className="inline-flex size-7 items-center justify-center rounded-full transition-transform duration-150 ease-enter hover:scale-110 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    data-highlight-color={swatch.color}
                    key={swatch.color}
                    onClick={() => requestHighlight(swatch.color, pending.range, pending.sectionId)}
                    onMouseDown={(event) => event.preventDefault()}
                    title={swatch.label}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn("size-4 rounded-full ring-1", swatch.dotClass)}
                    />
                  </button>
                ))}
              </div>
              <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
            </>
          ) : null}
          <button
            aria-label={`Criar card a partir de: ${pending.text.slice(0, 60)}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-brand px-2.5 text-meta font-semibold text-primary-foreground transition-colors duration-150 ease-enter hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            data-slot="selection-create"
            onClick={() => request(pending.text, pending.sectionId)}
            // mousedown would clear the native selection before click runs.
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            Criar card
          </button>
          {onRequestQuote ? (
            <button
              aria-label={`Citar nas notas: ${pending.text.slice(0, 60)}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-meta font-medium text-foreground transition-colors duration-150 ease-enter hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              data-slot="selection-quote"
              onClick={() => requestQuote(pending.text, pending.markdown, pending.sectionId)}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <NotebookPenIcon aria-hidden="true" className="size-4" />
              Citar nas notas
            </button>
          ) : null}
        </div>
      ) : null}

      {menu ? (
        <div
          aria-label="Menu da seleção"
          className="fixed z-[var(--z-toast)] min-w-44 rounded-lg border border-border bg-popover p-1 shadow-pop"
          onMouseDown={(event) => event.stopPropagation()}
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          {onRequestHighlight ? (
            <div className="mb-1 flex items-center justify-between gap-1 border-b border-border px-2 py-1.5">
              <span className="text-caption font-medium text-muted-foreground">Destacar</span>
              <div className="flex items-center gap-1">
                {SWATCHES.map((swatch) => (
                  <button
                    aria-label={swatch.label}
                    className="inline-flex size-7 items-center justify-center rounded-full hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    data-highlight-color={swatch.color}
                    key={swatch.color}
                    onClick={() => requestHighlight(swatch.color, menu.range, menu.sectionId)}
                    role="menuitem"
                    title={swatch.label}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn("size-4 rounded-full ring-1", swatch.dotClass)}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button
            className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-start text-meta text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => request(menu.text, menu.sectionId)}
            role="menuitem"
            type="button"
          >
            <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
            Criar card
          </button>
          {onRequestQuote ? (
            <button
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-start text-meta text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => requestQuote(menu.text, menu.markdown, menu.sectionId)}
              role="menuitem"
              type="button"
            >
              <NotebookPenIcon aria-hidden="true" className="size-4 shrink-0" />
              Citar nas notas
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
