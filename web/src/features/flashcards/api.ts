/**
 * Typed client for `/api/flashcards/*` (spec: `docs/spec-flashcards.md` › API
 * surface).
 *
 * Two things make this module worth its length:
 *
 * * the backend is the only owner of the schedule, so the UI never invents the
 *   next interval — it renders `nextIntervalDays` from the review response and,
 *   before a rating, an explicit local estimate (`intervals.ts`);
 * * the prompt endpoints deliberately never carry the answer, so the reveal
 *   step falls back to the note (`GET /notes/<id>`), which is where the author's
 *   own answer lives.
 *
 * Every response is shape-checked, and the parsers accept the documented camel
 * case as well as the server's own historical spellings (`sessionMode`/`mode`,
 * `day`/`date`, `due`/`count`, `outras`/`other`), so a drifting contract shows
 * an error state instead of `undefined` in a card.
 *
 * Paths are relative (`/api/...`): Vite proxies them in dev and FastAPI serves
 * them in production, exactly like `@/lib/api`.
 */

import { ApiError } from "@/lib/api"

export const FLASHCARDS_PATH = "/api/flashcards"

export const CARD_KINDS = ["basic", "basic-reverse", "cloze"] as const

export type CardKind = (typeof CARD_KINDS)[number]

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  basic: "Básico",
  "basic-reverse": "Básico (duas vias)",
  cloze: "Lacunas",
}

export const CARD_STATES = ["new", "learning", "review", "suspended", "deprecated"] as const

export type CardState = (typeof CARD_STATES)[number]

export const CARD_STATE_LABELS: Record<CardState, string> = {
  deprecated: "Descontinuado",
  learning: "Aprendendo",
  new: "Novo",
  review: "Revisão",
  suspended: "Suspenso",
}

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy. */
export const REVIEW_RATINGS = [1, 2, 3, 4] as const

export type ReviewRating = (typeof REVIEW_RATINGS)[number]

export const RATING_LABELS: Record<ReviewRating, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
}

export type SessionMode = "review" | "training"

export type DeckType = "guide" | "chapter" | "section" | "other"

export const DECK_TYPE_LABELS: Record<DeckType, string> = {
  chapter: "Capítulo",
  guide: "Guia",
  other: "Sem âncora",
  section: "Seção",
}

/** Where the card came from, so the review can link back to the passage. */
export type CardAnchor = {
  guideId: string | null
  chapterSlug: string | null
  sectionId: string | null
  sourceSnippet: string | null
}

/** One card as the queue hands it out; the answer arrives with the rating. */
export type QueueCard = {
  id: number
  noteId: number
  kind: CardKind
  /** Markdown + KaTeX. A cloze front already has its lacuna hidden. */
  front: string
  /** `basic` | `reverse` | `cloze:c1` … */
  template: string
  state?: CardState
  /** Source anchor (`scopeMeta` on the wire). */
  anchor: CardAnchor
  /** Deck the card came from, e.g. `guide:magnesio`. */
  scope?: string
  /**
   * Answer text. The prompt endpoints omit it by contract; `Review` resolves it
   * from the note on reveal and always gets it back in the review response.
   */
  back?: string
}

export type QueueResponse = {
  cards: QueueCard[]
  hasMore: boolean
  mode: SessionMode
  scope?: string
}

export type ReviewResult = {
  correct: boolean
  /** Correct answer, used as corrective feedback after a rating. */
  answer: string
  /** Note text shown under a cloze answer, when the server sends one. */
  extra?: string
  nextIntervalDays: number
  nextState?: CardState
  /** False when a training session without reschedule persisted nothing. */
  recorded?: boolean
}

export type FlashcardNote = {
  id: number
  kind: CardKind
  front: string
  back: string
  tags: string
  guideId: string | null
  chapterSlug: string | null
  sectionId: string | null
  sourceSnippet?: string | null
}

export type NoteInput = {
  kind: CardKind
  front: string
  back: string
  tags?: string
  guideId?: string | null
  chapterSlug?: string | null
  sectionId?: string | null
  sourceSnippet?: string | null
}

export type Deck = {
  id: string
  type: DeckType
  guideId?: string | null
  chapterSlug?: string | null
  sectionId?: string | null
  title: string
  cardCount: number
}

export type DeckCard = {
  id: number
  front: string
  template: string
  state: CardState
  due?: string | null
  /** Source anchor of the card (guide/chapter/section + snippet). */
  anchor: CardAnchor
}

export type DeckDetail = {
  id: string
  type: DeckType
  title: string
  cards: DeckCard[]
  guideId?: string | null
  chapterSlug?: string | null
  sectionId?: string | null
}

export type FlashcardSettings = {
  dailyNewLimit: number
  reviewCap: number
  floor: number
  desiredRetentionDefault: number
  perGuide: Record<string, number>
  /** Set when a desired retention above 0.95 is configured (load warning). */
  warnHighRetention?: boolean
}

export type StatsDay = {
  date: string
  reviews: number
  newCards: number
}

export type ForecastDay = {
  date: string
  count: number
}

export type Stats = {
  daily: StatsDay[]
  /** Null when there is no mature review yet. */
  trueRetention: number | null
  matureReviews?: number
  forecast: ForecastDay[]
}

export type Habits = {
  /** How many days had at least one review. */
  activeDays: number
  /** The days themselves, for a heatmap that does not need `/stats`. */
  activeDayList: string[]
  streak: number
  freezes: number
  freezesUsed?: number
  freezesEarned?: number
}

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json()
    if (!isRecord(payload)) return null
    const detail = payload.detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) {
      const messages = detail
        .map((entry) => (isRecord(entry) && typeof entry.msg === "string" ? entry.msg : null))
        .filter((message): message is string => message !== null)
      return messages.length > 0 ? messages.join("; ") : null
    }
    if (isRecord(detail) && typeof detail.message === "string") return detail.message
    return null
  } catch {
    return null
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (cause) {
    throw new ApiError(`Falha de rede ao acessar ${path}. Verifique a conexão.`, {
      cause,
      path,
      status: 0,
    })
  }

  if (!response.ok) {
    const detail = await readDetail(response)
    throw new ApiError(detail ?? `O servidor respondeu ${response.status} para ${path}.`, {
      path,
      status: response.status,
    })
  }

  const text = await response.text()
  if (text === "") return undefined as T

  try {
    return JSON.parse(text) as T
  } catch (cause) {
    throw new ApiError(`Resposta inválida de ${path}: o corpo não é JSON.`, {
      cause,
      path,
      status: response.status,
    })
  }
}

function getInit(): RequestInit {
  return { headers: { Accept: "application/json" }, method: "GET" }
}

function sendInit(method: "POST" | "PATCH" | "DELETE", body?: unknown): RequestInit {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  return body === undefined ? { headers, method } : { body: JSON.stringify(body), headers, method }
}

function invalid(path: string, detail: string): ApiError {
  return new ApiError(`Resposta inválida de ${path}: ${detail}`, { path, status: 200 })
}

function asNumber(value: unknown, path: string, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw invalid(path, `\`${field}\` não é um número.`)
  }
  return value
}

function asArray(value: unknown, path: string, field: string): unknown[] {
  if (!Array.isArray(value)) throw invalid(path, `\`${field}\` não é uma lista.`)
  return value
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export function isCardKind(value: unknown): value is CardKind {
  return typeof value === "string" && (CARD_KINDS as readonly string[]).includes(value)
}

export function isCardState(value: unknown): value is CardState {
  return typeof value === "string" && (CARD_STATES as readonly string[]).includes(value)
}

export function isDeckType(value: unknown): value is DeckType {
  return value === "guide" || value === "chapter" || value === "section" || value === "other"
}

export function isReviewRating(value: unknown): value is ReviewRating {
  return value === 1 || value === 2 || value === 3 || value === 4
}

function isSessionMode(value: unknown): value is SessionMode {
  return value === "review" || value === "training"
}

function normalizeDeckType(value: unknown): DeckType {
  if (value === "outras" || value === "other") return "other"
  return isDeckType(value) ? value : "other"
}

function parseAnchor(value: unknown): CardAnchor {
  const record = isRecord(value) ? value : {}
  return {
    chapterSlug: optionalString(record.chapterSlug),
    guideId: optionalString(record.guideId),
    sectionId: optionalString(record.sectionId),
    sourceSnippet: optionalString(record.sourceSnippet),
  }
}

function parseQueueCard(value: unknown, path: string, index: number): QueueCard {
  if (!isRecord(value)) throw invalid(path, `cards[${index}] não é um objeto.`)
  const kind = isCardKind(value.kind) ? value.kind : null
  if (!kind) throw invalid(path, `cards[${index}].kind desconhecido.`)
  const anchor = isRecord(value.scopeMeta)
    ? parseAnchor(value.scopeMeta)
    : parseAnchor(value)

  return {
    anchor,
    back: typeof value.back === "string" ? value.back : undefined,
    front: typeof value.front === "string" ? value.front : "",
    id: asNumber(value.id, path, `cards[${index}].id`),
    kind,
    noteId: typeof value.noteId === "number" ? value.noteId : 0,
    scope: optionalString(value.scope) ?? undefined,
    state: isCardState(value.state) ? value.state : undefined,
    template: typeof value.template === "string" ? value.template : "basic",
  }
}

export function parseQueue(payload: unknown, path = `${FLASHCARDS_PATH}/queue`): QueueResponse {
  if (!isRecord(payload)) throw invalid(path, "a fila não é um objeto.")
  const cards = asArray(payload.cards, path, "cards").map((card, index) =>
    parseQueueCard(card, path, index),
  )
  const mode = isSessionMode(payload.sessionMode)
    ? payload.sessionMode
    : isSessionMode(payload.mode)
      ? payload.mode
      : "review"
  return {
    cards,
    hasMore: payload.hasMore === true,
    mode,
    scope: optionalString(payload.scope) ?? undefined,
  }
}

export function parseReviewResult(payload: unknown, path: string): ReviewResult {
  if (!isRecord(payload)) throw invalid(path, "a avaliação não é um objeto.")
  return {
    answer: typeof payload.answer === "string" ? payload.answer : "",
    correct: payload.correct === true,
    extra: typeof payload.extra === "string" ? payload.extra : undefined,
    nextIntervalDays:
      typeof payload.nextIntervalDays === "number" ? payload.nextIntervalDays : 0,
    nextState: isCardState(payload.nextState)
      ? payload.nextState
      : isCardState(payload.state)
        ? payload.state
        : undefined,
    recorded: typeof payload.recorded === "boolean" ? payload.recorded : undefined,
  }
}

function parseNote(payload: unknown, path: string): FlashcardNote {
  if (!isRecord(payload)) throw invalid(path, "a nota não é um objeto.")
  const kind = isCardKind(payload.kind) ? payload.kind : null
  if (!kind) throw invalid(path, "`kind` desconhecido.")
  return {
    back: typeof payload.back === "string" ? payload.back : "",
    chapterSlug: optionalString(payload.chapterSlug),
    front: typeof payload.front === "string" ? payload.front : "",
    guideId: optionalString(payload.guideId),
    id: asNumber(payload.id, path, "id"),
    kind,
    sectionId: optionalString(payload.sectionId),
    sourceSnippet: optionalString(payload.sourceSnippet),
    tags: typeof payload.tags === "string" ? payload.tags : "",
  }
}

/** `GET /notes` answers `{count, notes}`; a bare list is accepted too. */
export function parseNoteList(payload: unknown, path = `${FLASHCARDS_PATH}/notes`): FlashcardNote[] {
  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? asArray(payload.notes, path, "notes")
      : asArray(payload, path, "notes")
  return list.map((note) => parseNote(note, path))
}

export function parseDeck(payload: unknown, path: string): Deck {
  if (!isRecord(payload)) throw invalid(path, "o deck não é um objeto.")
  if (typeof payload.id !== "string" || typeof payload.title !== "string") {
    throw invalid(path, "o deck veio sem id ou título.")
  }
  return {
    cardCount: typeof payload.cardCount === "number" ? payload.cardCount : 0,
    chapterSlug: optionalString(payload.chapterSlug),
    guideId: optionalString(payload.guideId),
    id: payload.id,
    sectionId: optionalString(payload.sectionId),
    title: payload.title,
    type: normalizeDeckType(payload.type),
  }
}

export function parseDeckList(payload: unknown, path = `${FLASHCARDS_PATH}/decks`): Deck[] {
  return asArray(payload, path, "decks").map((deck) => parseDeck(deck, path))
}

export function parseDeckDetail(payload: unknown, path: string): DeckDetail {
  if (!isRecord(payload)) throw invalid(path, "o deck não é um objeto.")
  if (typeof payload.id !== "string" || typeof payload.title !== "string") {
    throw invalid(path, "o deck veio sem id ou título.")
  }
  const cards = asArray(payload.cards ?? [], path, "cards").map((card, index) => {
    if (!isRecord(card)) throw invalid(path, `cards[${index}] não é um objeto.`)
    const meta = isRecord(card.scopeMeta) ? card.scopeMeta : {}
    return {
      anchor: {
        chapterSlug: optionalString(meta.chapterSlug),
        guideId: optionalString(meta.guideId),
        sectionId: optionalString(meta.sectionId),
        sourceSnippet: optionalString(meta.sourceSnippet),
      },
      due: optionalString(card.due),
      front: typeof card.front === "string" ? card.front : "",
      id: asNumber(card.id, path, `cards[${index}].id`),
      state: isCardState(card.state) ? card.state : "new",
      template: typeof card.template === "string" ? card.template : "basic",
    } satisfies DeckCard
  })
  return {
    cards,
    chapterSlug: optionalString(payload.chapterSlug),
    guideId: optionalString(payload.guideId),
    id: payload.id,
    sectionId: optionalString(payload.sectionId),
    title: payload.title,
    type: normalizeDeckType(payload.type),
  }
}

export function parseSettings(
  payload: unknown,
  path = `${FLASHCARDS_PATH}/settings`,
): FlashcardSettings {
  if (!isRecord(payload)) throw invalid(path, "as configurações não são um objeto.")
  const perGuide: Record<string, number> = {}
  if (isRecord(payload.perGuide)) {
    for (const [guideId, value] of Object.entries(payload.perGuide)) {
      if (typeof value === "number") perGuide[guideId] = value
    }
  }
  return {
    dailyNewLimit: typeof payload.dailyNewLimit === "number" ? payload.dailyNewLimit : 10,
    desiredRetentionDefault:
      typeof payload.desiredRetentionDefault === "number" ? payload.desiredRetentionDefault : 0.9,
    floor: typeof payload.floor === "number" ? payload.floor : 5,
    perGuide,
    reviewCap: typeof payload.reviewCap === "number" ? payload.reviewCap : 200,
    warnHighRetention: payload.warnHighRetention === true,
  }
}

export function parseStats(payload: unknown, path = `${FLASHCARDS_PATH}/stats`): Stats {
  if (!isRecord(payload)) throw invalid(path, "as estatísticas não são um objeto.")
  const daily = asArray(payload.daily ?? [], path, "daily").flatMap((entry) => {
    if (!isRecord(entry)) return []
    const date = optionalString(entry.date) ?? optionalString(entry.day)
    if (!date) return []
    return [
      {
        date,
        newCards:
          typeof entry.newCards === "number"
            ? entry.newCards
            : typeof entry.new === "number"
              ? entry.new
              : 0,
        reviews: typeof entry.reviews === "number" ? entry.reviews : 0,
      } satisfies StatsDay,
    ]
  })
  const forecast = asArray(payload.forecast ?? [], path, "forecast").flatMap((entry) => {
    if (!isRecord(entry)) return []
    const date = optionalString(entry.date) ?? optionalString(entry.day)
    const count =
      typeof entry.count === "number" ? entry.count : typeof entry.due === "number" ? entry.due : null
    if (!date || count === null) return []
    return [{ count, date } satisfies ForecastDay]
  })
  const retention =
    typeof payload.trueRetention === "number" && Number.isFinite(payload.trueRetention)
      ? payload.trueRetention
      : null
  return {
    daily,
    forecast,
    matureReviews: typeof payload.matureReviews === "number" ? payload.matureReviews : undefined,
    trueRetention: retention,
  }
}

export function parseHabits(payload: unknown, path = `${FLASHCARDS_PATH}/habits`): Habits {
  if (!isRecord(payload)) throw invalid(path, "o hábito não é um objeto.")
  const activeDayList = Array.isArray(payload.activeDays)
    ? payload.activeDays.filter((day): day is string => typeof day === "string")
    : []
  return {
    activeDayList,
    activeDays:
      typeof payload.activeDays === "number" ? payload.activeDays : activeDayList.length,
    freezes: typeof payload.freezes === "number" ? payload.freezes : 0,
    freezesEarned: typeof payload.freezesEarned === "number" ? payload.freezesEarned : undefined,
    freezesUsed: typeof payload.freezesUsed === "number" ? payload.freezesUsed : undefined,
    streak: typeof payload.streak === "number" ? payload.streak : 0,
  }
}

export type DraftSummary = {
  file: string
  count: number
  guideId: string | null
  tags: string[]
}

export type DraftImportResult = {
  file: string
  created: number
  skipped: number
}

export function parseDraftList(payload: unknown): DraftSummary[] {
  const record = payload as Record<string, unknown>
  if (!Array.isArray(record.drafts)) return []
  return record.drafts.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return []
    const draft = entry as Record<string, unknown>
    if (typeof draft.file !== "string") return []
    return [
      {
        count: typeof draft.count === "number" ? draft.count : 0,
        file: draft.file,
        guideId: typeof draft.guideId === "string" ? draft.guideId : null,
        tags: Array.isArray(draft.tags)
          ? draft.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
      } satisfies DraftSummary,
    ]
  })
}

export function parseDraftImport(payload: unknown, path: string): DraftImportResult {
  const record = payload as Record<string, unknown>
  return {
    created: typeof record.created === "number" ? record.created : 0,
    file: typeof record.file === "string" ? record.file : path,
    skipped: typeof record.skipped === "number" ? record.skipped : 0,
  }
}



function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const encoded = search.toString()
  return encoded === "" ? "" : `?${encoded}`
}

function notePath(id: number): string {
  return `${FLASHCARDS_PATH}/notes/${encodeURIComponent(String(id))}`
}

function deckPath(id: string): string {
  return `${FLASHCARDS_PATH}/decks/${encodeURIComponent(id)}`
}

export const flashcardsApi = {
  /** GET /queue — due cards, interleaved by the server. */
  async getQueue(
    options: { mode?: SessionMode; reschedule?: boolean; scope?: string; limit?: number } = {},
  ): Promise<QueueResponse> {
    const path = `${FLASHCARDS_PATH}/queue${query({
      limit: options.limit ?? 20,
      mode: options.mode,
      reschedule: options.reschedule,
      scope: options.scope ?? "all",
    })}`
    return parseQueue(await request<unknown>(path, getInit()), path)
  },

  /**
   * POST /cards/:id/review — the server owns the schedule change. `mode` and
   * `reschedule` travel with every rating: a training session without them
   * would be persisted as a normal review.
   */
  async reviewCard(
    cardId: number,
    input: {
      rating: ReviewRating
      elapsedMs: number
      mode?: SessionMode
      reschedule?: boolean
    },
  ): Promise<ReviewResult> {
    const path = `${FLASHCARDS_PATH}/cards/${encodeURIComponent(String(cardId))}/review`
    const payload = await request<unknown>(
      path,
      sendInit("POST", {
        elapsedMs: Math.max(0, Math.round(input.elapsedMs)),
        mode: input.mode ?? "review",
        rating: input.rating,
        reschedule: input.reschedule,
      }),
    )
    return parseReviewResult(payload, path)
  },

  /** GET /notes?guideId= */
  async listNotes(guideId?: string): Promise<FlashcardNote[]> {
    const path = `${FLASHCARDS_PATH}/notes${query({ guideId })}`
    return parseNoteList(await request<unknown>(path, getInit()), path)
  },

  /** GET /notes/:id — the authored note, answer included. */
  async getNote(id: number): Promise<FlashcardNote> {
    const path = notePath(id)
    return parseNote(await request<unknown>(path, getInit()), path)
  },

  /** POST /notes — one note, one or more cards, per the note kind. */
  async createNote(input: NoteInput): Promise<FlashcardNote> {
    const path = `${FLASHCARDS_PATH}/notes`
    return parseNote(await request<unknown>(path, sendInit("POST", input)), path)
  },

  /** PATCH /notes/:id */
  async updateNote(id: number, input: Partial<NoteInput>): Promise<FlashcardNote> {
    return parseNote(await request<unknown>(notePath(id), sendInit("PATCH", input)), notePath(id))
  },

  /** DELETE /notes/:id — cascades the cards. */
  async deleteNote(id: number): Promise<void> {
    await request<unknown>(notePath(id), sendInit("DELETE"))
  },

  /** GET /decks — derived views (guide, chapter, section, other). */
  async listDecks(): Promise<Deck[]> {
    const path = `${FLASHCARDS_PATH}/decks`
    return parseDeckList(await request<unknown>(path, getInit()), path)
  },

  /** GET /decks/:id — deck meta plus the full card list for browsing. */
  async getDeck(id: string): Promise<DeckDetail> {
    const path = deckPath(id)
    return parseDeckDetail(await request<unknown>(path, getInit()), path)
  },

  /** POST /decks/:id/session — training or review, reschedule opt-in. */
  async startDeckSession(
    id: string,
    input: { mode: SessionMode; reschedule?: boolean; limit?: number },
  ): Promise<QueueResponse> {
    const path = `${deckPath(id)}/session`
    const payload = await request<unknown>(
      path,
      sendInit("POST", {
        limit: input.limit ?? 20,
        mode: input.mode,
        reschedule: input.reschedule === true,
      }),
    )
    return parseQueue(payload, path)
  },

  /** GET /drafts — YAML draft decks (pilot content) awaiting import. */
  async listDrafts(): Promise<DraftSummary[]> {
    const path = `${FLASHCARDS_PATH}/drafts`
    return parseDraftList(await request<unknown>(path, getInit()))
  },

  /** POST /drafts/:file/import — idempotent; returns created/skipped counts. */
  async importDrafts(file: string): Promise<DraftImportResult> {
    const path = `${FLASHCARDS_PATH}/drafts/${encodeURIComponent(file)}/import`
    return parseDraftImport(await request<unknown>(path, sendInit("POST", {})), path)
  },

  /** GET /settings */
  async getSettings(): Promise<FlashcardSettings> {
    const path = `${FLASHCARDS_PATH}/settings`
    return parseSettings(await request<unknown>(path, getInit()), path)
  },

  /** POST /settings */
  async updateSettings(input: Partial<FlashcardSettings>): Promise<FlashcardSettings> {
    const path = `${FLASHCARDS_PATH}/settings`
    return parseSettings(await request<unknown>(path, sendInit("POST", input)), path)
  },

  /** GET /stats?from=&to= */
  async getStats(range: { from?: string; to?: string } = {}): Promise<Stats> {
    const path = `${FLASHCARDS_PATH}/stats${query(range)}`
    return parseStats(await request<unknown>(path, getInit()), path)
  },

  /** GET /habits */
  async getHabits(): Promise<Habits> {
    const path = `${FLASHCARDS_PATH}/habits`
    return parseHabits(await request<unknown>(path, getInit()), path)
  },
}

export type FlashcardsApi = typeof flashcardsApi
