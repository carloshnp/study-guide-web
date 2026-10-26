/**
 * The pinned picture of the section being read.
 *
 * A 16:9 frame (the generated images are all 16:9) with the picture inside it,
 * `object-contain` so a taller or wider file is never cropped. Tapping the
 * picture opens the lightbox, which is where the small print of an infographic is
 * actually read on a phone. A section with several pictures gets previous/next
 * buttons and a "1 / 2" counter in the bar next to the picture; with one picture
 * they are not rendered. Below `xl` the pane can be folded to a one-line bar to give the text
 * the whole screen.
 */

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { ChapterImage } from "@/lib/content"
import { cn } from "@/lib/utils"
import { Lightbox } from "../Lightbox"

export const PINNED_IMAGE_SIZES = "(min-width: 1280px) 56vw, 100vw"

export type PinnedImagePaneProps = {
  /** Section title, e.g. "3.2 Os quatro diagramas de fase". */
  title: string
  images: readonly ChapterImage[]
  index: number
  onIndexChange: (index: number) => void
  /** Folded state; only honoured below `xl`, the side-by-side layout never folds. */
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  className?: string
}

export function PinnedImagePane({
  title,
  images,
  index,
  onIndexChange,
  collapsed,
  onCollapsedChange,
  className,
}: PinnedImagePaneProps) {
  const [open, setOpen] = useState(false)
  const count = images.length
  const current = images[Math.min(index, count - 1)]
  if (!current) return null

  const position = Math.min(index, count - 1)
  const many = count > 1

  return (
    <section
      aria-label="Imagem do subcapítulo"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      data-slot="pinned-image-pane"
    >
      {/* One bar: above the picture on a phone, under it beside the text. The
          step buttons live here, not over the picture, so they never hide the
          small print of an infographic. */}
      <div
        className="order-first flex min-h-11 items-center justify-between gap-2 xl:order-last xl:min-h-0"
        data-slot="pinned-image-bar"
      >
        <p className="min-w-0 flex-1 truncate text-meta font-semibold text-foreground xl:whitespace-normal">
          {title}
        </p>

        {many ? (
          <div className="flex shrink-0 items-center gap-1" data-slot="pinned-image-steps">
            <Button
              aria-label="Imagem anterior"
              disabled={position === 0}
              onClick={() => onIndexChange(position - 1)}
              size="icon-xl"
              type="button"
              variant="outline"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <span
              aria-live="polite"
              className="min-w-12 text-center text-meta font-semibold tabular-nums text-foreground"
            >
              {`${position + 1} / ${count}`}
            </span>
            <Button
              aria-label="Próxima imagem"
              disabled={position === count - 1}
              onClick={() => onIndexChange(position + 1)}
              size="icon-xl"
              type="button"
              variant="outline"
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        ) : null}

        <Button
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Mostrar imagem" : "Recolher imagem"}
          className="shrink-0 xl:hidden"
          onClick={() => onCollapsedChange(!collapsed)}
          size="icon-xl"
          type="button"
          variant="ghost"
        >
          {collapsed ? <ChevronDownIcon aria-hidden="true" /> : <ChevronUpIcon aria-hidden="true" />}
        </Button>
      </div>

      <div className={cn(collapsed && "max-xl:hidden")} data-slot="pinned-image-frame">
        <div className="relative mx-auto aspect-video max-h-[34dvh] w-full overflow-hidden rounded-figure border border-border bg-code xl:max-h-none">
          <button
            aria-label={`Ampliar imagem: ${current.alt}`}
            className="block size-full cursor-zoom-in"
            onClick={() => setOpen(true)}
            type="button"
          >
            <img
              alt={current.alt}
              className="size-full object-contain"
              decoding="async"
              height={current.height ?? undefined}
              key={current.src}
              sizes={PINNED_IMAGE_SIZES}
              src={current.src}
              srcSet={current.srcset ?? undefined}
              width={current.width ?? undefined}
            />
          </button>
        </div>
      </div>

      <Lightbox
        alt={current.alt}
        height={current.height}
        onOpenChange={setOpen}
        open={open}
        original={current.original}
        src={current.src}
        srcSet={current.srcset}
        width={current.width}
      />
    </section>
  )
}
