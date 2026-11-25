/**
 * Non-destructive colored study-guide highlighter using the CSS Custom Highlight API.
 *
 * Wraps the chapter reader body via `SelectionCardMenu`, paints persisted highlights
 * into `CSS.highlights` (`hl-yellow`, `hl-green`, `hl-blue`, `hl-pink`) without
 * mutating React's DOM, and opens a compact click popover to recolor or remove any
 * highlight in one click.
 */

"use client"

import { CheckIcon, Trash2Icon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react"

import {
  SelectionCardMenu,
  type CardFromSelection,
  type HighlightFromSelection,
} from "@/features/flashcards/source-create/SelectionCardMenu"
import { cn } from "@/lib/utils"

import {
  HIGHLIGHT_COLORS,
  highlightsApi,
  type Highlight as StudyHighlight,
  type HighlightColor,
  type HighlightVariant,
} from "./api"

const CONTEXT_CHARS = 32
const HIT_TOLERANCE_PX = 2

const COLOR_META: Record<
  HighlightColor,
  { label: string; dotClass: string; changeLabel: string }
> = {
  yellow: {
    changeLabel: "Mudar para amarelo",
    dotClass: "bg-amber-300 ring-amber-500/40 dark:bg-amber-400/80",
    label: "Amarelo",
  },
  green: {
    changeLabel: "Mudar para verde",
    dotClass: "bg-emerald-300 ring-emerald-500/40 dark:bg-emerald-400/80",
    label: "Verde",
  },
  blue: {
    changeLabel: "Mudar para azul",
    dotClass: "bg-sky-300 ring-sky-500/40 dark:bg-sky-400/80",
    label: "Azul",
  },
  pink: {
    changeLabel: "Mudar para rosa",
    dotClass: "bg-pink-300 ring-pink-500/40 dark:bg-pink-400/80",
    label: "Rosa",
  },
}

const SKIP_ANCESTOR_SELECTOR = [
  ".katex-mathml",
  '[data-slot="selection-actions"]',
  '[data-slot="highlight-popover"]',
  '[role="menu"]',
  "script",
  "style",
  "noscript",
].join(", ")

const INTERACTIVE_CLICK_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  '[data-slot="highlight-popover"]',
  '[data-slot="selection-actions"]',
  '[role="menu"]',
].join(", ")

type CustomHighlightCtor = new (...ranges: AbstractRange[]) => Set<AbstractRange>
type CustomHighlightRegistry = Map<string, Set<AbstractRange>>

type TextSegment = {
  node: Text
  start: number
  end: number
}

type TextIndex = {
  fullText: string
  segments: TextSegment[]
}

type ResolvedEntry = {
  highlight: StudyHighlight
  range: Range
}

type PopoverState = {
  highlight: StudyHighlight
  left: number
  top: number
}

export type HighlightLayerProps = {
  guideId: string
  chapterId: string
  variant: HighlightVariant
  /** Changes when the chapter markdown body mounts or swaps (e.g. full ↔ resumo). */
  contentKey: string
  sections?: readonly { id: string }[]
  onRequestCreateCard: (input: CardFromSelection) => void
  onRequestQuote?: (input: CardFromSelection) => void
  children: ReactNode
  className?: string
}

function getCustomHighlightApi(): {
  HighlightCtor: CustomHighlightCtor
  registry: CustomHighlightRegistry
} | null {
  if (typeof window === "undefined" || typeof CSS === "undefined") return null
  const registry = (CSS as unknown as { highlights?: CustomHighlightRegistry }).highlights
  const HighlightCtor = (window as unknown as { Highlight?: CustomHighlightCtor }).Highlight
  if (!registry || typeof HighlightCtor !== "function") return null
  return { HighlightCtor, registry }
}

function clearPaintedHighlights() {
  const api = getCustomHighlightApi()
  if (!api) return
  for (const color of HIGHLIGHT_COLORS) {
    api.registry.delete(`hl-${color}`)
  }
}

function collectTextIndex(root: HTMLElement): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.closest(SKIP_ANCESTOR_SELECTOR)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const segments: TextSegment[] = []
  const chunks: string[] = []
  let offset = 0
  let current = walker.nextNode()
  while (current) {
    const textNode = current as Text
    const len = textNode.data.length
    if (len > 0) {
      segments.push({ end: offset + len, node: textNode, start: offset })
      chunks.push(textNode.data)
      offset += len
    }
    current = walker.nextNode()
  }

  return { fullText: chunks.join(""), segments }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function captureRangeAnchor(
  root: HTMLElement,
  range: Range,
): { exact: string; prefix: string; suffix: string; startOffset: number; endOffset: number } | null {
  const { fullText, segments } = collectTextIndex(root)
  if (segments.length === 0) return null

  let startOffset: number | null = null
  let endOffset: number | null = null

  if (
    range.startContainer === range.endContainer &&
    range.startContainer.nodeType === Node.TEXT_NODE
  ) {
    const seg = segments.find((item) => item.node === range.startContainer)
    if (seg) {
      const localStart = clamp(range.startOffset, 0, seg.node.data.length)
      const localEnd = clamp(range.endOffset, 0, seg.node.data.length)
      startOffset = seg.start + Math.min(localStart, localEnd)
      endOffset = seg.start + Math.max(localStart, localEnd)
    }
  }

  if (startOffset === null || endOffset === null) {
    try {
      const rangeStart = document.createRange()
      rangeStart.setStart(range.startContainer, range.startOffset)
      rangeStart.collapse(true)

      const rangeEnd = document.createRange()
      rangeEnd.setStart(range.endContainer, range.endOffset)
      rangeEnd.collapse(true)

      const segStart = document.createRange()
      const segEnd = document.createRange()

      for (const seg of segments) {
        segEnd.setStart(seg.node, seg.node.data.length)
        segEnd.collapse(true)
        if (segEnd.compareBoundaryPoints(Range.START_TO_START, rangeStart) <= 0) continue

        segStart.setStart(seg.node, 0)
        segStart.collapse(true)
        if (segStart.compareBoundaryPoints(Range.START_TO_START, rangeEnd) >= 0) break

        const localStart =
          range.startContainer === seg.node ? clamp(range.startOffset, 0, seg.node.data.length) : 0
        const localEnd =
          range.endContainer === seg.node
            ? clamp(range.endOffset, 0, seg.node.data.length)
            : seg.node.data.length

        if (startOffset === null) startOffset = seg.start + localStart
        endOffset = seg.start + localEnd
      }
    } catch {
      return null
    }
  }

  if (startOffset === null || endOffset === null || endOffset <= startOffset) return null

  const exact = fullText.slice(startOffset, endOffset)
  if (!exact.trim()) return null

  const prefix = fullText.slice(Math.max(0, startOffset - CONTEXT_CHARS), startOffset)
  const suffix = fullText.slice(endOffset, Math.min(fullText.length, endOffset + CONTEXT_CHARS))
  return { endOffset, exact, prefix, startOffset, suffix }
}

function locateInSegments(
  segments: TextSegment[],
  offset: number,
  isEnd: boolean,
): { node: Text; offset: number } | null {
  if (segments.length === 0) return null
  let low = 0
  let high = segments.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    const seg = segments[mid]
    const matches = isEnd
      ? offset > seg.start && offset <= seg.end
      : offset >= seg.start && offset < seg.end
    if (matches) {
      return { node: seg.node, offset: offset - seg.start }
    }
    if (offset < seg.start || (isEnd && offset === seg.start)) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  return null
}

function commonSuffixLen(a: string, b: string): number {
  let count = 0
  let i = a.length - 1
  let j = b.length - 1
  while (i >= 0 && j >= 0 && a.charCodeAt(i) === b.charCodeAt(j)) {
    count += 1
    i -= 1
    j -= 1
  }
  return count
}

function commonPrefixLen(a: string, b: string): number {
  let count = 0
  const max = Math.min(a.length, b.length)
  while (count < max && a.charCodeAt(count) === b.charCodeAt(count)) {
    count += 1
  }
  return count
}

function resolveHighlightOffsets(
  fullText: string,
  highlight: StudyHighlight,
): { start: number; end: number } | null {
  // 1. Fast path: stored offsets still match exact text.
  if (
    highlight.startOffset >= 0 &&
    highlight.endOffset <= fullText.length &&
    fullText.slice(highlight.startOffset, highlight.endOffset) === highlight.exact
  ) {
    return { end: highlight.endOffset, start: highlight.startOffset }
  }

  // 2. TextQuoteSelector fallback: score every occurrence of `exact` by prefix/suffix match
  //    and closeness to the stored offset.
  if (!highlight.exact) return null
  let bestStart = -1
  let bestScore = -1
  let bestDistance = Number.POSITIVE_INFINITY
  let searchFrom = 0

  while (searchFrom <= fullText.length - highlight.exact.length) {
    const idx = fullText.indexOf(highlight.exact, searchFrom)
    if (idx === -1) break

    const before = fullText.slice(Math.max(0, idx - highlight.prefix.length), idx)
    const after = fullText.slice(
      idx + highlight.exact.length,
      idx + highlight.exact.length + highlight.suffix.length,
    )
    const score =
      commonSuffixLen(before, highlight.prefix) + commonPrefixLen(after, highlight.suffix)
    const distance = Math.abs(idx - highlight.startOffset)

    if (score > bestScore || (score === bestScore && distance < bestDistance)) {
      bestScore = score
      bestDistance = distance
      bestStart = idx
    }
    searchFrom = idx + 1
  }

  if (bestStart === -1) return null
  return { end: bestStart + highlight.exact.length, start: bestStart }
}

function resolveHighlightRange(index: TextIndex, highlight: StudyHighlight): Range | null {
  const offsets = resolveHighlightOffsets(index.fullText, highlight)
  if (!offsets) return null
  const startPos = locateInSegments(index.segments, offsets.start, false)
  const endPos = locateInSegments(index.segments, offsets.end, true)
  if (!startPos || !endPos) return null

  try {
    const range = document.createRange()
    range.setStart(startPos.node, startPos.offset)
    range.setEnd(endPos.node, endPos.offset)
    return range
  } catch {
    return null
  }
}

export function HighlightLayer({
  guideId,
  chapterId,
  variant,
  contentKey,
  sections = [],
  onRequestCreateCard,
  onRequestQuote,
  children,
  className,
}: HighlightLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeEntriesRef = useRef<ResolvedEntry[]>([])
  const tempIdRef = useRef(-1)

  const scopeKey = `${guideId}|${chapterId}|${variant}`
  const [highlights, setHighlights] = useState<StudyHighlight[]>([])
  const [popover, setPopover] = useState<(PopoverState & { scopeKey: string }) | null>(null)
  const [errorState, setErrorState] = useState<{ message: string; scopeKey: string } | null>(null)

  const visiblePopover = popover && popover.scopeKey === scopeKey ? popover : null
  const errorMessage = errorState && errorState.scopeKey === scopeKey ? errorState.message : null

  const paintHighlights = useCallback((items: StudyHighlight[]) => {
    const root = containerRef.current
    if (!root) return

    const index = collectTextIndex(root)
    const resolved: ResolvedEntry[] = []
    const byColor: Record<HighlightColor, Range[]> = {
      blue: [],
      green: [],
      pink: [],
      yellow: [],
    }

    for (const item of items) {
      const range = resolveHighlightRange(index, item)
      if (!range) continue
      resolved.push({ highlight: item, range })
      byColor[item.color].push(range)
    }

    activeEntriesRef.current = resolved

    const api = getCustomHighlightApi()
    if (!api) return
    for (const color of HIGHLIGHT_COLORS) {
      const ranges = byColor[color]
      if (ranges.length > 0) {
        api.registry.set(`hl-${color}`, new api.HighlightCtor(...ranges))
      } else {
        api.registry.delete(`hl-${color}`)
      }
    }
  }, [])

  // Fetch highlights whenever the chapter or full/resumo variant changes.
  useEffect(() => {
    let cancelled = false

    highlightsApi
      .listHighlights(guideId, chapterId, variant)
      .then((loaded) => {
        if (!cancelled) setHighlights(loaded)
      })
      .catch(() => {
        if (!cancelled) setHighlights([])
      })

    return () => {
      cancelled = true
    }
  }, [chapterId, guideId, variant])

  // Repaint on highlight state changes or contentKey swaps, and watch for lazy
  // Suspense DOM mounts (MarkdownRenderer loads asynchronously).
  useEffect(() => {
    paintHighlights(highlights)

    const root = containerRef.current
    if (!root || typeof MutationObserver === "undefined") return

    let frame = 0
    const observer = new MutationObserver(() => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        paintHighlights(highlights)
      })
    })
    observer.observe(root, { childList: true, subtree: true })

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [contentKey, highlights, paintHighlights])

  // Never leak highlight ranges across routes when unmounting.
  useEffect(() => () => clearPaintedHighlights(), [])

  // Dismiss popover on outside click, Escape, or scroll.
  useEffect(() => {
    if (!visiblePopover) return
    const onMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-slot="highlight-popover"]')) return
      setPopover(null)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null)
    }
    const onScroll = () => setPopover(null)

    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    window.addEventListener("scroll", onScroll, true)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [visiblePopover])

  const handleCreateHighlight = useCallback(
    (input: HighlightFromSelection) => {
      const root = containerRef.current
      if (!root) return

      const anchor = captureRangeAnchor(root, input.range)
      if (!anchor) return

      const tempId = tempIdRef.current
      tempIdRef.current -= 1
      const now = new Date().toISOString()
      const optimistic: StudyHighlight = {
        chapterId,
        color: input.color,
        createdAt: now,
        endOffset: anchor.endOffset,
        exact: anchor.exact,
        guideId,
        id: tempId,
        prefix: anchor.prefix,
        sectionId: input.sectionId,
        startOffset: anchor.startOffset,
        suffix: anchor.suffix,
        updatedAt: now,
        variant,
      }

      setErrorState(null)
      setHighlights((prev) => [...prev, optimistic])

      highlightsApi
        .createHighlight({
          chapterId,
          color: input.color,
          endOffset: anchor.endOffset,
          exact: anchor.exact,
          guideId,
          prefix: anchor.prefix,
          sectionId: input.sectionId,
          startOffset: anchor.startOffset,
          suffix: anchor.suffix,
          variant,
        })
        .then((saved) => {
          setHighlights((prev) => prev.map((item) => (item.id === tempId ? saved : item)))
        })
        .catch(() => {
          setHighlights((prev) => prev.filter((item) => item.id !== tempId))
          setErrorState({ message: "Não foi possível salvar o destaque.", scopeKey })
        })
    },
    [chapterId, guideId, scopeKey, variant],
  )

  const handleRecolor = useCallback(
    (highlight: StudyHighlight, color: HighlightColor) => {
      if (highlight.color === color) {
        setPopover(null)
        return
      }
      const previousColor = highlight.color
      setErrorState(null)
      setPopover(null)
      setHighlights((prev) =>
        prev.map((item) => (item.id === highlight.id ? { ...item, color } : item)),
      )

      if (highlight.id < 0) return

      highlightsApi
        .updateHighlightColor(highlight.id, color)
        .then((updated) => {
          setHighlights((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        })
        .catch(() => {
          setHighlights((prev) =>
            prev.map((item) =>
              item.id === highlight.id ? { ...item, color: previousColor } : item,
            ),
          )
          setErrorState({ message: "Não foi possível alterar a cor do destaque.", scopeKey })
        })
    },
    [scopeKey],
  )

  const handleDelete = useCallback(
    (highlight: StudyHighlight) => {
      setErrorState(null)
      setPopover(null)
      setHighlights((prev) => prev.filter((item) => item.id !== highlight.id))

      if (highlight.id < 0) return

      highlightsApi.deleteHighlight(highlight.id).catch(() => {
        setHighlights((prev) => [...prev, highlight])
        setErrorState({ message: "Não foi possível remover o destaque.", scopeKey })
      })
    },
    [scopeKey],
  )

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target?.closest(INTERACTIVE_CLICK_SELECTOR)) return

    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) return

    const { clientX, clientY } = event
    const entries = activeEntriesRef.current

    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i]
      const rects = entry.range.getClientRects()
      for (const rect of Array.from(rects)) {
        if (rect.width <= 0 && rect.height <= 0) continue
        if (
          clientX >= rect.left - HIT_TOLERANCE_PX &&
          clientX <= rect.right + HIT_TOLERANCE_PX &&
          clientY >= rect.top - HIT_TOLERANCE_PX &&
          clientY <= rect.bottom + HIT_TOLERANCE_PX
        ) {
          const left = clamp(rect.left + rect.width / 2 - 92, 8, Math.max(8, window.innerWidth - 196))
          const top = rect.top > 60 ? rect.top - 48 : rect.bottom + 8
          setPopover({ highlight: entry.highlight, left, scopeKey, top })
          return
        }
      }
    }
  }

  return (
    <div className={cn("relative", className)} onClick={handleClick} ref={containerRef}>
      <SelectionCardMenu
        chapterSlug={chapterId}
        guideId={guideId}
        onRequestCreate={onRequestCreateCard}
        onRequestHighlight={handleCreateHighlight}
        onRequestQuote={onRequestQuote}
        sections={sections}
      >
        {children}
      </SelectionCardMenu>

      {errorMessage ? (
        <div
          className="fixed bottom-4 left-1/2 z-[var(--z-toast)] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-destructive/40 bg-popover px-3 py-2 text-caption font-medium text-destructive shadow-pop"
          data-slot="highlight-error"
          role="status"
        >
          <span>{errorMessage}</span>
          <button
            className="rounded px-1.5 py-0.5 text-caption text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => setErrorState(null)}
            type="button"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {visiblePopover ? (
        <div
          aria-label="Editar destaque"
          className="fixed z-[var(--z-toast)] inline-flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-pop"
          data-slot="highlight-popover"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
          style={{ left: visiblePopover.left, top: visiblePopover.top }}
        >
          {HIGHLIGHT_COLORS.map((color) => {
            const meta = COLOR_META[color]
            const active = visiblePopover.highlight.color === color
            return (
              <button
                aria-label={meta.changeLabel}
                aria-pressed={active}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full transition-transform duration-150 ease-enter hover:scale-110 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active && "bg-accent",
                )}
                data-highlight-color={color}
                key={color}
                onClick={() => handleRecolor(visiblePopover.highlight, color)}
                title={meta.changeLabel}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-4 items-center justify-center rounded-full ring-1",
                    meta.dotClass,
                  )}
                >
                  {active ? <CheckIcon className="size-2.5 text-foreground" /> : null}
                </span>
              </button>
            )
          })}
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
          <button
            aria-label="Remover destaque"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-enter hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            data-slot="highlight-delete"
            onClick={() => handleDelete(visiblePopover.highlight)}
            title="Remover destaque"
            type="button"
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
