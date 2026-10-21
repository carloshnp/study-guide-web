import { Badge } from "@/components/ui/badge"
import { GUIDE_KIND_LABELS, type GuideKind } from "@/lib/catalog"

/**
 * Type label for a guide or chapter (`teoria`, `banco`, `referência`, `glossário`,
 * `apêndice`). Border only: one accent, no per-type colour (`color-semantic`).
 */
export function GuideTypeChip({ kind }: { kind: GuideKind }) {
  return (
    <Badge variant="outline" size="sm" className="rounded-chip px-2 py-0 text-caption">
      {GUIDE_KIND_LABELS[kind]}
    </Badge>
  )
}
