/**
 * The check that sits beside a heading (h2/h3/h4) in the reader.
 *
 * Two states only, matching MASTER.md › Progress UI: `done` (the checkbox) and
 * `review` (the flag). They are mutually exclusive; clearing the active one
 * writes `absent`, which deletes the row server-side.
 *
 * Placement: render this as the first child of a `relative` wrapper around the
 * heading. Below `md` it is an in-flow row at least 44px tall above the heading;
 * from `md` up it is taken out of flow into the 20px gutter to the left of the
 * heading (`md:-start-7` = 20px control + 8px breathing room).
 *
 * Accessible name always carries the section title, and the state is exposed via
 * `aria-checked` / `aria-pressed`, never colour alone.
 */

"use client"

import { FlagIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { makeUnitId, type StoredProgressStatus } from "@/lib/progress"
import { useUnitProgress } from "./useProgress"

export type SectionCheckProps = {
  guideId: string
  chapterSlug: string
  /** Section slug; omit for a chapter that has no sections (chapter = unit). */
  sectionId?: string | null
  /** Heading text, used verbatim in the accessible names. */
  title: string
  className?: string
}

const CHECK_CLASS =
  "size-4.5 max-md:size-5 pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11"

export function SectionCheck({
  guideId,
  chapterSlug,
  sectionId,
  title,
  className,
}: SectionCheckProps) {
  const unitId = makeUnitId(guideId, chapterSlug, sectionId)
  const { status, isSaving, setStatus, toggle } = useUnitProgress(guideId, unitId)

  const done = status === "done"
  const review = status === "review"

  const apply = (next: StoredProgressStatus) => {
    if (status === next) {
      void setStatus("absent")
      return
    }
    void toggle(next)
  }

  return (
    <div
      aria-busy={isSaving || undefined}
      className={cn(
        "flex items-center gap-1.5",
        "max-md:min-h-11 max-md:gap-2",
        "md:absolute md:top-1 md:-start-6 md:min-h-0 md:flex-col md:gap-1",
        className,
      )}
      data-slot="section-check"
      data-state={status}
    >
      <Checkbox
        aria-label={`Marcar "${title}" como lido`}
        checked={done}
        className={CHECK_CLASS}
        onCheckedChange={(checked) => {
          void setStatus(checked ? "done" : "absent")
        }}
      />
      <Button
        aria-label={`Marcar "${title}" para revisão`}
        aria-pressed={review}
        className={cn(
          "size-8 text-faint pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11",
          "md:size-5",
          review && "bg-warning/10 text-warning hover:bg-warning/16 hover:text-warning",
        )}
        onClick={() => apply("review")}
        size="icon"
        type="button"
        variant="ghost"
      >
        <FlagIcon aria-hidden="true" />
      </Button>
    </div>
  )
}
