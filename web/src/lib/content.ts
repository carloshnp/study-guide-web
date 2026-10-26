/**
 * Reader for the generated content tree (`docs/contracts.md`).
 *
 * One place decides what a chapter, a section and an image manifest entry look
 * like, how their URLs are built, and how a failed load surfaces: every failure
 * arrives as `ContentError` carrying the path it tried, so the route can print a
 * message that names the file instead of inventing content.
 *
 * Loads are cached per path for the session (`fetchChapter` is called twice when
 * the reader navigates back), and the cache is dropped by `resetContentCache()`
 * in tests. The hooks wrap the loaders for components.
 *
 * Unit ids follow `@/lib/progress`: `<guideId>/<chapterSlug>/<sectionId>`, or
 * `<guideId>/<chapterSlug>` for a chapter without sections.
 */

import { useEffect, useState } from "react"

import { makeUnitId } from "@/lib/progress"

export const CONTENT_ROOT = "/content"

export type GuideKind = "teoria" | "banco" | "referencia" | "glossario" | "apendice"

export const GUIDE_KINDS: readonly GuideKind[] = [
  "teoria",
  "banco",
  "referencia",
  "glossario",
  "apendice",
]

/** Heading level that becomes a progress unit. */
export type SectionLevel = 2 | 3 | 4

export type ChapterSection = {
  id: string
  title: string
  level: SectionLevel
  parentId: string | null
}

export type ChapterImage = {
  src: string
  srcset: string | null
  width: number | null
  height: number | null
  alt: string
  original: string | null
}

/** A chapter as listed inside `guide.json`. */
export type ChapterSummary = {
  id: string
  number: number
  title: string
  slug: string
  part: string | null
  kind: GuideKind
  sections: ChapterSection[]
}

/**
 * Returns only the top-level sections of a chapter: the minimum heading level
 * present. Deeper levels (sub-subsections like "Passo 1", "Resposta",
 * "O tratamento de solubilização em…") are interior parts, not navigation
 * targets — the sidebar and the in-page TOC list the top level only.
 */
export function topLevelSections<T extends { level: number }>(
  sections: readonly T[],
): T[] {
  if (sections.length === 0) return [...sections]
  const min = Math.min(...sections.map((section) => section.level))
  return sections.filter((section) => section.level === min)
}

/**
 * Pictures pinned to a section by the "imagem fixa" reading view, keyed by the
 * section id. A section may list several; the reader steps through them.
 */
export type SectionImages = Record<string, ChapterImage[]>

/** `guides/<id>/chapters/<slug>.json` */
export type ChapterJson = ChapterSummary & {
  guideId: string
  markdown: string
  images: ChapterImage[]
  /** Absent in content built before the pinned view existed. */
  sectionImages?: SectionImages
}

export type GuideMeta = {
  discipline: string | null
  professor: string | null
  sources: string[]
  generated: string | null
}

/** `guides/<id>/guide.json` */
export type GuideJson = {
  id: string
  title: string
  subject: string
  type: string
  meta: GuideMeta
  cover: { markdown: string }
  chapters: ChapterSummary[]
}

export class ContentError extends Error {
  readonly path: string
  readonly status: number

  constructor(message: string, options: { path: string; status?: number; cause?: unknown }) {
    super(message, { cause: options.cause })
    this.name = "ContentError"
    this.path = options.path
    this.status = options.status ?? 0
  }
}

/** Message for a status line; never empty. */
export function contentErrorMessage(error: unknown): string {
  if (error instanceof ContentError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Falha inesperada ao carregar o conteúdo."
}

export const KIND_LABELS: Record<GuideKind, string> = {
  apendice: "Apêndice",
  banco: "Banco de questões",
  glossario: "Glossário",
  referencia: "Referência",
  teoria: "Teoria",
}

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind as GuideKind] ?? "Guia"
}

/* -------------------------------------------------------------------------- */
/* Paths                                                                      */
/* -------------------------------------------------------------------------- */

export function guidePath(guideId: string): string {
  return `${CONTENT_ROOT}/guides/${guideId}/guide.json`
}

export function chapterPath(guideId: string, chapterSlug: string): string {
  return `${CONTENT_ROOT}/guides/${guideId}/chapters/${chapterSlug}.json`
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function invalid(path: string, detail: string): ContentError {
  return new ContentError(`Resposta inválida de ${path}: ${detail}`, { path, status: 200 })
}

function readString(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key]
  if (typeof value !== "string" || value.trim() === "") {
    throw invalid(path, `o campo "${key}" não veio.`)
  }
  return value
}

function readOptionalString(
  source: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = source[key]
  if (value === undefined || value === null) return null
  if (typeof value !== "string") throw invalid(path, `o campo "${key}" não é texto.`)
  return value
}

function readNumber(source: Record<string, unknown>, key: string, path: string): number {
  const value = source[key]
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw invalid(path, `o campo "${key}" não é um número.`)
  }
  return value
}

function readArray(source: Record<string, unknown>, key: string, path: string): unknown[] {
  const value = source[key]
  if (!Array.isArray(value)) throw invalid(path, `o campo "${key}" não é uma lista.`)
  return value
}

function readSections(value: unknown, path: string): ChapterSection[] {
  if (!Array.isArray(value)) throw invalid(path, 'o campo "sections" não é uma lista.')
  return value.map((entry) => {
    if (!isRecord(entry)) throw invalid(path, "uma seção não é um objeto.")
    const level = readNumber(entry, "level", path)
    if (level !== 2 && level !== 3 && level !== 4) {
      throw invalid(path, `a seção "${String(entry.id)}" tem nível ${level}, fora de 2–4.`)
    }
    return {
      id: readString(entry, "id", path),
      level,
      parentId: readOptionalString(entry, "parentId", path),
      title: readString(entry, "title", path),
    }
  })
}

function readImages(value: unknown, path: string): ChapterImage[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw invalid(path, 'o campo "images" não é uma lista.')
  return value.map((entry) => {
    if (!isRecord(entry)) throw invalid(path, "uma imagem do manifesto não é um objeto.")
    return {
      alt: readOptionalString(entry, "alt", path) ?? "",
      height: typeof entry.height === "number" ? entry.height : null,
      original: readOptionalString(entry, "original", path),
      src: readString(entry, "src", path),
      srcset: readOptionalString(entry, "srcset", path),
      width: typeof entry.width === "number" ? entry.width : null,
    }
  })
}

function readSectionImages(value: unknown, path: string): SectionImages {
  if (value === undefined || value === null) return {}
  if (!isRecord(value)) throw invalid(path, 'o campo "sectionImages" não é um objeto.')
  const result: SectionImages = {}
  for (const [sectionId, group] of Object.entries(value)) {
    const images = readImages(group, path)
    if (images.length > 0) result[sectionId] = images
  }
  return result
}

function readKind(source: Record<string, unknown>): GuideKind {
  const value = source.kind ?? source.type
  return typeof value === "string" && (GUIDE_KINDS as readonly string[]).includes(value)
    ? (value as GuideKind)
    : "teoria"
}

function readChapterSummary(value: unknown, path: string): ChapterSummary {
  if (!isRecord(value)) throw invalid(path, "um capítulo não é um objeto.")
  return {
    id: readString(value, "id", path),
    kind: readKind(value),
    number: readNumber(value, "number", path),
    part: readOptionalString(value, "part", path),
    sections: readSections(value.sections, path),
    slug: readString(value, "slug", path),
    title: readString(value, "title", path),
  }
}

export function parseChapter(payload: unknown, path: string): ChapterJson {
  if (!isRecord(payload)) throw invalid(path, "o corpo não é um objeto.")
  const summary = readChapterSummary(payload, path)
  return {
    ...summary,
    guideId: readString(payload, "guideId", path),
    images: readImages(payload.images, path),
    markdown: readString(payload, "markdown", path),
    sectionImages: readSectionImages(payload.sectionImages, path),
  }
}

export function parseGuide(payload: unknown, path: string): GuideJson {
  if (!isRecord(payload)) throw invalid(path, "o corpo não é um objeto.")
  const meta = isRecord(payload.meta) ? payload.meta : {}
  const cover = isRecord(payload.cover) ? payload.cover : {}

  return {
    chapters: readArray(payload, "chapters", path).map((entry) =>
      readChapterSummary(entry, path),
    ),
    cover: {
      markdown: typeof cover.markdown === "string" ? cover.markdown : "",
    },
    id: readString(payload, "id", path),
    meta: {
      discipline: readOptionalString(meta, "discipline", path),
      generated: readOptionalString(meta, "generated", path),
      professor: readOptionalString(meta, "professor", path),
      sources: Array.isArray(meta.sources)
        ? meta.sources.filter((entry): entry is string => typeof entry === "string")
        : [],
    },
    subject: readOptionalString(payload, "subject", path) ?? "",
    title: readString(payload, "title", path),
    type: readOptionalString(payload, "type", path) ?? "teoria",
  }
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

const cache = new Map<string, Promise<unknown>>()

/** Drops the per-session cache; tests call it between cases. */
export function resetContentCache(): void {
  cache.clear()
}

async function getJson<T>(
  path: string,
  parse: (payload: unknown, path: string) => T,
): Promise<T> {
  const cached = cache.get(path)
  if (cached) return cached as Promise<T>

  const request = (async () => {
    let response: Response
    try {
      response = await fetch(path, { headers: { Accept: "application/json" } })
    } catch (cause) {
      throw new ContentError(`Falha de rede ao carregar ${path}.`, { cause, path })
    }

    if (!response.ok) {
      throw new ContentError(`Não foi possível carregar ${path} (HTTP ${response.status}).`, {
        path,
        status: response.status,
      })
    }

    let payload: unknown
    try {
      payload = (await response.json()) as unknown
    } catch (cause) {
      throw new ContentError(`Resposta inválida de ${path}: o corpo não é JSON.`, {
        cause,
        path,
        status: response.status,
      })
    }

    return parse(payload, path)
  })()

  cache.set(path, request)
  // A rejected load must not poison the cache: the next mount retries.
  request.catch(() => cache.delete(path))
  return request
}

export function fetchChapter(guideId: string, chapterSlug: string): Promise<ChapterJson> {
  return getJson(chapterPath(guideId, chapterSlug), parseChapter)
}

export function fetchGuide(guideId: string): Promise<GuideJson> {
  return getJson(guidePath(guideId), parseGuide)
}

/* -------------------------------------------------------------------------- */
/* Hooks                                                                      */
/* -------------------------------------------------------------------------- */

export type ContentState<T> = {
  status: "loading" | "ready" | "error"
  data: T | null
  error: string | null
}

const EMPTY_STATE: ContentState<never> = { data: null, error: null, status: "loading" }

function useContent<T>(key: string | null, load: (key: string) => Promise<T>): ContentState<T> {
  const [state, setState] = useState<ContentState<T>>(EMPTY_STATE as ContentState<T>)

  useEffect(() => {
    if (!key) return undefined
    let active = true
    setState(EMPTY_STATE as ContentState<T>)

    load(key).then(
      (data) => {
        if (active) setState({ data, error: null, status: "ready" })
      },
      (error: unknown) => {
        if (active) setState({ data: null, error: contentErrorMessage(error), status: "error" })
      },
    )

    return () => {
      active = false
    }
  }, [key, load])

  return state
}

function loadChapterKey(key: string): Promise<ChapterJson> {
  const [guideId, chapterSlug] = key.split("::")
  return fetchChapter(guideId, chapterSlug)
}

function loadGuideKey(key: string): Promise<GuideJson> {
  return fetchGuide(key)
}

/** One chapter, fetched once per slug. */
export function useChapterContent(guideId: string, chapterSlug: string): ContentState<ChapterJson> {
  const key = guideId && chapterSlug ? `${guideId}::${chapterSlug}` : null
  return useContent(key, loadChapterKey)
}

/** One guide cover, fetched once per guide. */
export function useGuideContent(guideId: string): ContentState<GuideJson> {
  return useContent(guideId || null, loadGuideKey)
}

/* -------------------------------------------------------------------------- */
/* Progress units                                                             */
/* -------------------------------------------------------------------------- */

export function chapterUnitIds(
  guideId: string,
  chapter: Pick<ChapterSummary, "sections" | "slug">,
): string[] {
  if (chapter.sections.length === 0) return [makeUnitId(guideId, chapter.slug)]
  return chapter.sections.map((section) => makeUnitId(guideId, chapter.slug, section.id))
}

export function guideUnitIds(
  guideId: string,
  guide: Pick<GuideJson, "chapters">,
): string[] {
  return guide.chapters.flatMap((chapter) => chapterUnitIds(guideId, chapter))
}
