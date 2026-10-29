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
 * that has risen to the reading line. The image pane never leaves the screen: a
 * section without pictures (`Termos introduzidos`) keeps the last picture of the
 * section before it, and the intro before the first heading shows the chapter's
 * first picture (`pickPictureSection`).
 *
 * "Which picture" follows the text. A picture placed in the text is a zero-height
 * marker (`PinnedAnchor`) at the spot where it would sit in the normal flow. The
 * pane shows the last picture of the section whose marker has reached the reading
 * line, and the first picture of a section until one has. The arrows step through
 * the section's pictures by hand; the reader's own scrolling takes over again at
 * the next marker. A section without markers falls back to `sectionImages`, the
 * per-section sidecar of older guides.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { ChapterImage, ChapterSection, SectionImages } from "@/lib/content"
import { topLevelSections } from "@/lib/content"
import { cn } from "@/lib/utils"
import {
  pickActiveSection,
  pickImageIndex,
  pickPictureSection,
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
/** `id` is the section whose pictures are shown; it is not always the one being read. */
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
    // A section's pictures are the ones placed in its text, or the sidecar's for an older guide.
    const picturesOf = (sectionId: string): ChapterImage[] =>
      grouped.get(sectionId)?.map((placed) => placed.image) ?? sectionImages[sectionId] ?? []
    const order = units.map((unit) => unit.id)
    const withPictures = new Set(order.filter((sectionId) => picturesOf(sectionId).length > 0))
    const shown = pickPictureSection(order, withPictures, id)
    const own = shown ? picturesOf(shown) : []
    // The section being read shows the picture its text has reached. A section read
    // before it keeps its last picture; the intro shows the first.
    let auto = 0
    if (shown !== null && shown === id) {
      auto = pickImageIndex((grouped.get(shown) ?? []).map((placed) => placed.top), line)
    } else if (shown !== null && id !== null && order.indexOf(shown) < order.indexOf(id)) {
      auto = own.length - 1
    }
    const next: PaneState = { id: shown, images: own, auto }
    setActiveId(id)
    setPane((prev) =>
      prev.id === next.id && prev.auto === next.auto && sameImages(prev.images, next.images)
        ? prev
        : next,
    )
  }, [images, sectionImages, units])

  // Measured before the first paint, so the chapter opens with its picture in place
  // instead of the text jumping when the picture arrives a frame later.
  useLayoutEffect(() => {
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

  // The pane shows the pictures measured above. A hand-picked picture is kept only
  // for the section it was picked in.
  const index =
    manual && manual.id === pane.id ? Math.min(manual.index, pane.images.length - 1) : pane.auto
  const shownUnit = units.find((unit) => unit.id === pane.id)
  const showImage = pane.images.length > 0

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
            className="flex shrink-0 flex-col gap-5 xl:min-h-0 xl:justify-center xl:overflow-y-auto xl:pe-1 no-scrollbar"
            data-slot="pinned-left"
          >
            <PinnedImagePane
              collapsed={collapsed}
              images={pane.images}
              index={index}
              onCollapsedChange={setCollapsed}
              onIndexChange={(next) => setManual({ id: pane.id, index: next })}
              title={shownUnit?.title ?? ""}
            />
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
