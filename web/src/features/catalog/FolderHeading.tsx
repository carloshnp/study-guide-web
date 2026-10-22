import { FolderIcon } from "lucide-react"

import type { GuideGroup } from "@/lib/catalog"
import { cn } from "@/lib/utils"

type FolderHeadingProps = {
  group: GuideGroup
  /** Element id, so the folder section can point `aria-labelledby` at it. */
  id: string
  /** Guides inside the folder, announced on the right. */
  count: number
  /** Heading level: `3` under a subject heading, `4` when nested deeper. */
  level?: 3 | 4
  className?: string
}

/**
 * Label of a subfolder inside a subject (`Não-Ferrosos` under Metalurgia): a folder
 * icon, the title and how many guides it holds. The heading element is chosen by
 * `level` so the outline stays subject h2 › folder h3 › guide h4.
 */
export function FolderHeading({ group, id, count, level = 3, className }: FolderHeadingProps) {
  const Heading = level === 4 ? "h4" : "h3"

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <FolderIcon aria-hidden="true" className="size-3.5 shrink-0 self-center text-faint" />
      <Heading id={id} className="text-meta font-semibold text-foreground">
        {group.title}
      </Heading>
      <span className="ms-auto shrink-0 text-caption text-faint tabular-nums">
        {count} {count === 1 ? "guia" : "guias"}
      </span>
    </div>
  )
}
