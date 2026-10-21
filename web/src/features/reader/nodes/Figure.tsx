/**
 * `img` of a chapter: a figure whose caption is the markdown alt text.
 *
 * Dimensions come from the chapter's image manifest, so the browser reserves the
 * box before the file arrives (`image-dimension`) and the text never jumps;
 * `loading="lazy"` keeps a 40-figure chapter cheap; `srcset` offers the 640
 * variant to a phone. Tapping the figure opens the `Lightbox`, and closing it
 * puts focus back on the figure button (`modal-escape`).
 *
 * An image the manifest does not list still renders — without dimensions — so a
 * build that lagged behind the markdown degrades instead of hiding content.
 */

import { useEffect, useRef, useState } from "react"

import type { ChapterImage } from "@/lib/content"
import { Lightbox } from "../Lightbox"
import type { MdProps } from "./types"

export type ChapterFigureProps = MdProps<"img"> & {
  images?: readonly ChapterImage[]
}

export function ChapterFigure({
  src = "",
  alt = "",
  images = [],
  node: _node,
  ...props
}: ChapterFigureProps) {
  const manifest = images.find((image) => image.src === src)
  const description = alt.trim() === "" ? (manifest?.alt ?? "") : alt
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    // Base UI restores focus on its own; this keeps the guarantee when the dialog
    // unmounts from a route change instead of a user close.
    if (wasOpen.current && !open) trigger.current?.focus()
    wasOpen.current = open
  }, [open])

  if (src === "") return null

  return (
    <figure className="mt-8 first:mt-0" data-slot="chapter-figure">
      <button
        aria-label={`Ampliar figura: ${description}`}
        className="block w-full cursor-zoom-in overflow-hidden rounded-figure border border-border bg-code transition-opacity duration-150 ease-enter hover:opacity-95"
        onClick={() => setOpen(true)}
        ref={trigger}
        type="button"
      >
        <img
          alt={description}
          className="h-auto w-full"
          decoding="async"
          height={manifest?.height ?? undefined}
          loading="lazy"
          sizes="(max-width: 767px) 100vw, 720px"
          src={src}
          srcSet={manifest?.srcset ?? undefined}
          width={manifest?.width ?? undefined}
          {...props}
        />
      </button>

      {description !== "" ? (
        <figcaption className="mt-2 text-caption text-faint">{description}</figcaption>
      ) : null}

      <Lightbox
        alt={description}
        height={manifest?.height ?? null}
        onOpenChange={setOpen}
        open={open}
        original={manifest?.original ?? null}
        src={src}
        srcSet={manifest?.srcset ?? null}
        width={manifest?.width ?? null}
      />
    </figure>
  )
}
