/**
 * The review/training card: prompt → reveal → four ratings → corrective
 * feedback.
 *
 * The schedule belongs to the server (`onRate` posts one rating and returns what
 * happened); this component renders the labels, keeps the keyboard loop and
 * never advances without feedback — after `Again` the correct answer stays on
 * screen until `Espaço`/`Enter`, which is the reinforcement the spec requires.
 *
 * Keyboard: `Espaço` reveals, `1`–`4` rate, `Enter` = Good, `Esc` leaves.
 */

"use client"

import { ArrowRightIcon, ExternalLinkIcon, LayersIcon, RotateCcwIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"
import { errorMessage } from "@/lib/api"

import { FlashcardMarkdown } from "../FlashcardMarkdown"
import {
  CARD_KIND_LABELS,
  RATING_LABELS,
  REVIEW_RATINGS,
  type QueueCard,
  type ReviewRating,
  type ReviewResult,
  type SessionMode,
} from "../api"
import { answerForCard, questionForCard } from "../cloze"
import { previewIntervals } from "../intervals"
import { decksHref } from "../links"

type Phase = "prompt" | "answer" | "done"

export type ReviewSessionProps = {
  cards: QueueCard[]
  hasMore: boolean
  mode: SessionMode
  /** Whether ratings change the schedule; review mode always records. */
  reschedule: boolean
  onRate: (
    card: QueueCard,
    rating: ReviewRating,
    elapsedMs: number,
    options: { mode: SessionMode; reschedule: boolean },
  ) => Promise<ReviewResult>
  /** Fetches the answer from the note; the queue never carries it. */
  onResolveAnswer?: (card: QueueCard) => Promise<string>
  onContinue?: () => void
  onExit?: () => void
  /** Link back to the passage the card came from. */
  guideHrefFor?: (card: QueueCard) => string | null
  continuing?: boolean
}

const EMPTY_COUNTS: Record<ReviewRating, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  )
}

export function ReviewSession({
  cards,
  hasMore,
  mode,
  reschedule,
  onRate,
  onResolveAnswer,
  onContinue,
  onExit,
  guideHrefFor,
  continuing = false,
}: ReviewSessionProps) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("prompt")
  const [counts, setCounts] = useState<Record<ReviewRating, number>>(EMPTY_COUNTS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Record<number, string>>({})
  const [resolving, setResolving] = useState(false)
  const startedAt = useRef(Date.now())

  // A new batch (or a new session) starts from the first card.
  useEffect(() => {
    setIndex(0)
    setPhase("prompt")
    setCounts(EMPTY_COUNTS)
    setError(null)
    setResolved({})
    startedAt.current = Date.now()
  }, [cards])

  const card = cards[index] ?? null
  const question = card ? questionForCard(card) : ""
  const inlineAnswer = card ? answerForCard(card) : ""
  const revealAnswer =
    inlineAnswer.trim() !== "" ? inlineAnswer : card ? (resolved[card.id] ?? "") : ""

  const reveal = useCallback(async () => {
    if (!card || phase !== "prompt") return
    if (revealAnswer.trim() === "" && onResolveAnswer) {
      setResolving(true)
      setError(null)
      try {
        const answer = await onResolveAnswer(card)
        setResolved((current) => ({ ...current, [card.id]: answer }))
        setPhase("answer")
      } catch (failure) {
        setError(errorMessage(failure))
      } finally {
        setResolving(false)
      }
      return
    }
    setPhase("answer")
  }, [card, onResolveAnswer, phase, revealAnswer])

  const advance = useCallback(() => {
    if (index + 1 < cards.length) {
      setIndex((current) => current + 1)
      setPhase("prompt")
      startedAt.current = Date.now()
      return
    }
    setPhase("done")
  }, [cards.length, index])

  const rate = useCallback(
    async (rating: ReviewRating) => {
      if (!card || busy || phase !== "answer") return
      setBusy(true)
      setError(null)
      try {
        await onRate(card, rating, Date.now() - startedAt.current, {
          mode,
          reschedule,
        })
        setCounts((current) => ({ ...current, [rating]: current[rating] + 1 }))
        advance()
      } catch (failure) {
        setError(errorMessage(failure))
      } finally {
        setBusy(false)
      }
    },
    [advance, busy, card, mode, onRate, phase, reschedule],
  )

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === "Escape") {
        onExit?.()
        return
      }

      if (phase === "prompt" && (event.key === " " || event.key === "Enter")) {
        event.preventDefault()
        void reveal()
        return
      }

      if (phase === "answer") {
        if (event.key >= "1" && event.key <= "4") {
          event.preventDefault()
          void rate(Number(event.key) as ReviewRating)
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          advance()
          return
        }
        return
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [advance, onExit, phase, rate, reveal])

  if (cards.length === 0) {
    return (
      <div
        className="flex max-w-[var(--measure)] flex-col gap-3 rounded-card border border-border bg-card p-6"
        data-slot="review-empty"
        role="status"
      >
        <p className="text-body font-semibold text-foreground">Nada para revisar agora.</p>
        <p className="text-meta text-muted-foreground">
          A fila de hoje está vazia. Você pode treinar qualquer deck a qualquer momento — as
          avaliações do treino não mexem no cronograma.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link to={decksHref()} />} variant="outline">
            <LayersIcon aria-hidden="true" />
            Ver decks
          </Button>
        </div>
      </div>
    )
  }

  if (phase === "done") {
    const total = REVIEW_RATINGS.reduce((sum, rating) => sum + counts[rating], 0)
    return (
      <div
        className="flex max-w-[var(--measure)] flex-col gap-4 rounded-card border border-border bg-card p-6"
        data-slot="review-done"
        role="status"
      >
        <p className="text-kicker uppercase text-brand">Sessão concluída</p>
        <p className="font-heading text-h2 text-foreground">
          {total} {total === 1 ? "card avaliado" : "cards avaliados"}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-meta text-muted-foreground">
          {REVIEW_RATINGS.map((rating) => (
            <div className="flex gap-1.5" key={rating}>
              <dt>{RATING_LABELS[rating]}</dt>
              <dd className="font-semibold tabular-nums text-foreground">{counts[rating]}</dd>
            </div>
          ))}
        </dl>
        {mode === "training" ? (
          <p className="text-meta text-muted-foreground">
            {reschedule
              ? "As avaliações deste treino foram registradas no cronograma."
              : "Treino sem cronograma: nada mudou nas datas de revisão."}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {hasMore && onContinue ? (
            <Button disabled={continuing} onClick={onContinue}>
              <RotateCcwIcon aria-hidden="true" />
              {continuing ? "Carregando…" : "Continuar"}
            </Button>
          ) : null}
          <Button render={<Link to={decksHref()} />} variant="outline">
            <LayersIcon aria-hidden="true" />
            Voltar aos decks
          </Button>
        </div>
      </div>
    )
  }

  if (!card) return null

  // Training without reschedule changes nothing, so no interval is promised;
  // the buttons keep the four ratings and drop the date label.
  const showIntervals = !(mode === "training" && !reschedule)
  const intervals = previewIntervals(card.state)
  const progress = index + (phase === "prompt" ? 0 : 1)
  const guideHref = guideHrefFor?.(card) ?? null

  return (
    <div className="flex max-w-[var(--measure)] flex-col gap-4" data-slot="review-session">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-kicker uppercase text-brand">
            {mode === "training" ? "Treino" : "Revisão"} · {CARD_KIND_LABELS[card.kind]}
          </p>
          <p className="text-meta tabular-nums text-muted-foreground">
            {`${Math.min(index + 1, cards.length)} de ${cards.length}`}
          </p>
        </div>
        <Progress aria-label="Progresso da sessão" max={cards.length} value={progress} />
      </div>


      <section
        aria-label="Card"
        className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 sm:p-6"
        data-slot="review-card"
      >
        <FlashcardMarkdown markdown={question} />

        {phase === "prompt" ? (
          <Button
            className="w-fit"
            disabled={resolving}
            onClick={() => void reveal()}
            type="button"
          >
            {resolving ? "Buscando a resposta…" : "Mostrar resposta"}
            <Kbd aria-hidden="true">Espaço</Kbd>
          </Button>
        ) : (
          <div className="flex flex-col gap-4 border-t border-border pt-4" data-slot="review-answer">
            <span className="text-kicker uppercase text-faint">Resposta</span>
            {revealAnswer.trim() === "" ? (
              <p className="text-meta text-muted-foreground">
                Não foi possível carregar a resposta agora; ela aparece na avaliação.
              </p>
            ) : (
              <FlashcardMarkdown markdown={revealAnswer} />
            )}

            {phase === "answer" ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REVIEW_RATINGS.map((rating) => (
                  <Button
                    aria-label={
                      showIntervals
                        ? `${RATING_LABELS[rating]} ${intervals[rating]}`
                        : RATING_LABELS[rating]
                    }
                    disabled={busy}
                    key={rating}
                    onClick={() => void rate(rating)}
                    type="button"
                    variant={rating === 3 ? "default" : "outline"}
                  >
                    <span className="flex items-center gap-1.5">
                      <Kbd aria-hidden="true" className="bg-background/20 text-inherit">
                        {rating}
                      </Kbd>
                      <span className="whitespace-nowrap">
                        {RATING_LABELS[rating]}
                        {showIntervals ? ` ${intervals[rating]}` : ""}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {guideHref ? (
                  <Link
                    className="inline-flex min-h-11 w-fit items-center gap-1.5 text-meta font-semibold text-brand underline-offset-4 hover:underline"
                    to={guideHref}
                  >
                    <ExternalLinkIcon aria-hidden="true" className="size-4" />
                    Ver no guia
                  </Link>
                ) : null}
                <Button
                  className="ms-auto"
                  onClick={advance}
                  type="button"
                  variant="outline"
                >
                  {index + 1 < cards.length ? "Próximo card" : "Ver resumo"}
                  <ArrowRightIcon aria-hidden="true" />
                  <Kbd aria-hidden="true">Espaço</Kbd>
                </Button>
              </div>
              </>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="flex flex-wrap items-center gap-2 text-meta text-warning" role="alert">
            {error}
            <Button onClick={() => setError(null)} size="sm" type="button" variant="ghost">
              Fechar
            </Button>
          </p>
        ) : null}
      </section>
    </div>
  )
}
