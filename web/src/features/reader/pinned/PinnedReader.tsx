/**
 * The "imagem fixa" reading view of a chapter.
 *
 * Two panes under a compact header. The text pane is the scroller (the page
 * itself never scrolls): the whole chapter, exactly as the classic view renders
 * it, so progress checks, anchors, selection cards and `?snippet=` deep links
 * keep working untouched. The image pane holds the picture of the section the
 * reader is in; it changes as the text scrolls. From `xl` up the image sits on
 * the left and the text on the right; below that the image sits above the text.
 *
 * "Which section" is decided by `pickActiveSection`: the last top-level heading
 * that has risen to the reading line. The intro before the first heading and any
 * section without a picture (`Termos introduzidos`) hide the image pane and the
 * text takes the full width. Hiding only ever moves the boundary heading further
 * from the reading line (the text above it gets shorter when it widens and
 * taller when it narrows), so the switch cannot oscillate.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import type { ChapterImage, ChapterSection, SectionImages } from "@/lib/content"
import { topLevelSections } from "@/lib/content"
import { cn } from "@/lib/utils"
import { pickActiveSection, readingLineOffset, type SectionTop } from "./active-section"
import { PINNED_IMAGE_SIZES, PinnedImagePane } from "./PinnedImagePane"

export type PinnedReaderProps = {
  sections: readonly ChapterSection[]
  sectionImages: SectionImages
  /** Compact chapter header (back link, kicker, title). */
  header: ReactNode
  /** Optional status line between the header and the panes. */
  notice?: ReactNode
  /**
   * The `#id` of a deep link. Opening the chapter there puts that section's
   * heading at the top of the text pane.
   */
  anchor?: string | null
  /** The chapter article. */
  children: ReactNode
}

const NO_IMAGES: readonly ChapterImage[] = []

/**
 * How long a deep link keeps the heading in place while the layout settles.
 * Figures and the markdown renderer load late and push the heading down; after
 * this long, or as soon as the reader scrolls, the pane belongs to the reader.
 */
const ANCHOR_SETTLE_MS = 5000
const ANCHOR_RELEASE_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"] as const

/** Warm the cache for the picture of the next section so the swap is instant. */
function prefetch(image: ChapterImage | undefined): void {
  if (!image || typeof Image === "undefined") return
  const probe = new Image()
  probe.sizes = PINNED_IMAGE_SIZES
  if (image.srcset) probe.srcset = image.srcset
  probe.src = image.src
}

export function PinnedReader({
  sections,
  sectionImages,
  header,
  notice,
  anchor,
  children,
}: PinnedReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const units = useMemo(() => topLevelSections(sections), [sections])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [step, setStep] = useState<{ id: string | null; index: number }>({ id: null, index: 0 })
  const [collapsed, setCollapsed] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-height: 500px)").matches,
  )

  const measure = useCallback(() => {
    const pane = scrollRef.current
    if (!pane) return
    const paneTop = pane.getBoundingClientRect().top
    const tops: SectionTop[] = []
    for (const unit of units) {
      const heading = document.getElementById(unit.id)
      if (heading && pane.contains(heading)) {
        tops.push({ id: unit.id, top: heading.getBoundingClientRect().top - paneTop })
      }
    }
    const atBottom =
      pane.scrollTop > 0 && pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2
    setActiveId(pickActiveSection(tops, readingLineOffset(pane.clientHeight), atBottom))
  }, [units])

  useEffect(() => {
    const pane = scrollRef.current
    if (!pane) return
    let frame = 0
    const schedule = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
    pane.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    // The markdown renderer is lazy and figures load late: any change of the
    // text's height can move a heading across the reading line.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule)
    if (observer && contentRef.current) observer.observe(contentRef.current)
    measure()
    return () => {
      pane.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      observer?.disconnect()
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [measure])

  // A deep link places its heading at the top of the pane. The text renders
  // lazily, so the heading keeps moving down as figures load: re-place it on
  // every layout change until the reader scrolls or the layout has settled.
  useEffect(() => {
    const pane = scrollRef.current
    const content = contentRef.current
    if (!pane || !content || !anchor) return
    let released = false
    const place = () => {
      if (released) return
      const heading = document.getElementById(anchor)
      if (!heading || !pane.contains(heading)) return
      const offset = heading.getBoundingClientRect().top - pane.getBoundingClientRect().top
      if (Math.abs(offset) > 0.5) {
        pane.scrollTop += offset
        measure()
      }
    }
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place)
    observer?.observe(content)
    let timer = 0
    const release = () => {
      released = true
      window.clearTimeout(timer)
      observer?.disconnect()
      for (const name of ANCHOR_RELEASE_EVENTS) pane.removeEventListener(name, release)
    }
    timer = window.setTimeout(release, ANCHOR_SETTLE_MS)
    for (const name of ANCHOR_RELEASE_EVENTS) pane.addEventListener(name, release, { passive: true })
    place()
    return release
  }, [anchor, measure])

  const images = (activeId ? sectionImages[activeId] : undefined) ?? NO_IMAGES
  const activeUnit = units.find((unit) => unit.id === activeId)
  // The picture counter starts over whenever the reader moves to another section.
  if (step.id !== activeId) setStep({ id: activeId, index: 0 })
  const index = step.id === activeId ? step.index : 0
  const showImage = images.length > 0

  useEffect(() => {
    if (!activeId) return
    const at = units.findIndex((unit) => unit.id === activeId)
    for (const unit of units.slice(at + 1, at + 3)) prefetch(sectionImages[unit.id]?.[0])
  }, [activeId, sectionImages, units])

  return (
    <div
      className="flex min-h-0 flex-col gap-2 xl:gap-3"
      data-active-section={activeId ?? ""}
      data-slot="pinned-reader"
    >
      {header}
      {notice}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 xl:grid xl:gap-8",
          showImage ? "xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : "xl:grid-cols-1",
        )}
      >
        {showImage ? (
          <aside
            className="flex shrink-0 flex-col gap-5 xl:min-h-0 xl:overflow-y-auto xl:pe-1 no-scrollbar"
            data-slot="pinned-left"
          >
            <PinnedImagePane
              collapsed={collapsed}
              images={images}
              index={index}
              onCollapsedChange={setCollapsed}
              onIndexChange={(next) => setStep({ id: activeId, index: next })}
              title={activeUnit?.title ?? ""}
            />

            {units.length > 1 ? (
              <nav
                aria-label="Subcapítulos deste capítulo"
                className="hidden flex-col gap-0.5 xl:flex"
                data-slot="pinned-units"
              >
                <p className="text-kicker uppercase text-muted-foreground">Neste capítulo</p>
                <ol className="flex flex-col gap-0.5">
                  {units.map((unit) => (
                    <li key={unit.id}>
                      <a
                        aria-current={unit.id === activeId ? "location" : undefined}
                        className={cn(
                          "flex min-h-8 items-start rounded-md px-2 py-1 text-meta hover:text-brand",
                          unit.id === activeId
                            ? "bg-accent font-semibold text-foreground"
                            : "text-muted-foreground",
                        )}
                        href={`#${unit.id}`}
                      >
                        {unit.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
          </aside>
        ) : null}

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar md:px-8"
          data-slot="pinned-text"
          ref={scrollRef}
          tabIndex={-1}
        >
          <div
            className="mx-auto w-full max-w-[var(--measure)] pb-24"
            data-slot="chapter-body"
            ref={contentRef}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
