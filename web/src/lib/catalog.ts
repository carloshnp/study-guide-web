/**
 * Typed reader for the built content contract (`content/index.json` and
 * `content/guides/<id>/guide.json`), plus the pure helpers the catalog pages need:
 * subject grouping, accent-insensitive subject matching and progress-unit lists.
 *
 * Why a module cache instead of TanStack Query: the shell mounts no
 * `QueryClientProvider` and this feature does not own `main.tsx`. The sidebar, the
 * home list and the covers page all want the same manifests, so one promise per
 * file is cached and shared — six mounts of the sidebar still cost one request per
 * file. Failed requests are evicted, so a reload retries instead of replaying the
 * old failure.
 *
 * Shapes mirror `docs/contracts.md`; every mismatch is a `CatalogError` that names
 * the file, so a stale build is diagnosed from the page instead of a blank screen.
 */

"use client"

import { useCallback, useEffect, useState } from "react"

import { makeUnitId } from "@/lib/progress"

export const CONTENT_INDEX_PATH = "/content/index.json"

export function contentGuidePath(guideId: string): string {
  return `/content/guides/${encodeURIComponent(guideId)}/guide.json`
}

export function guideHref(guideId: string): string {
  return `/g/${guideId}`
}

export function chapterHref(guideId: string, chapterSlug: string): string {
  return `/g/${guideId}/c/${chapterSlug}`
}

/* -------------------------------------------------------------------------- */
/* Contract types                                                              */
/* -------------------------------------------------------------------------- */

export const GUIDE_KINDS = ["teoria", "banco", "referencia", "glossario", "apendice"] as const

/** Chapter kind, from the catalog `type` or a promoted appendix heading. */
export type GuideKind = (typeof GUIDE_KINDS)[number]

/** Chip label for each kind (`docs/contracts.md` › `kind`). */
export const GUIDE_KIND_LABELS: Record<GuideKind, string> = {
  apendice: "Apêndice",
  banco: "Banco",
  glossario: "Glossário",
  referencia: "Referência",
  teoria: "Teoria",
}

export type Subject = {
  id: string
  title: string
  order: number
}

/** A folder of guides inside one subject, e.g. Não-Ferrosos under Metalurgia. */
export type GuideGroup = {
  id: string
  title: string
  subject: string
  order: number
}

export type CatalogGuide = {
  id: string
  title: string
  subject: string
  /** Folder id inside the subject, or null when the guide sits directly in it. */
  group: string | null
  type: GuideKind
  chapterCount: number
  updatedAt: string | null
  /** `/media/covers/<id>.webp`, or null when the guide has no figure (DSA). */
  cover: string | null
}

export type CatalogIndex = {
  generatedAt: string | null
  subjects: Subject[]
  groups: GuideGroup[]
  guides: CatalogGuide[]
}

export type GuideSection = {
  id: string
  title: string
  level: number
  parentId: string | null
}

export type GuideChapter = {
  id: string
  number: number
  title: string
  slug: string
  part: string | null
  kind: GuideKind
  sections: GuideSection[]
}

export type GuideMeta = {
  discipline: string | null
  professor: string | null
  sources: string[]
  generated: string | null
}

export type Guide = {
  id: string
  title: string
  subject: string
  type: GuideKind
  meta: GuideMeta
  cover: { markdown: string }
  chapters: GuideChapter[]
}

/** One folder with its guides, both in catalog order. */
export type FolderGroup = {
  group: GuideGroup
  guides: CatalogGuide[]
}

/**
 * One subject with its published guides, both in catalog order: `guides` holds
 * every guide of the subject (folder members included), `folders` groups those
 * inside a folder and `direct` the ones that sit directly under the subject.
 */
export type SubjectGroup = {
  subject: Subject
  guides: CatalogGuide[]
  folders: FolderGroup[]
  direct: CatalogGuide[]
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

export class CatalogError extends Error {
  readonly path: string
  /** HTTP status, 0 for a network failure, 200 for a shape mismatch. */
  readonly status: number

  constructor(
    message: string,
    options: { path: string; status: number; cause?: unknown },
  ) {
    super(message, { cause: options.cause })
    this.name = "CatalogError"
    this.path = options.path
    this.status = options.status
  }
}

/** Message for an inline error state; never empty. */
export function catalogErrorMessage(error: unknown): string {
  if (error instanceof CatalogError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Não foi possível carregar o catálogo de guias."
}

function invalid(path: string, detail: string): CatalogError {
  return new CatalogError(`Catálogo inválido em ${path}: ${detail}`, { path, status: 200 })
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

function asRecord(value: unknown, path: string, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalid(path, `${what} não é um objeto.`)
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, path: string, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalid(path, `\`${field}\` está ausente ou não é texto.`)
  }
  return value
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function asArray(value: unknown, path: string, field: string): unknown[] {
  if (!Array.isArray(value)) throw invalid(path, `\`${field}\` não é uma lista.`)
  return value
}

function asNumber(value: unknown, path: string, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw invalid(path, `\`${field}\` não é um número.`)
  }
  return value
}

export function isGuideKind(value: unknown): value is GuideKind {
  return typeof value === "string" && (GUIDE_KINDS as readonly string[]).includes(value)
}

function asKind(value: unknown, path: string, field: string, fallback?: GuideKind): GuideKind {
  if (value === undefined && fallback) return fallback
  if (!isGuideKind(value)) {
    throw invalid(path, `\`${field}\` não é um tipo de guia conhecido (${GUIDE_KINDS.join(", ")}).`)
  }
  return value
}

export function parseCatalogIndex(payload: unknown, path = CONTENT_INDEX_PATH): CatalogIndex {
  const record = asRecord(payload, path, "index.json")

  const subjects = asArray(record.subjects, path, "subjects").map((entry, index) => {
    const subject = asRecord(entry, path, `subjects[${index}]`)
    return {
      id: asString(subject.id, path, `subjects[${index}].id`),
      order: asNumber(subject.order, path, `subjects[${index}].order`),
      title: asString(subject.title, path, `subjects[${index}].title`),
    }
  })

  const rawGroups = record.groups === undefined ? [] : asArray(record.groups, path, "groups")
  const groups = rawGroups.map((entry, index) => {
    const group = asRecord(entry, path, `groups[${index}]`)
    return {
      id: asString(group.id, path, `groups[${index}].id`),
      order: asNumber(group.order, path, `groups[${index}].order`),
      subject: asString(group.subject, path, `groups[${index}].subject`),
      title: asString(group.title, path, `groups[${index}].title`),
    } satisfies GuideGroup
  })

  const guides = asArray(record.guides, path, "guides").map((entry, index) => {
    const guide = asRecord(entry, path, `guides[${index}]`)
    return {
      chapterCount: asNumber(guide.chapterCount, path, `guides[${index}].chapterCount`),
      cover: optionalString(guide.cover),
      group: optionalString(guide.group),
      id: asString(guide.id, path, `guides[${index}].id`),
      subject: asString(guide.subject, path, `guides[${index}].subject`),
      title: asString(guide.title, path, `guides[${index}].title`),
      type: asKind(guide.type, path, `guides[${index}].type`),
      updatedAt: optionalString(guide.updatedAt),
    } satisfies CatalogGuide
  })

  return {
    generatedAt: optionalString(record.generatedAt),
    groups,
    guides,
    subjects,
  }
}

function parseSections(payload: unknown, path: string, field: string): GuideSection[] {
  if (payload === undefined || payload === null) return []
  return asArray(payload, path, field).map((entry, index) => {
    const section = asRecord(entry, path, `${field}[${index}]`)
    return {
      id: asString(section.id, path, `${field}[${index}].id`),
      level: asNumber(section.level, path, `${field}[${index}].level`),
      parentId: optionalString(section.parentId),
      title: asString(section.title, path, `${field}[${index}].title`),
    } satisfies GuideSection
  })
}

export function parseGuide(payload: unknown, path: string): Guide {
  const record = asRecord(payload, path, "guide.json")
  const type = asKind(record.type, path, "type")
  const meta = record.meta === undefined ? {} : asRecord(record.meta, path, "meta")
  const cover = record.cover === undefined ? {} : asRecord(record.cover, path, "cover")

  const chapters = asArray(record.chapters, path, "chapters").map((entry, index) => {
    const chapter = asRecord(entry, path, `chapters[${index}]`)
    const slug = asString(chapter.slug ?? chapter.id, path, `chapters[${index}].slug`)
    return {
      id: asString(chapter.id, path, `chapters[${index}].id`),
      kind: asKind(chapter.kind, path, `chapters[${index}].kind`, type),
      number: asNumber(chapter.number, path, `chapters[${index}].number`),
      part: optionalString(chapter.part),
      sections: parseSections(chapter.sections, path, `chapters[${index}].sections`),
      slug,
      title: asString(chapter.title, path, `chapters[${index}].title`),
    } satisfies GuideChapter
  })

  const sources = Array.isArray(meta.sources)
    ? meta.sources.filter((source): source is string => typeof source === "string")
    : []

  return {
    chapters,
    cover: { markdown: typeof cover.markdown === "string" ? cover.markdown : "" },
    id: asString(record.id, path, "id"),
    meta: {
      discipline: optionalString(meta.discipline),
      generated: optionalString(meta.generated),
      professor: optionalString(meta.professor),
      sources,
    },
    subject: asString(record.subject, path, "subject"),
    title: asString(record.title, path, "title"),
    type,
  }
}

/* -------------------------------------------------------------------------- */
/* Fetching (cached)                                                           */
/* -------------------------------------------------------------------------- */

async function fetchJson(path: string): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(path, { headers: { Accept: "application/json" } })
  } catch (cause) {
    throw new CatalogError(
      `Não foi possível carregar ${path}. Verifique se o conteúdo foi publicado e recarregue a página.`,
      { cause, path, status: 0 },
    )
  }

  if (!response.ok) {
    throw new CatalogError(
      `O servidor respondeu ${response.status} para ${path}. Rode o build do conteúdo e recarregue a página.`,
      { path, status: response.status },
    )
  }

  try {
    return (await response.json()) as unknown
  } catch (cause) {
    throw new CatalogError(`Resposta inválida de ${path}: o corpo não é JSON.`, {
      cause,
      path,
      status: 200,
    })
  }
}

/** Evict a rejected promise so a later mount retries instead of replaying it. */
function evictOnFailure<K>(cache: Map<K, Promise<unknown>>, key: K, promise: Promise<unknown>): void {
  promise.catch(() => {
    if (cache.get(key) === promise) cache.delete(key)
  })
}

const indexCache = new Map<string, Promise<CatalogIndex>>()
const guideCache = new Map<string, Promise<Guide>>()
let catalogCache: Promise<{ index: CatalogIndex; guides: Guide[] }> | null = null

/** Drop every cached manifest. Tests call it between cases; a reload uses `force`. */
export function resetCatalogCache(): void {
  indexCache.clear()
  guideCache.clear()
  catalogCache = null
}

export function loadCatalogIndex(force = false): Promise<CatalogIndex> {
  if (force) indexCache.delete(CONTENT_INDEX_PATH)
  const cached = indexCache.get(CONTENT_INDEX_PATH)
  if (cached) return cached

  const promise = fetchJson(CONTENT_INDEX_PATH).then((payload) =>
    parseCatalogIndex(payload, CONTENT_INDEX_PATH),
  )
  indexCache.set(CONTENT_INDEX_PATH, promise)
  evictOnFailure(indexCache, CONTENT_INDEX_PATH, promise)
  return promise
}

export function loadGuide(guideId: string, force = false): Promise<Guide> {
  const path = contentGuidePath(guideId)
  if (force) guideCache.delete(guideId)
  const cached = guideCache.get(guideId)
  if (cached) return cached

  const promise = fetchJson(path).then((payload) => parseGuide(payload, path))
  guideCache.set(guideId, promise)
  evictOnFailure(guideCache, guideId, promise)
  return promise
}

export type CatalogBundle = {
  index: CatalogIndex
  guides: Guide[]
}

/** Index plus every guide manifest; one request per file, shared by all callers. */
export function loadCatalog(force = false): Promise<CatalogBundle> {
  if (force) catalogCache = null
  if (catalogCache) return catalogCache

  const promise = (async () => {
    const index = await loadCatalogIndex(force)
    const guides = await Promise.all(index.guides.map((guide) => loadGuide(guide.id, force)))
    return { guides, index }
  })()

  catalogCache = promise
  promise.catch(() => {
    if (catalogCache === promise) catalogCache = null
  })
  return promise
}

/* -------------------------------------------------------------------------- */
/* Grouping and matching                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Subjects with their guides and folders, subjects in `order`, guides in index
 * order. A guide that names an unknown subject is dropped; a subject without
 * published guides gets no group; a folder without guides is not listed. A guide
 * whose `group` is unknown or belongs to another subject falls back to `direct`,
 * so a stale catalog entry still shows up instead of disappearing.
 */
export function groupGuidesBySubject(index: CatalogIndex): SubjectGroup[] {
  const known = new Set(index.subjects.map((subject) => subject.id))
  const bySubject = new Map<string, CatalogGuide[]>()

  for (const guide of index.guides) {
    if (!known.has(guide.subject)) continue
    const list = bySubject.get(guide.subject)
    if (list) list.push(guide)
    else bySubject.set(guide.subject, [guide])
  }

  return [...index.subjects]
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "pt-BR"))
    .map((subject) => {
      const guides = bySubject.get(subject.id) ?? []
      const folders = index.groups
        .filter((group) => group.subject === subject.id)
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "pt-BR"))
        .map((group) => ({
          group,
          guides: guides.filter((guide) => guide.group === group.id),
        }))
        .filter((folder) => folder.guides.length > 0)
      const folded = new Set(folders.flatMap((folder) => folder.guides.map((guide) => guide.id)))
      return {
        direct: guides.filter((guide) => !folded.has(guide.id)),
        folders,
        guides,
        subject,
      }
    })
    .filter((group) => group.guides.length > 0)
}

/**
 * Where a guide sits: its subject and, when it has one, its folder. Null when the
 * catalog does not know the guide (a stale link). A folder of another subject is
 * not reported, matching `groupGuidesBySubject`'s fallback to `direct`.
 */
export function guideTrail(
  index: CatalogIndex,
  guideId: string,
): { subject: Subject; group: GuideGroup | null } | null {
  const guide = index.guides.find((entry) => entry.id === guideId)
  if (!guide) return null
  const subject = index.subjects.find((entry) => entry.id === guide.subject)
  if (!subject) return null
  const group =
    index.groups.find((entry) => entry.id === guide.group && entry.subject === subject.id) ?? null
  return { group, subject }
}

/** Lowercase without diacritics: `Magnésio` → `magnesio`. */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

function words(folded: string): string[] {
  return folded.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 0)
}

/** Bounded Levenshtein distance; returns `max + 1` as soon as the bound is beaten. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1

  const left = Array.from(a)
  const right = Array.from(b)
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i]
    let rowBest = i
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      const value = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )
      current[j] = value
      rowBest = Math.min(rowBest, value)
    }
    if (rowBest > max) return max + 1
    previous = current
  }

  return previous[right.length] ?? max + 1
}

function isSubsequence(needle: string, haystack: string): boolean {
  const target = Array.from(needle)
  if (target.length === 0) return true
  let index = 0
  for (const character of Array.from(haystack)) {
    if (character === target[index]) index += 1
    if (index === target.length) return true
  }
  return false
}

/**
 * Accent- and case-insensitive match used by the covers filter. A query matches
 * when it is a substring, when every query word is a prefix of a word in the
 * candidate, when every word is one or two edits away from a candidate word (so
 * `metalurgai` still finds `Metalurgia`), or when its letters appear in order
 * (`mtlg`).
 */
export function fuzzyMatch(value: string, query: string): boolean {
  const haystack = foldText(value).trim()
  const needle = foldText(query).trim()
  if (needle === "") return true
  if (haystack.includes(needle)) return true

  const hayWords = words(haystack)
  const needleWords = words(needle)
  if (needleWords.length === 0) return false

  if (needleWords.every((word) => hayWords.some((candidate) => candidate.startsWith(word)))) {
    return true
  }

  const near = needleWords.every((word) => {
    if (word.length < 3) return false
    const tolerance = word.length >= 8 ? 2 : 1
    return hayWords.some(
      (candidate) =>
        editDistance(candidate, word, tolerance) <= tolerance ||
        editDistance(candidate.slice(0, word.length), word, tolerance) <= tolerance,
    )
  })
  if (near) return true

  const compact = needleWords.join("")
  return compact.length >= 3 && isSubsequence(compact, hayWords.join(""))
}

export function matchesSubject(subject: Subject, query: string): boolean {
  return fuzzyMatch(subject.title, query) || fuzzyMatch(subject.id, query)
}

function matchesGuide(guide: CatalogGuide, query: string): boolean {
  return fuzzyMatch(guide.title, query) || fuzzyMatch(guide.id, query)
}

export function matchesGroup(group: GuideGroup, query: string): boolean {
  return fuzzyMatch(group.title, query) || fuzzyMatch(group.id, query)
}

/**
 * Groups a query keeps, folder structure included: a matching subject keeps all
 * of its guides and folders; a matching folder keeps its guides; otherwise the
 * guides whose title matches keep themselves (typing `dsa` finds the guide inside
 * `Programação`, `nao-ferrosos` finds the folder). A folder left empty by the
 * filter is dropped, and `guides` is recomputed from what survived.
 */
export function filterGuidesBySubject(index: CatalogIndex, query: string): SubjectGroup[] {
  const groups = groupGuidesBySubject(index)
  const needle = query.trim()
  if (needle === "") return groups

  return groups.flatMap((group) => {
    if (matchesSubject(group.subject, needle)) return [group]

    const folders = group.folders.flatMap((folder) => {
      if (matchesGroup(folder.group, needle)) return [folder]
      const guides = folder.guides.filter((guide) => matchesGuide(guide, needle))
      return guides.length > 0 ? [{ group: folder.group, guides }] : []
    })
    const direct = group.direct.filter((guide) => matchesGuide(guide, needle))
    if (folders.length === 0 && direct.length === 0) return []

    const visible = new Set([
      ...direct.map((guide) => guide.id),
      ...folders.flatMap((folder) => folder.guides.map((guide) => guide.id)),
    ])
    return [
      {
        direct,
        folders,
        guides: group.guides.filter((guide) => visible.has(guide.id)),
        subject: group.subject,
      },
    ]
  })
}

/**
 * Progress units of a guide, in reading order: one per heading when the chapter
 * has sections, else the chapter itself (`docs/contracts.md` › Progress units).
 */
export function unitIdsOfGuide(guide: Guide): string[] {
  const unitIds: string[] = []
  for (const chapter of guide.chapters) {
    if (chapter.sections.length === 0) {
      unitIds.push(makeUnitId(guide.id, chapter.slug))
      continue
    }
    for (const section of chapter.sections) {
      unitIds.push(makeUnitId(guide.id, chapter.slug, section.id))
    }
  }
  return unitIds
}

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export type CatalogStatus = "loading" | "ready" | "empty" | "error"

export type CatalogResource<T> = {
  status: CatalogStatus
  value: T | null
  error: string | null
  reload: () => void
}

function useCatalogResource<T>(
  load: (force: boolean) => Promise<T>,
  isEmpty: (value: T) => boolean,
): CatalogResource<T> {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ status: CatalogStatus; value: T | null; error: string | null }>(
    { error: null, status: "loading", value: null },
  )

  useEffect(() => {
    let active = true

    load(attempt > 0)
      .then((value) => {
        if (!active) return
        setState({ error: null, status: isEmpty(value) ? "empty" : "ready", value })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({ error: catalogErrorMessage(error), status: "error", value: null })
      })

    return () => {
      active = false
    }
  }, [attempt, isEmpty, load])

  const reload = useCallback(() => {
    setState({ error: null, status: "loading", value: null })
    setAttempt((current) => current + 1)
  }, [])

  return { ...state, reload }
}

const indexIsEmpty = (index: CatalogIndex): boolean => index.guides.length === 0
const catalogIsEmpty = (catalog: CatalogBundle): boolean => catalog.index.guides.length === 0

/** `/content/index.json` alone: enough for the covers grid. */
export function useCatalogIndex(): Omit<CatalogResource<CatalogIndex>, "value"> & {
  index: CatalogIndex | null
} {
  const load = useCallback((force: boolean) => loadCatalogIndex(force), [])
  const { value, ...resource } = useCatalogResource(load, indexIsEmpty)
  return { ...resource, index: value }
}

/** Index plus every guide manifest: the sidebar tree and the home rows both need it. */
export function useCatalogGuides(): Omit<CatalogResource<CatalogBundle>, "value"> & {
  index: CatalogIndex | null
  guides: Guide[]
} {
  const load = useCallback((force: boolean) => loadCatalog(force), [])
  const { value, ...resource } = useCatalogResource(load, catalogIsEmpty)
  return { ...resource, guides: value?.guides ?? [], index: value?.index ?? null }
}
