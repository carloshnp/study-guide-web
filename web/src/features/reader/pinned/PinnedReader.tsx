/**
 * The "imagem fixa" reading view of a chapter.
 *
 * Two panes under a compact header. The text pane is the scroller (the page
 * itself never scrolls): the whole chapter, exactly as the classic view renders
 * it, so progress checks, anchors, selection cards and `?snippet=` deep links
 * keep working untouched. The image pane holds one picture of the section the
 * reader is in. From `xl` up the image sits on the left and the text on the
 * right; below that the image sits above the text.
 *
 * "Which section" is decided by `pickActiveSection`: the last top-level heading
 * that has risen to the reading line. The intro before the first heading and any
 * section without a picture (`Termos introduzidos`) hide the image pane and the
 * text takes the full width. Hiding only ever moves the boundary heading further
 * from the reading line (the text above it gets shorter when it widens and
 * taller when it narrows), so the switch cannot oscillate.
 *
 * "Which picture" follows the text. A picture placed in the text is a zero-height
 * marker (`PinnedAnchor`) at the spot where it would sit in the normal flow. The
 * pane shows the last picture of the section whose marker has reached the reading
 * line, and the first picture of a section until one has. The arrows step through
 * the section's pictures by hand; the reader's own scrolling takes over again at
 * the next marker. A section without markers falls back to `sectionImages`, the
 * per-section sidecar of older guides.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import type { ChapterImage, ChapterSection, SectionImages } from "@/lib/content"
import { topLevelSections } from "@/lib/content"
import { cn } from "@/lib/utils"
import {
  pickActiveSection,
  pickImageIndex,
  readingLineOffset,
  type SectionTop,
} from "./active-section"
import { PINNED_IMAGE_SIZES, PinnedImagePane } from "./PinnedImagePane"

export type PinnedReaderProps = {
  sections: readonly ChapterSection[]
  /** Per-section pictures of older guides (the sidecar), keyed by section id. */
  sectionImages: SectionImages
  /** The chapter's picture manifest; a marker in the text is matched against it. */
  images?: readonly ChapterImage[]
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

type Heading = { id: string; el: Element }
type Placed = { top: number; image: ChapterImage }
type PaneState = { id: string | null; images: ChapterImage[]; auto: number }

/** Warm the cache for the picture of the next section so the swap is instant. */
function prefetch(image: ChapterImage | undefined): void {
  if (!image || typeof Image === "undefined") return
  const probe = new Image()
  probe.sizes = PINNED_IMAGE_SIZES
  if (image.srcset) probe.srcset = image.srcset
  probe.src = image.src
}

/** The section a marker belongs to: the last heading before it in document order. */
function ownerOf(marker: Element, headings: readonly Heading[]): string | null {
  let owner: string | null = null
  for (const heading of headings) {
    if (heading.el.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING) {
      owner = heading.id
    } else {
      break
    }
  }
  return owner
}

/** The pictures placed in the text, grouped by the section they sit in. */
function placedPictures(
  pane: HTMLElement,
  headings: readonly Heading[],
  images: readonly ChapterImage[],
  paneTop: number,
): Map<string, Placed[]> {
  const grouped = new Map<string, Placed[]>()
  pane.querySelectorAll<HTMLElement>("[data-pinned-anchor]").forEach((marker) => {
    const owner = ownerOf(marker, headings)
    if (!owner) return
    const src = marker.dataset.src ?? ""
    const image: ChapterImage = images.find((item) => item.src === src) ?? {
      src,
      srcset: null,
      width: null,
      height: null,
      alt: marker.dataset.alt ?? "",
      original: null,
    }
    const list = grouped.get(owner) ?? []
    list.push({ top: marker.getBoundingClientRect().top - paneTop, image })
    grouped.set(owner, list)
  })
  return grouped
}

function sameImages(a: readonly ChapterImage[], b: readonly ChapterImage[]): boolean {
  return a.length === b.length && a.every((item, i) => item.src === b[i].src)
}

export function PinnedReader({
  sections,
  sectionImages,
  images = NO_IMAGES,
  header,
  notice,
  anchor,
  children,
}: PinnedReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const units = useMemo(() => topLevelSections(sections), [sections])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pane, setPane] = useState<PaneState>({ id: null, images: [], auto: 0 })
  const [manual, setManual] = useState<{ id: string | null; index: number } | null>(null)
  const [collapsed, setCollapsed] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-height: 500px)").matches,
  )

  const measure = useCallback(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const paneTop = scroller.getBoundingClientRect().top
    const line = readingLineOffset(scroller.clientHeight)
    const tops: SectionTop[] = []
    const headings: Heading[] = []
    for (const unit of units) {
      const heading = document.getElementById(unit.id)
      if (heading && scroller.contains(heading)) {
        tops.push({ id: unit.id, top: heading.getBoundingClientRect().top - paneTop })
        headings.push({ id: unit.id, el: heading })
      }
    }
    const atBottom =
      scroller.scrollTop > 0 &&
      scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
    const id = pickActiveSection(tops, line, atBottom)
    const grouped = placedPictures(scroller, headings, images, paneTop)
    const own = id ? (grouped.get(id) ?? []) : []
    const next: PaneState = {
      id,
      images: own.map((placed) => placed.image),
      auto: pickImageIndex(
        own.map((placed) => placed.top),
        line,
      ),
    }
    setActiveId(id)
    setPane((prev) =>
      prev.id === next.id && prev.auto === next.auto && sameImages(prev.images, next.images)
        ? prev
        : next,
    )
  }, [images, units])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    let frame = 0
    const schedule = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
    scroller.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    // The markdown renderer is lazy and figures load late: any change of the
    // text's height can move a heading or a picture across the reading line.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule)
    if (observer && contentRef.current) observer.observe(contentRef.current)
    measure()
    return () => {
      scroller.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      observer?.disconnect()
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [measure])

  // A deep link places its heading at the top of the pane. The text renders
  // lazily, so the heading keeps moving down as figures load: re-place it on
  // every layout change until the reader scrolls or the layout has settled.
  useEffect(() => {
    const scroller = scrollRef.current
    const content = contentRef.current
    if (!scroller || !content || !anchor) return
    let released = false
    const place = () => {
      if (released) return
      const heading = document.getElementById(anchor)
      if (!heading || !scroller.contains(heading)) return
      const offset = heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      if (Math.abs(offset) > 0.5) {
        scroller.scrollTop += offset
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
      for (const name of ANCHOR_RELEASE_EVENTS) scroller.removeEventListener(name, release)
    }
    timer = window.setTimeout(release, ANCHOR_SETTLE_MS)
    for (const name of ANCHOR_RELEASE_EVENTS) scroller.addEventListener(name, release, { passive: true })
    place()
    return release
  }, [anchor, measure])

  // A hand-picked picture lasts until the reader's scrolling changes the picture
  // of the section again, or the reader leaves the section.
  useEffect(() => {
    setManual(null)
  }, [pane.id, pane.auto])

  // The pictures of the section being read: the ones placed in its text, or the
  // sidecar's for an older guide. Pane state only counts for the section it was
  // measured in, so a section change never shows the previous one's picture.
  const measured = pane.id === activeId ? pane.images : NO_IMAGES
  const paneImages =
    measured.length > 0
      ? measured
      : ((activeId ? sectionImages[activeId] : undefined) ?? NO_IMAGES)
  const automatic = measured.length > 0 && pane.id === activeId ? pane.auto : 0
  const index =
    manual && manual.id === activeId
      ? Math.min(manual.index, paneImages.length - 1)
      : automatic
  const activeUnit = units.find((unit) => unit.id === activeId)
  const showImage = paneImages.length > 0

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
              images={paneImages}
              index={index}
              onCollapsedChange={setCollapsed}
              onIndexChange={(next) => setManual({ id: activeId, index: next })}
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
