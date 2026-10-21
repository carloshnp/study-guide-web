/**
 * Lightbox for one figure: the 1280 variant scaled up, plus a link to the
 * untouched original.
 *
 * coss `Dialog` supplies the modal behaviour the design system asks for: `Esc`
 * closes, focus is trapped inside while open and returned to the figure when it
 * closes (`modal-escape`). Zoom is explicit — buttons instead of a gesture-only
 * affordance (`hover-vs-tap`) — and the image scales inside a scroll container so
 * a zoomed figure can be panned without moving the page.
 */

import { ExternalLinkIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react"
import { useState } from "react"

import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const ZOOM_STEPS = [1, 1.5, 2, 3] as const

export type LightboxProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  srcSet?: string | null
  alt: string
  width?: number | null
  height?: number | null
  original?: string | null
}

export function Lightbox({
  open,
  onOpenChange,
  src,
  srcSet,
  alt,
  width,
  height,
  original,
}: LightboxProps) {
  const [step, setStep] = useState(0)
  const scale = ZOOM_STEPS[step]

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setStep(0)
        onOpenChange(next)
      }}
    >
      <DialogPopup
        className="max-w-5xl gap-0 overflow-hidden bg-background p-0"
        closeProps={{ "aria-label": "Fechar imagem" }}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>

        <div className="max-h-[76dvh] overflow-auto bg-code p-2">
          <img
            alt={alt}
            className="mx-auto h-auto max-w-none rounded-figure"
            data-zoom={String(scale)}
            decoding="async"
            height={height ?? undefined}
            src={src}
            srcSet={srcSet ?? undefined}
            style={{ width: `${scale * 100}%` }}
            width={width ?? undefined}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              aria-label="Reduzir zoom"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ZoomOutIcon aria-hidden="true" />
            </Button>
            <span className="min-w-10 text-center text-meta tabular-nums text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
            <Button
              aria-label="Aumentar zoom"
              disabled={step === ZOOM_STEPS.length - 1}
              onClick={() => setStep((current) => Math.min(ZOOM_STEPS.length - 1, current + 1))}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ZoomInIcon aria-hidden="true" />
            </Button>
            <Button
              aria-label="Tamanho original"
              onClick={() => setStep(0)}
              size="xs"
              type="button"
              variant="ghost"
            >
              {width && height ? `${width}×${height}` : "100%"}
            </Button>
          </div>

          {original ? (
            <a
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-meta font-semibold text-brand underline-offset-4 hover:underline"
              href={original}
              rel="noreferrer noopener"
              target="_blank"
            >
              Abrir imagem original
              <ExternalLinkIcon aria-hidden="true" className="size-4" />
            </a>
          ) : null}
        </div>
      </DialogPopup>
    </Dialog>
  )
}
