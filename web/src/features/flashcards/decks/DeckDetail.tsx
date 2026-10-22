/**
 * `/flashcards/decks/:id` — one deck, browsable.
 *
 * The list shows every card with its front, its source anchor and its state;
 * the two actions are "Treinar agora" (training, shuffled, no scheduling) and
 * "Revisar" (the same deck through the SRS). Browsing never fetches an answer:
 * the deck is a map of what is in there, not a second review.
 */

"use client"

import { ArrowLeftIcon, ExternalLinkIcon, SparklesIcon } from "lucide-react"
import { Link, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"

import { FlashcardMarkdown } from "../FlashcardMarkdown"
import {
  CARD_STATE_LABELS,
  DECK_TYPE_LABELS,
  flashcardsApi,
  isCardState,
} from "../api"
import { anchorHref, decksHref, reviewHref } from "../links"
import { useResource } from "../useResource"

export function DeckDetail() {
  const { deckId = "" } = useParams()
  const resource = useResource(`deck:${deckId}`, () => flashcardsApi.getDeck(deckId))
  const deck = resource.data
  const anchor =
    deck === null
      ? null
      : anchorHref({
          chapterSlug: deck.chapterSlug,
          guideId: deck.guideId,
          sectionId: deck.sectionId,
        })

  return (
    <div className="flex flex-col gap-6" data-slot="flashcards-deck-detail">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-meta font-semibold text-brand underline-offset-4 hover:underline"
        to={decksHref()}
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Decks
      </Link>

      {resource.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando o deck…</span>
          <div aria-hidden="true" className="flex flex-col gap-2">
            <div className="h-7 w-1/2 rounded bg-code" />
            <div className="h-24 w-full rounded-card bg-code" />
          </div>
        </div>
      ) : null}

      {resource.status === "error" ? (
        <div
          className="flex max-w-[var(--measure)] flex-col gap-2 rounded-card border border-border bg-card p-6"
          data-slot="deck-error"
          role="status"
        >
          <p className="text-body font-semibold text-foreground">Não foi possível abrir o deck.</p>
          <p className="text-meta text-muted-foreground">{resource.error}</p>
          <Button className="w-fit" onClick={resource.reload} size="sm" variant="outline">
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {deck ? (
        <>
          <PageHeader
            description={`${deck.cards.length} ${deck.cards.length === 1 ? "card" : "cards"} · ${DECK_TYPE_LABELS[deck.type]}`}
            kicker="Flashcards"
            title={deck.title}
          >
            <div className="flex flex-wrap gap-2">
              <Button render={<Link to={reviewHref({ deck: deck.id, mode: "training" })} />}>
                <SparklesIcon aria-hidden="true" />
                Treinar agora
              </Button>
              <Button
                render={<Link to={reviewHref({ deck: deck.id, mode: "review" })} />}
                variant="outline"
              >
                Revisar
              </Button>
              {anchor ? (
                <Button render={<Link to={anchor} />} variant="ghost">
                  <ExternalLinkIcon aria-hidden="true" />
                  Abrir no guia
                </Button>
              ) : null}
            </div>
          </PageHeader>

          {deck.cards.length === 0 ? (
            <p className="max-w-[var(--measure)] text-meta text-muted-foreground">
              Este deck está vazio. Crie um card a partir de um trecho do guia para começar.
            </p>
          ) : (
            <ol
              aria-label={`Cards de ${deck.title}`}
              className="flex max-w-[var(--measure)] flex-col divide-y divide-border border-y border-border"
              data-slot="deck-cards"
            >
              {deck.cards.map((card, position) => (
                <li className="flex flex-col gap-2 py-4" key={card.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-caption tabular-nums text-faint">
                      {String(position + 1).padStart(2, "0")}
                    </span>
                    <span className="rounded-chip border border-border px-2 py-0.5 text-kicker uppercase text-muted-foreground">
                      {isCardState(card.state) ? CARD_STATE_LABELS[card.state] : card.state}
                    </span>
                    <span className="text-caption text-faint">{card.template}</span>
                  </div>
                  <FlashcardMarkdown className="text-meta" markdown={card.front} />
                  {anchor ? (
                    <Link
                      className="inline-flex min-h-11 w-fit items-center gap-1.5 text-caption font-semibold text-brand underline-offset-4 hover:underline"
                      to={anchor}
                    >
                      <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
                      Ver no guia
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </div>
  )
}
