/**
 * `/flashcards/review` — the session route.
 *
 * Reads its inputs from the URL so the header "Revisar" and a deck's "Treinar
 * agora" can both land here: `deck` (a deck session), `mode` (`training` only
 * with a deck), `scope` (`all` or `guide:`/`chapter:` for a filtered queue) and
 * `reschedule`. The session size is the spec's 20; `Continuar` asks for another
 * batch from the same source.
 */

"use client"

import { ArrowLeftIcon, LayersIcon } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"

import { answerFromNote } from "../cloze"
import {
  flashcardsApi,
  type QueueCard,
  type QueueResponse,
  type ReviewRating,
  type SessionMode,
} from "../api"
import { anchorHref, decksHref, hrefForScope, statsHref } from "../links"
import { useResource } from "../useResource"
import { ReviewSession } from "./ReviewSession"

/** One session = 20 cards, with "Continuar" for the rest (spec › Session size). */
export const SESSION_SIZE = 20

export function Review() {
  const [search] = useSearchParams()
  const navigate = useNavigate()

  const deckId = search.get("deck")
  const requestedMode = search.get("mode") === "training" ? "training" : "review"
  const mode: SessionMode = deckId ? requestedMode : "review"
  const scope = search.get("scope") ?? "all"

  // Review always schedules; only training carries the explicit toggle.
  const [trainingReschedule, setTrainingReschedule] = useState(
    search.get("reschedule") === "1",
  )
  const reschedule = mode === "review" ? true : trainingReschedule
  const [batch, setBatch] = useState(0)

  const source = deckId ? `deck:${deckId}` : `queue:${scope}`
  const resource = useResource(
    `review:${source}:${mode}:${reschedule ? "1" : "0"}:${batch}`,
    () =>
      deckId
        ? flashcardsApi.startDeckSession(deckId, { limit: SESSION_SIZE, mode, reschedule })
        : flashcardsApi.getQueue({ limit: SESSION_SIZE, scope }),
  )

  const session: QueueResponse | null = resource.data

  const rate = (
    card: QueueCard,
    rating: ReviewRating,
    elapsedMs: number,
    options: { mode: SessionMode; reschedule: boolean },
  ) =>
    flashcardsApi.reviewCard(card.id, {
      elapsedMs,
      mode: options.mode,
      rating,
      reschedule: options.reschedule,
    })

  // The queue never carries the answer; the authored note does.
  const resolveAnswer = async (card: QueueCard) => {
    const note = await flashcardsApi.getNote(card.noteId)
    return answerFromNote(note, card.template)
  }

  const nextBatch = () => setBatch((current) => current + 1)

  return (
    <div className="flex flex-col gap-6" data-slot="flashcards-review">
      <div className="flex flex-col gap-3">
        <Link
          className="inline-flex min-h-11 w-fit items-center gap-1.5 text-meta font-semibold text-brand underline-offset-4 hover:underline"
          to={decksHref()}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Decks
        </Link>

        <PageHeader
          description={
            mode === "training"
              ? "Ordem embaralhada. Sem o cronograma ligado, as avaliações só dão retorno — nada é persistido."
              : "Cartões devidos hoje, intercalados entre assuntos. Avalie de 1 a 4; o intervalo é calculado pelo servidor."
          }
          kicker="Flashcards"
          title={mode === "training" ? "Treino" : "Revisão"}
        >
          <div className="flex flex-wrap gap-2">
            <Button render={<Link to={decksHref()} />} size="sm" variant="outline">
              <LayersIcon aria-hidden="true" />
              Decks
            </Button>
            <Button render={<Link to={statsHref()} />} size="sm" variant="outline">
              Estatísticas
            </Button>
          </div>
        </PageHeader>
      </div>

      {resource.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3" data-slot="review-loading">
          <span className="sr-only">Carregando a sessão…</span>
          <div aria-hidden="true" className="flex flex-col gap-2">
            <div className="h-3 w-1/3 rounded bg-code" />
            <div className="h-32 w-full rounded-card bg-code" />
          </div>
        </div>
      ) : null}

      {resource.status === "error" ? (
        <div
          className="flex max-w-[var(--measure)] flex-col gap-2 rounded-card border border-border bg-card p-6"
          data-slot="review-error"
          role="status"
        >
          <p className="text-body font-semibold text-foreground">Não foi possível abrir a sessão.</p>
          <p className="text-meta text-muted-foreground">{resource.error}</p>
          <Button className="w-fit" onClick={resource.reload} size="sm" variant="outline">
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {session ? (
        <ReviewSession
          cards={session.cards}
          guideHrefFor={(card) => anchorHref(card.anchor) ?? hrefForScope(card.scope ?? "")}
          hasMore={session.hasMore}
          mode={mode}
          onContinue={nextBatch}
          onExit={() => navigate(decksHref())}
          onRate={rate}
          onRescheduleChange={setTrainingReschedule}
          onResolveAnswer={resolveAnswer}
          reschedule={reschedule}
        />
      ) : null}
    </div>
  )
}
