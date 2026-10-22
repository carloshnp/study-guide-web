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

import { PlusIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

import { readSelection, sectionIdOf } from "./selection"

export type CardFromSelection = {
  front: string
  sourceSnippet: string
  guideId: string
  chapterSlug: string
  sectionId: string | null
}

export type SelectionCardMenuProps = {
  guideId: string
  chapterSlug: string
  /** Chapter sections, so a passage links to its own heading. */
  sections?: readonly { id: string }[]
  onRequestCreate: (input: CardFromSelection) => void
  children: ReactNode
  className?: string
}

type Pending = {
  text: string
  sectionId: string | null
  left: number
  top: number
}

type Menu = {
  text: string
  sectionId: string | null
  x: number
  y: number
}

export function SelectionCardMenu({
  guideId,
  chapterSlug,
  sections = [],
  onRequestCreate,
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
    setPending({
      left: Math.min(Math.max(8, anchor.rect.left), Math.max(8, window.innerWidth - 168)),
      sectionId: sectionIdOf(anchor.node, rootRef.current, sections),
      text: anchor.text,
      top: Math.max(8, anchor.rect.top - 52),
    })
  }, [sections])

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

  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = readSelection(rootRef.current)
    if (!anchor) return
    event.preventDefault()
    setPending(null)
    setMenu({
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
        <button
          aria-label={`Criar card a partir de: ${pending.text.slice(0, 60)}`}
          className="fixed z-[var(--z-toast)] inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-brand bg-brand px-3 text-meta font-semibold text-primary-foreground shadow-pop transition-colors duration-150 ease-enter hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          data-slot="selection-create"
          onClick={() => request(pending.text, pending.sectionId)}
          // mousedown would clear the native selection before click runs.
          onMouseDown={(event) => event.preventDefault()}
          style={{ left: pending.left, top: pending.top }}
          type="button"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          Criar card
        </button>
      ) : null}

      {menu ? (
        <div
          aria-label="Menu da seleção"
          className="fixed z-[var(--z-toast)] min-w-44 rounded-lg border border-border bg-popover p-1 shadow-pop"
          onMouseDown={(event) => event.stopPropagation()}
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-start text-meta text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => request(menu.text, menu.sectionId)}
            role="menuitem"
            type="button"
          >
            <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
            Criar card
          </button>
        </div>
      ) : null}
    </div>
  )
}
