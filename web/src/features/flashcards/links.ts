/**
 * URL builders for the flashcards surfaces, so a deck id with a colon
 * (`chapter:magnesio:01-estrutura`) survives the round trip through the router
 * and every screen links to the same place.
 */

import { chapterHref } from "@/lib/catalog"

import type { SessionMode } from "./api"

export function decksHref(): string {
  return "/flashcards/decks"
}

export function deckHref(deckId: string): string {
  return `/flashcards/decks/${encodeURIComponent(deckId)}`
}

export function statsHref(): string {
  return "/flashcards/stats"
}

export function draftsHref(): string {
  return "/flashcards/drafts"
}

export function reviewHref(options: {
  deck?: string
  mode?: SessionMode
  scope?: string
  reschedule?: boolean
} = {}): string {
  const search = new URLSearchParams()
  if (options.deck) search.set("deck", options.deck)
  if (options.mode) search.set("mode", options.mode)
  if (options.scope) search.set("scope", options.scope)
  if (options.reschedule) search.set("reschedule", "1")
  const query = search.toString()
  return query === "" ? "/flashcards/review" : `/flashcards/review?${query}`
}

/** Where a card (or deck) is anchored, or null for standalone cards. */
export function anchorHref(anchor: {
  guideId?: string | null
  chapterSlug?: string | null
  sectionId?: string | null
  sourceSnippet?: string | null
}): string | null {
  if (!anchor.guideId) return null
  if (!anchor.chapterSlug) return `/g/${anchor.guideId}`
  const base = chapterHref(anchor.guideId, anchor.chapterSlug)
  const hash = anchor.sectionId ? `#${anchor.sectionId}` : ""
  const snippet = anchor.sourceSnippet?.trim()
  const query = snippet ? `?snippet=${encodeURIComponent(fragmentOf(snippet))}` : ""
  return `${base}${hash}${query}`
}

/**
 * The leading fragment of a source snippet, normalized for matching against the
 * rendered chapter text. The chapter route uses it to scroll to the exact
 * passage the card was created from (full snippet from the draft YAML is
 * verbose; the first ~80 meaningful characters identify it).
 */
export function fragmentOf(snippet: string): string {
  return snippet.replace(/\s+/g, " ").trim().slice(0, 80)
}

/**
 * Where a queue card lives, from its `scope` (`guide:<id>`, `chapter:<id>:<slug>`
 * or `section:<id>:<slug>:<section>`); null for the interleaved queue and for
 * standalone cards.
 */
export function hrefForScope(scope: string): string | null {
  const parts = scope.split(":")
  if (parts[0] === "guide" && parts[1]) return `/g/${parts[1]}`
  if (parts[0] === "chapter" && parts[1] && parts[2]) {
    return chapterHref(parts[1], parts.slice(2).join(":"))
  }
  if (parts[0] === "section" && parts[1] && parts[2]) {
    const base = chapterHref(parts[1], parts[2])
    return parts[3] ? `${base}#${parts[3]}` : base
  }
  return null
}
