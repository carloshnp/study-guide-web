import { Link } from "react-router"

import { coverInitials } from "@/features/catalog/cover-initials"
import { FolderHeading } from "@/features/catalog/FolderHeading"
import { GuideTypeChip } from "@/features/catalog/GuideTypeChip"
import { guideHref, type CatalogGuide, type SubjectGroup } from "@/lib/catalog"

function chapterCountLabel(count: number): string {
  return `${count} ${count === 1 ? "capítulo" : "capítulos"}`
}

/**
 * 16:9 media slot: the built cover when the guide has a figure, a typographic
 * placeholder when it does not (DSA). Explicit width/height reserve the box
 * (`image-dimension`); `loading="lazy"` keeps the grid cheap.
 */
function CoverMedia({ guide }: { guide: CatalogGuide }) {
  if (guide.cover) {
    return (
      <img
        src={guide.cover}
        alt={`Capa de ${guide.title}`}
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
        className="aspect-video w-full object-cover"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`Capa tipográfica de ${guide.title}`}
      className="flex aspect-video w-full flex-col justify-between bg-code p-4"
    >
      <span aria-hidden="true" className="text-kicker uppercase text-faint">
        Estudos
      </span>
      <span
        aria-hidden="true"
        className="font-heading text-page font-extrabold tracking-tight text-foreground/70"
      >
        {coverInitials(guide.title)}
      </span>
    </div>
  )
}

function CoverCard({ guide, level = 3 }: { guide: CatalogGuide; level?: 3 | 4 }) {
  const Title = level === 4 ? "h4" : "h3"

  return (
    <li>
      <Link
        to={guideHref(guide.id)}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-card transition-colors duration-150 ease-enter hover:border-brand/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <CoverMedia guide={guide} />
        <span className="flex flex-1 flex-col gap-2 p-4">
          <Title className="font-heading text-h4 font-semibold text-foreground">
            {guide.title}
          </Title>
          <span className="flex flex-wrap items-center gap-2">
            <GuideTypeChip kind={guide.type} />
            <span className="text-caption text-faint tabular-nums">
              {chapterCountLabel(guide.chapterCount)}
            </span>
          </span>
        </span>
      </Link>
    </li>
  )
}

/**
 * Covers grid, grouped by subject and then by folder: `cover` or typographic
 * placeholder, title, type chip and chapter count. A folder keeps its own labelled
 * grid under the subject, so `Não-Ferrosos` reads as a shelf inside Metalurgia.
 * Filtering happens upstream, so an empty `groups` is the caller's no-match state
 * to explain.
 */
export function CoversGrid({ groups }: { groups: SubjectGroup[] }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section
          key={group.subject.id}
          aria-labelledby={`estante-${group.subject.id}`}
          className="flex flex-col gap-3"
        >
          <h2
            id={`estante-${group.subject.id}`}
            className="text-kicker uppercase text-muted-foreground"
          >
            {group.subject.title}
          </h2>

          {group.folders.map((folder) => (
            <section
              key={folder.group.id}
              aria-labelledby={`estante-pasta-${folder.group.id}`}
              className="mt-1 flex flex-col gap-3 border-s border-border ps-3"
            >
              <FolderHeading
                count={folder.guides.length}
                group={folder.group}
                id={`estante-pasta-${folder.group.id}`}
              />
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {folder.guides.map((guide) => (
                  <CoverCard key={guide.id} guide={guide} level={4} />
                ))}
              </ul>
            </section>
          ))}

          {group.direct.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.direct.map((guide) => (
                <CoverCard key={guide.id} guide={guide} />
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  )
}
