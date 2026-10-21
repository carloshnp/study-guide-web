import { Link } from "react-router"

import { GuideTypeChip } from "@/features/catalog/GuideTypeChip"
import { GuideMeter } from "@/features/progress/GuideMeter"
import { useProgress } from "@/features/progress/useProgress"
import {
  groupGuidesBySubject,
  guideHref,
  unitIdsOfGuide,
  type CatalogIndex,
  type Guide,
  type SubjectGroup,
} from "@/lib/catalog"

function chapterCountLabel(count: number): string {
  return `${count} ${count === 1 ? "capítulo" : "capítulos"}`
}

type GuideRowProps = {
  guide: SubjectGroup["guides"][number]
  units: string[]
}

/**
 * One dense row: title, type chip, chapter count and the guide meter. The meter
 * reads the shared progress store, so a chapter opened from this row reuses the
 * same GET (`useProgress` dedupes per guide) instead of asking the API twice.
 */
function GuideRow({ guide, units }: GuideRowProps) {
  const { counts } = useProgress(guide.id)

  return (
    <li>
      <Link
        to={guideHref(guide.id)}
        className="flex min-h-11 flex-col gap-2 rounded-lg border border-transparent px-3 py-3 transition-colors duration-150 ease-enter hover:border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-heading text-h4 font-semibold text-foreground">{guide.title}</h3>
          <GuideTypeChip kind={guide.type} />
          <span className="ms-auto shrink-0 text-caption text-faint tabular-nums">
            {chapterCountLabel(guide.chapterCount)}
          </span>
        </span>
        <GuideMeter counts={counts(units)} label="Progresso" className="max-w-[18rem]" />
      </Link>
    </li>
  )
}

type GuideListProps = {
  index: CatalogIndex
  guides: Guide[]
}

/**
 * Home's catalog body: one section per subject, one row per guide, ordered by
 * `catalog.yaml`. Units come from each guide manifest so the meter counts headings,
 * not chapters.
 */
export function GuideList({ index, guides }: GuideListProps) {
  const guidesById = new Map(guides.map((guide) => [guide.id, guide]))
  const groups = groupGuidesBySubject(index)

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section
          key={group.subject.id}
          aria-labelledby={`subject-${group.subject.id}`}
          className="flex flex-col gap-2"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
            <h2
              id={`subject-${group.subject.id}`}
              className="text-kicker uppercase text-muted-foreground"
            >
              {group.subject.title}
            </h2>
            <span className="text-caption text-faint tabular-nums">
              {group.guides.length} {group.guides.length === 1 ? "guia" : "guias"}
            </span>
          </div>

          <ul className="flex flex-col">
            {group.guides.map((guide) => {
              const detail = guidesById.get(guide.id)
              return (
                <GuideRow
                  key={guide.id}
                  guide={guide}
                  units={detail ? unitIdsOfGuide(detail) : []}
                />
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
