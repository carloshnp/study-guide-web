/**
 * The "Flashcards" section of a guide page: the guide deck plus one link per
 * chapter deck, with card counts. A guide with no cards still gets the section,
 * because that is where the user learns the feature exists.
 *
 * Never blocks the guide: while loading (or if the API is down) it renders
 * nothing, and the guide's own content is unaffected.
 */

"use client"

import { ArrowRightIcon, LayersIcon } from "lucide-react"
import { Link } from "react-router"

import { flashcardsApi, type Deck } from "../api"
import { deckHref, decksHref, reviewHref } from "../links"
import { useResource } from "../useResource"

function countCards(decks: Deck[]): number {
  const guideDeck = decks.find((deck) => deck.type === "guide")
  if (guideDeck) return guideDeck.cardCount
  return decks.reduce((sum, deck) => sum + deck.cardCount, 0)
}

export function GuideDecks({ guideId }: { guideId: string }) {
  const resource = useResource(`guide-decks:${guideId}`, () => flashcardsApi.listDecks())
  if (resource.status !== "ready") return null

  const decks = (resource.data ?? []).filter((deck) => deck.guideId === guideId)
  const guideDeck = decks.find((deck) => deck.type === "guide") ?? null
  const chapterDecks = decks.filter((deck) => deck.type === "chapter")
  const total = countCards(decks)

  return (
    <section
      aria-labelledby="guide-flashcards"
      className="flex max-w-[var(--measure)] flex-col gap-3"
      data-slot="guide-flashcards"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-heading text-h2 text-foreground" id="guide-flashcards">
          Flashcards
        </h2>
        <span className="text-caption text-faint tabular-nums">
          {total} {total === 1 ? "card" : "cards"}
        </span>
        <Link
          className="ms-auto inline-flex min-h-11 items-center gap-1 text-meta font-semibold text-brand underline-offset-4 hover:underline"
          to={decksHref()}
        >
          Todos os decks
          <ArrowRightIcon aria-hidden="true" className="size-3.5" />
        </Link>
      </div>

      {decks.length === 0 ? (
        <p className="text-meta text-muted-foreground">
          Nenhum card neste guia ainda. Abra um capítulo, selecione um trecho e use “Criar
          card” — o card fica ancorado nesta seção.
        </p>
      ) : (
        <ul
          aria-label="Decks deste guia"
          className="flex flex-col divide-y divide-border border-y border-border"
          data-slot="guide-deck-list"
        >
          <li className="flex flex-wrap items-center gap-3 py-3">
            <Link
              className="flex min-h-11 min-w-0 flex-col gap-0.5 rounded-md text-body font-medium text-foreground hover:text-brand"
              to={deckHref(guideDeck?.id ?? `guide:${guideId}`)}
            >
              <span className="flex items-center gap-2">
                <LayersIcon aria-hidden="true" className="size-4 shrink-0 text-faint" />
                Guia inteiro
              </span>
              <span className="ps-6 text-caption text-faint">
                {guideDeck?.cardCount ?? total} cards ancorados neste guia
              </span>
            </Link>
            <div className="ms-auto flex items-center gap-3">
              <Link
                className="inline-flex min-h-11 items-center text-meta font-semibold text-brand underline-offset-4 hover:underline"
                to={reviewHref({ deck: guideDeck?.id ?? `guide:${guideId}`, mode: "training" })}
              >
                Treinar
              </Link>
              <Link
                className="inline-flex min-h-11 items-center text-meta font-semibold text-brand underline-offset-4 hover:underline"
                to={reviewHref({ deck: guideDeck?.id ?? `guide:${guideId}`, mode: "review" })}
              >
                Estudar
              </Link>
            </div>
          </li>

          {chapterDecks.map((deck) => (
            <li className="flex flex-wrap items-center gap-3 py-3" key={deck.id}>
              <Link
                className="flex min-h-11 min-w-0 flex-col gap-0.5 rounded-md text-meta text-foreground hover:text-brand"
                to={deckHref(deck.id)}
              >
                <span className="truncate">{deck.title}</span>
                <span className="text-caption text-faint">
                  {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
                </span>
              </Link>
              <div className="ms-auto flex items-center gap-3">
                <Link
                  className="inline-flex min-h-11 items-center text-meta font-semibold text-brand underline-offset-4 hover:underline"
                  to={reviewHref({ deck: deck.id, mode: "training" })}
                >
                  Treinar
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center text-meta font-semibold text-brand underline-offset-4 hover:underline"
                  to={reviewHref({ deck: deck.id, mode: "review" })}
                >
                  Estudar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
