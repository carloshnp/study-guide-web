import { ChevronRightIcon } from "lucide-react"
import { useMemo, useState, type KeyboardEvent } from "react"
import { NavLink, useLocation } from "react-router"

import { Skeleton } from "@/components/ui/skeleton"
import {
  chapterHref,
  groupGuidesBySubject,
  guideHref,
  useCatalogGuides,
  type Guide,
  type GuideChapter,
} from "@/lib/catalog"
import { cn } from "@/lib/utils"

export type SidebarNode = {
  /** Stable id, kept for the shell's placeholder list. */
  id: string
  title: string
  to?: string
  meta?: string
  children?: SidebarNode[]
}

type SidebarTreeProps = {
  /** Accessible name of the navigation landmark. */
  label: string
  /**
   * Primary destinations. The shell still passes its placeholder list (Início,
   * Estantes, Busca); when omitted the same three routes are used. The guide tree
   * below them always comes from `/content`.
   */
  nodes?: SidebarNode[]
  /** Ids expanded on first render, e.g. `subject:metalurgia`. */
  defaultExpanded?: string[]
  onNavigate?: () => void
}

const DEFAULT_PRIMARY_LINKS: SidebarNode[] = [
  { id: "inicio", title: "Início", to: "/" },
  { id: "estantes", title: "Estantes", to: "/estantes" },
  { id: "busca", title: "Busca", to: "/busca" },
]

/** 44px rows on every pointer, so the touch target rule never depends on a media query. */
const ROW_CLASS =
  "flex min-h-11 w-full items-center gap-2 rounded-md pe-2 text-meta transition-colors duration-150 ease-enter"

const INDENT_CLASS = ["ps-0", "ps-3", "ps-6", "ps-9"] as const

type TreeContext = {
  expanded: ReadonlySet<string>
  onNavigate?: () => void
  toggle: (id: string) => void
}

function indentOf(depth: number): string {
  return INDENT_CLASS[Math.min(depth, INDENT_CLASS.length - 1)] ?? INDENT_CLASS[0]
}

function onDisclosureKey(
  event: KeyboardEvent<HTMLButtonElement>,
  expanded: boolean,
  toggle: () => void,
): void {
  if (event.key === "ArrowRight" && !expanded) {
    event.preventDefault()
    toggle()
  } else if (event.key === "ArrowLeft" && expanded) {
    event.preventDefault()
    toggle()
  }
}

type DisclosureButtonProps = {
  label: string
  expanded: boolean
  /** Id of the panel while it is mounted; omitted when collapsed. */
  controls?: string
  onToggle: () => void
}

function DisclosureButton({ label, expanded, controls, onToggle }: DisclosureButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      onKeyDown={(event) => onDisclosureKey(event, expanded, onToggle)}
      className="flex min-h-11 shrink-0 items-center justify-center rounded-md px-2 text-faint transition-colors duration-150 ease-enter hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ChevronRightIcon
        aria-hidden="true"
        className={cn(
          "size-4 transition-transform duration-150 ease-enter",
          expanded && "rotate-90",
        )}
      />
    </button>
  )
}

function treeLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    ROW_CLASS,
    "min-w-0 flex-1 hover:bg-accent hover:text-foreground",
    isActive ? "bg-accent-soft font-semibold text-brand-ink" : "text-sidebar-foreground",
  )
}

type SectionItemProps = {
  chapterSlug: string
  guideId: string
  sectionId: string
  title: string
  depth: number
  onNavigate?: () => void
}

function SectionItem({ chapterSlug, guideId, sectionId, title, depth, onNavigate }: SectionItemProps) {
  return (
    <li>
      <div className={cn("flex items-stretch gap-1", indentOf(depth))}>
        <NavLink
          to={`${chapterHref(guideId, chapterSlug)}#${sectionId}`}
          onClick={onNavigate}
          className={(state) => cn(treeLinkClass(state), "text-caption")}
        >
          <span className="truncate">{title}</span>
        </NavLink>
      </div>
    </li>
  )
}

type ChapterItemProps = {
  chapter: GuideChapter
  ctx: TreeContext
  depth: number
  guideId: string
}

function ChapterItem({ chapter, ctx, depth, guideId }: ChapterItemProps) {
  const nodeId = `chapter:${guideId}:${chapter.slug}`
  const listId = `sidebar-chapter-${guideId}-${chapter.slug}`
  const isOpen = ctx.expanded.has(nodeId)
  const hasSections = chapter.sections.length > 0

  return (
    <li>
      <div className={cn("flex items-stretch gap-1", indentOf(depth))}>
        <NavLink
          to={chapterHref(guideId, chapter.slug)}
          end
          onClick={ctx.onNavigate}
          className={treeLinkClass}
        >
          <span className="truncate">
            {chapter.number}. {chapter.title}
          </span>
        </NavLink>
        {hasSections ? (
          <DisclosureButton
            label={
              isOpen
                ? `Recolher seções de ${chapter.title}`
                : `Expandir seções de ${chapter.title}`
            }
            expanded={isOpen}
            controls={isOpen ? listId : undefined}
            onToggle={() => ctx.toggle(nodeId)}
          />
        ) : null}
      </div>

      {hasSections && isOpen ? (
        <ul id={listId} className="mt-1 flex flex-col gap-1">
          {chapter.sections.map((section) => (
            <SectionItem
              key={section.id}
              chapterSlug={chapter.slug}
              guideId={guideId}
              sectionId={section.id}
              title={section.title}
              depth={depth + 1}
              onNavigate={ctx.onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

type GuideItemProps = {
  ctx: TreeContext
  depth: number
  guide: Guide
}

function GuideItem({ ctx, depth, guide }: GuideItemProps) {
  const nodeId = `guide:${guide.id}`
  const listId = `sidebar-guide-${guide.id}`
  const isOpen = ctx.expanded.has(nodeId)
  const hasChapters = guide.chapters.length > 0

  return (
    <li>
      <div className={cn("flex items-stretch gap-1", indentOf(depth))}>
        <NavLink to={guideHref(guide.id)} end onClick={ctx.onNavigate} className={treeLinkClass}>
          <span className="truncate">{guide.title}</span>
        </NavLink>
        {hasChapters ? (
          <DisclosureButton
            label={
              isOpen ? `Recolher capítulos de ${guide.title}` : `Expandir capítulos de ${guide.title}`
            }
            expanded={isOpen}
            controls={isOpen ? listId : undefined}
            onToggle={() => ctx.toggle(nodeId)}
          />
        ) : null}
      </div>

      {hasChapters && isOpen ? (
        <ul id={listId} className="mt-1 flex flex-col gap-1">
          {guide.chapters.map((chapter) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              ctx={ctx}
              depth={depth + 1}
              guideId={guide.id}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

type SubjectItemProps = {
  ctx: TreeContext
  guides: Guide[]
  subjectId: string
  title: string
}

function SubjectItem({ ctx, guides, subjectId, title }: SubjectItemProps) {
  const nodeId = `subject:${subjectId}`
  const listId = `sidebar-subject-${subjectId}`
  const isOpen = ctx.expanded.has(nodeId)
  const toggle = () => ctx.toggle(nodeId)

  return (
    <li>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        onClick={toggle}
        onKeyDown={(event) => onDisclosureKey(event, isOpen, toggle)}
        className={cn(
          ROW_CLASS,
          "justify-start text-start font-medium text-sidebar-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        )}
      >
        <ChevronRightIcon
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-faint transition-transform duration-150 ease-enter",
            isOpen && "rotate-90",
          )}
        />
        <span className="truncate">{title}</span>
        <span className="ms-auto shrink-0 text-caption text-faint tabular-nums">
          {guides.length}
        </span>
      </button>

      {isOpen ? (
        <ul id={listId} className="mt-1 flex flex-col gap-1">
          {guides.map((guide) => (
            <GuideItem key={guide.id} ctx={ctx} depth={1} guide={guide} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function pathParts(pathname: string): { chapterSlug: string | null; guideId: string | null } {
  const match = /^\/g\/([^/]+)(?:\/c\/([^/]+))?/.exec(pathname)
  if (!match?.[1]) return { chapterSlug: null, guideId: null }
  return { chapterSlug: match[2] ?? null, guideId: decodeURIComponent(match[1]) }
}

/**
 * Sidebar navigation: fixed primary destinations, then the published catalog
 * grouped by subject; a guide expands into chapters, a chapter into its sections.
 * The route decides which ancestors open, `aria-current` comes from `NavLink`, and
 * ArrowRight/ArrowLeft expand and collapse without leaving the row
 * (`aria-expanded`, `focus-states`).
 */
export function SidebarTree({
  label,
  nodes,
  defaultExpanded = [],
  onNavigate,
}: SidebarTreeProps) {
  const location = useLocation()
  const { status, guides, index, error, reload } = useCatalogGuides()
  const primaryLinks = nodes ?? DEFAULT_PRIMARY_LINKS

  /** Subject groups in catalog order, each with the manifests that loaded. */
  const groups = useMemo(() => {
    if (!index) return []
    const details = new Map(guides.map((guide) => [guide.id, guide]))
    return groupGuidesBySubject(index)
      .map((group) => ({
        guides: group.guides.flatMap((entry) => {
          const detail = details.get(entry.id)
          return detail ? [detail] : []
        }),
        subject: group.subject,
      }))
      .filter((group) => group.guides.length > 0)
  }, [guides, index])

  const { chapterSlug, guideId } = pathParts(location.pathname)

  const activeKey = useMemo(() => {
    if (!guideId) return ""
    const ids: string[] = []
    const catalogGuide = index?.guides.find((guide) => guide.id === guideId)
    if (catalogGuide) ids.push(`subject:${catalogGuide.subject}`)
    ids.push(`guide:${guideId}`)
    const guide = guides.find((entry) => entry.id === guideId)
    if (chapterSlug && guide?.chapters.some((chapter) => chapter.slug === chapterSlug)) {
      ids.push(`chapter:${guideId}:${chapterSlug}`)
    }
    return ids.join("|")
  }, [chapterSlug, guideId, guides, index])

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set([...defaultExpanded, ...(activeKey === "" ? [] : activeKey.split("|"))]),
  )

  // The URL is the source of truth for which ancestors must be open. Adjusting the
  // disclosure set during render (React's "state follows a prop" pattern) keeps a
  // newly active chapter reachable without an extra paint.
  const [expandedForPath, setExpandedForPath] = useState(activeKey)
  if (expandedForPath !== activeKey) {
    setExpandedForPath(activeKey)
    if (activeKey !== "") {
      const ids = activeKey.split("|")
      setExpanded((current) => {
        const missing = ids.filter((id) => !current.has(id))
        if (missing.length === 0) return current
        return new Set([...current, ...missing])
      })
    }
  }

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const ctx: TreeContext = { expanded, onNavigate, toggle }

  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {primaryLinks.map((node) => (
          <li key={node.id}>
            <div className="flex items-stretch gap-1">
              <NavLink
                to={node.to ?? "/"}
                end={node.to === "/" || node.to === undefined}
                onClick={onNavigate}
                className={treeLinkClass}
              >
                <span className="truncate">{node.title}</span>
              </NavLink>
            </div>
          </li>
        ))}
      </ul>

      <div aria-hidden="true" className="my-2 border-t border-border" />

      {status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-2 px-2">
          <span className="sr-only">Carregando guias…</span>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-6 w-full rounded-sm" />
          ))}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
          <p className="text-caption text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="min-h-11 rounded-md border border-border px-3 text-meta font-medium text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {status === "empty" ? (
        <p className="px-2 py-3 text-caption text-muted-foreground">
          Nenhum guia publicado ainda.
        </p>
      ) : null}

      {status === "ready" ? (
        <ul className="flex flex-col gap-1">
          {groups.map((group) => (
            <SubjectItem
              key={group.subject.id}
              ctx={ctx}
              guides={group.guides}
              subjectId={group.subject.id}
              title={group.subject.title}
            />
          ))}
        </ul>
      ) : null}
    </nav>
  )
}
