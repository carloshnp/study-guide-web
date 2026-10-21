import MiniSearch, { type SearchResult } from "minisearch"
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"

/**
 * Search corpus document, exactly as `pipeline.build` writes it to `/content/search.json`.
 */
export type SearchDocument = {
  id: string
  guideId: string
  guideTitle: string
  chapterId: string
  title: string
  headings: string[]
  text: string
}

export type SearchMatchField = "title" | "headings" | "text"

export type SearchHit = SearchDocument & {
  score: number
  /** Fields that matched, highest priority first. */
  matchedFields: SearchMatchField[]
  /** 0 = title, 1 = headings, 2 = body only. Lower ranks first. */
  tier: number
  /** First heading that matched the query, when the hit came from headings. */
  matchedHeading: string | null
}

export type SearchGroup = {
  guideId: string
  guideTitle: string
  hits: SearchHit[]
}

export type SearchStatus = "loading" | "ready" | "unavailable"

export const SEARCH_ENDPOINT = "/content/search.json"
export const SEARCH_DEBOUNCE_MS = 150
export const RECENT_QUERIES_KEY = "estudos:search:recent"
export const MAX_RECENT_QUERIES = 6

/** Ranking rule: title hits beat heading hits, heading hits beat body hits, then BM25 score. */
const FIELD_PRIORITY: readonly SearchMatchField[] = ["title", "headings", "text"]
const FIELD_BOOST = { title: 4, headings: 2, text: 1 }
const WORD_BOUNDARY = /[^\p{L}\p{N}]+/u
const WORD_CHARACTER = /[0-9a-z]/i

export type HighlightSegment = { text: string; match: boolean }

/* -------------------------------------------------------------------------- */
/* Text folding                                                                */
/* -------------------------------------------------------------------------- */

/** Strips diacritics, keeping case and punctuation (`Magnésio` → `Magnesio`). */
export function foldAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

/**
 * Folds one code point without changing its UTF-16 length, so indices into the folded
 * string stay valid indices into the original. Falls back to the original character when
 * folding would change the length (ligatures, emoji).
 */
function foldCharacter(character: string): string {
  const folded = character.normalize("NFD").replace(/\p{M}/gu, "")
  return folded.length === 1 ? folded : character
}

function foldKeepingLength(text: string): string {
  return Array.from(text).map(foldCharacter).join("")
}

/**
 * Index and query tokenizer: splits on anything that is not a letter or a number,
 * removes diacritics and lowercases. Single characters are dropped because they match
 * everything and only add noise.
 */
export function tokenize(text: string): string[] {
  return text
    .split(WORD_BOUNDARY)
    .map((term) => foldAccents(term).toLowerCase())
    .filter((term) => term.length >= 2)
}

function processTerm(term: string): string {
  return foldAccents(term).toLowerCase()
}

/* -------------------------------------------------------------------------- */
/* Index and query                                                             */
/* -------------------------------------------------------------------------- */

export function createSearchIndex(documents: SearchDocument[]): MiniSearch<SearchDocument> {
  const index = new MiniSearch<SearchDocument>({
    idField: "id",
    fields: [...FIELD_PRIORITY],
    storeFields: ["guideId", "guideTitle", "chapterId", "title", "headings", "text"],
    tokenize,
    processTerm,
  })

  index.addAll(documents)
  return index
}

function matchedFieldsOf(match: Record<string, string[]> | undefined): SearchMatchField[] {
  if (!match) return []
  const found = new Set<string>()
  for (const fields of Object.values(match)) {
    for (const field of fields) found.add(field)
  }
  return FIELD_PRIORITY.filter((field) => found.has(field))
}

function tierOf(matchedFields: SearchMatchField[]): number {
  const [first] = matchedFields
  return first ? FIELD_PRIORITY.indexOf(first) : FIELD_PRIORITY.length - 1
}

function compareHits(a: SearchHit, b: SearchHit): number {
  if (a.tier !== b.tier) return a.tier - b.tier
  if (b.score !== a.score) return b.score - a.score
  return a.id.localeCompare(b.id, "pt-BR")
}

/**
 * Runs the query against the index. Accents are optional in both directions because the
 * tokenizer folds them before indexing and before querying.
 */
export function searchChapters(
  index: MiniSearch<SearchDocument>,
  rawQuery: string,
): SearchHit[] {
  const query = rawQuery.trim()
  if (query === "" || tokenize(query).length === 0) return []

  const results = index.search(query, {
    fields: [...FIELD_PRIORITY],
    boost: FIELD_BOOST,
    prefix: true,
    fuzzy: 0.2,
    combineWith: "OR",
  })

  return results.map((result) => toHit(result)).sort(compareHits)
}

function toHit(result: SearchResult): SearchHit {
  const stored = result as SearchResult & SearchDocument
  const matchedFields = matchedFieldsOf(result.match)

  return {
    id: stored.id,
    guideId: stored.guideId,
    guideTitle: stored.guideTitle,
    chapterId: stored.chapterId,
    title: stored.title,
    headings: stored.headings ?? [],
    text: stored.text ?? "",
    score: result.score,
    matchedFields,
    tier: tierOf(matchedFields),
    matchedHeading: matchedHeadingOf(stored.headings ?? [], result.queryTerms),
  }
}

function containsToken(foldedText: string, token: string): boolean {
  let cursor = 0
  while (cursor <= foldedText.length - token.length) {
    const at = foldedText.indexOf(token, cursor)
    if (at === -1) return false
    if (at === 0 || !WORD_CHARACTER.test(foldedText[at - 1])) return true
    cursor = at + 1
  }
  return false
}

function matchedHeadingOf(headings: string[], queryTerms: string[]): string | null {
  const tokens = queryTerms.map(processTerm).filter((term) => term.length >= 2)
  if (tokens.length === 0) return null

  for (const heading of headings) {
    const folded = foldKeepingLength(heading).toLowerCase()
    if (tokens.some((token) => containsToken(folded, token))) return heading
  }
  return null
}

/** Groups hits by guide, keeping the order of each guide's best hit. */
export function groupHits(hits: SearchHit[]): SearchGroup[] {
  const groups = new Map<string, SearchGroup>()

  for (const hit of hits) {
    const group = groups.get(hit.guideId)
    if (group) group.hits.push(hit)
    else groups.set(hit.guideId, { guideId: hit.guideId, guideTitle: hit.guideTitle, hits: [hit] })
  }

  return [...groups.values()]
}

/* -------------------------------------------------------------------------- */
/* Highlighting                                                                */
/* -------------------------------------------------------------------------- */

function matchRanges(text: string, tokens: string[]): [number, number][] {
  const folded = foldKeepingLength(text).toLowerCase()
  const ranges: [number, number][] = []

  for (const token of tokens) {
    let cursor = 0
    while (cursor <= folded.length - token.length) {
      const at = folded.indexOf(token, cursor)
      if (at === -1) break

      if (at === 0 || !WORD_CHARACTER.test(folded[at - 1])) {
        // Extend to the end of the word so a prefix query highlights `Solução`, not `Sol`.
        let end = at + token.length
        while (end < folded.length && WORD_CHARACTER.test(folded[end])) end += 1
        ranges.push([at, end])
        cursor = end
      } else {
        cursor = at + 1
      }
    }
  }

  return ranges.sort((a, b) => a[0] - b[0])
}

/** Splits text into marked and unmarked pieces for accent-insensitive query highlighting. */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const tokens = tokenize(query)
  if (text === "") return []
  if (tokens.length === 0) return [{ text, match: false }]

  const segments: HighlightSegment[] = []
  let cursor = 0

  for (const [start, end] of matchRanges(text, tokens)) {
    if (end <= cursor) continue
    const from = Math.max(start, cursor)
    if (from > cursor) segments.push({ text: text.slice(cursor, from), match: false })
    segments.push({ text: text.slice(from, end), match: true })
    cursor = end
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false })
  return segments.length > 0 ? segments : [{ text, match: false }]
}

/**
 * Short window around the first match of the query, with a leading/trailing ellipsis when
 * the body text was cut.
 */
export function excerptFor(text: string, query: string, maxLength = 160): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= maxLength) return clean

  const tokens = tokenize(query)
  const folded = foldKeepingLength(clean).toLowerCase()
  const firstMatch = tokens.reduce((best, token) => {
    const at = folded.indexOf(token)
    if (at === -1) return best
    return best === -1 ? at : Math.min(best, at)
  }, -1)

  let start = 0
  if (firstMatch > 40) {
    start = firstMatch - 40
    const space = clean.indexOf(" ", start)
    if (space !== -1 && space < firstMatch) start = space + 1
  }

  let end = Math.min(clean.length, start + maxLength)
  if (end < clean.length) {
    const space = clean.lastIndexOf(" ", end)
    if (space > start) end = space
  }

  const slice = clean.slice(start, end)
  return `${start > 0 ? "…" : ""}${slice}${end < clean.length ? "…" : ""}`
}

/* -------------------------------------------------------------------------- */
/* Corpus loading                                                              */
/* -------------------------------------------------------------------------- */

export type SearchResponse = { ok: boolean; json: () => Promise<unknown> }
export type SearchFetcher = () => Promise<SearchResponse>

let corpusCache: SearchDocument[] | null = null
let corpusRequest: Promise<SearchDocument[]> | null = null

function isSearchDocument(value: unknown): value is SearchDocument {
  if (typeof value !== "object" || value === null) return false
  const document = value as Record<string, unknown>
  return (
    typeof document.id === "string" &&
    typeof document.guideId === "string" &&
    typeof document.guideTitle === "string" &&
    typeof document.chapterId === "string" &&
    typeof document.title === "string" &&
    Array.isArray(document.headings) &&
    typeof document.text === "string"
  )
}

async function fetchCorpus(fetcher: SearchFetcher): Promise<SearchDocument[]> {
  try {
    const response = await fetcher()
    if (!response.ok) return []
    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) return []
    return payload.filter(isSearchDocument)
  } catch {
    // The build may not have run yet: search is empty instead of crashing the app.
    return []
  }
}

/**
 * Loads `/content/search.json`. A missing or malformed file resolves to `[]` so the SPA
 * stays usable before the first build. The default fetch is cached per session; a custom
 * fetcher always runs so tests and previews can swap corpora.
 */
export async function loadSearchCorpus(fetcher?: SearchFetcher): Promise<SearchDocument[]> {
  if (fetcher) return fetchCorpus(fetcher)
  if (corpusCache) return corpusCache
  if (!corpusRequest) {
    corpusRequest = fetchCorpus(() => fetch(SEARCH_ENDPOINT)).then((documents) => {
      if (documents.length > 0) corpusCache = documents
      corpusRequest = null
      return documents
    })
  }
  return corpusRequest
}

/** Drops the cached corpus (tests, or after publishing a new build). */
export function resetSearchCorpusCache(): void {
  corpusCache = null
  corpusRequest = null
}

/* -------------------------------------------------------------------------- */
/* Recent queries (localStorage, per device)                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_RECENT: string[] = []
const recentListeners = new Set<() => void>()
let recentSnapshot: string[] = readRecentQueries()
let storageBound = false

export function readRecentQueries(): string[] {
  if (typeof window === "undefined") return EMPTY_RECENT
  try {
    const raw = window.localStorage.getItem(RECENT_QUERIES_KEY)
    if (!raw) return EMPTY_RECENT
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return EMPTY_RECENT
    return parsed
      .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
      .slice(0, MAX_RECENT_QUERIES)
  } catch {
    return EMPTY_RECENT
  }
}

function notifyRecent(): void {
  for (const listener of recentListeners) listener()
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== RECENT_QUERIES_KEY) return
  recentSnapshot = readRecentQueries()
  notifyRecent()
}

function subscribeRecent(listener: () => void): () => void {
  recentListeners.add(listener)
  if (!storageBound && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage)
    storageBound = true
  }
  return () => {
    recentListeners.delete(listener)
  }
}

function getRecentSnapshot(): string[] {
  return recentSnapshot
}

/** Records a query, newest first, ignoring case and accents for de-duplication. */
export function rememberQuery(rawQuery: string): string[] {
  const query = rawQuery.trim()
  if (query === "") return recentSnapshot

  const key = processTerm(query)
  const next = [query, ...recentSnapshot.filter((entry) => processTerm(entry) !== key)].slice(
    0,
    MAX_RECENT_QUERIES,
  )

  recentSnapshot = next
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(next))
    } catch {
      // Private mode or a full quota: keep the in-memory list for this session.
    }
  }
  notifyRecent()
  return next
}

export function clearRecentQueries(): void {
  recentSnapshot = EMPTY_RECENT
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(RECENT_QUERIES_KEY)
    } catch {
      // ignore
    }
  }
  notifyRecent()
}

/** Re-reads localStorage into the snapshot (tests clear storage between cases). */
export function resetRecentQueriesCache(): void {
  recentSnapshot = readRecentQueries()
  notifyRecent()
}

export function useRecentQueries(): string[] {
  return useSyncExternalStore(subscribeRecent, getRecentSnapshot, getRecentSnapshot)
}

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useDebouncedValue<T>(value: T, delay: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (delay <= 0) {
      setDebounced(value)
      return
    }
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}

type CorpusState = { documents: SearchDocument[]; status: SearchStatus }

function useCorpus(documents?: SearchDocument[]): CorpusState {
  const [state, setState] = useState<CorpusState>(() =>
    documents ? { documents, status: "ready" } : { documents: [], status: "loading" },
  )

  useEffect(() => {
    if (documents) {
      setState({ documents, status: "ready" })
      return
    }

    let cancelled = false
    void loadSearchCorpus().then((loaded) => {
      if (cancelled) return
      setState({ documents: loaded, status: loaded.length > 0 ? "ready" : "unavailable" })
    })

    return () => {
      cancelled = true
    }
  }, [documents])

  return state
}

export type UseSearchOptions = {
  /** Pre-loaded corpus; when omitted the hook fetches `/content/search.json`. */
  documents?: SearchDocument[]
  debounceMs?: number
}

export type UseSearchResult = {
  query: string
  setQuery: (value: string) => void
  results: SearchHit[]
  groups: SearchGroup[]
  status: SearchStatus
  /** True while the query is still waiting for the debounce window. */
  isPending: boolean
  recentQueries: string[]
  remember: (value: string) => void
  clearRecent: () => void
}

/**
 * Single search hook shared by the command palette and the `/busca` page: corpus load,
 * MiniSearch index, debounced query, grouped hits and recent queries.
 */
export function useSearch({
  documents,
  debounceMs = SEARCH_DEBOUNCE_MS,
}: UseSearchOptions = {}): UseSearchResult {
  const [query, setQuery] = useState("")
  const corpus = useCorpus(documents)

  const index = useMemo(
    () => (corpus.documents.length > 0 ? createSearchIndex(corpus.documents) : null),
    [corpus.documents],
  )

  const debouncedQuery = useDebouncedValue(query, debounceMs)
  const results = useMemo(
    () => (index ? searchChapters(index, debouncedQuery) : []),
    [index, debouncedQuery],
  )
  const groups = useMemo(() => groupHits(results), [results])

  const recentQueries = useRecentQueries()
  const remember = useCallback((value: string) => {
    rememberQuery(value)
  }, [])
  const clearRecent = useCallback(() => {
    clearRecentQueries()
  }, [])

  return {
    query,
    setQuery,
    results,
    groups,
    status: corpus.status,
    isPending: query !== debouncedQuery,
    recentQueries,
    remember,
    clearRecent,
  }
}
