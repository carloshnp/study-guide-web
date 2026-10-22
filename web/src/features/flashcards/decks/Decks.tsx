/**
 * `/flashcards/decks` — the deck browser.
 *
 * Decks are derived views on the server (a guide, one chapter, one section, and
 * "sem âncora" for standalone cards), so this page only groups and links: title,
 * card count, a direct "Treinar" for any deck, and the detail page for browsing.
 */

"use client"

import { LayersIcon, PlusIcon, SparklesIcon } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"

import { DECK_TYPE_LABELS, flashcardsApi, type Deck, type DeckType } from "../api"
import { Editor } from "../editor/Editor"
import { deckHref, reviewHref, statsHref } from "../links"
import { useResource } from "../useResource"

const TYPE_ORDER: DeckType[] = ["guide", "chapter", "section", "other"]

const TYPE_HINTS: Record<DeckType, string> = {
  chapter: "Um capítulo inteiro — bom para revisar antes da aula.",
  guide: "Todos os cards ancorados no guia.",
  other: "Cards sem âncora em nenhum guia.",
  section: "Uma seção específica, para revisar um trecho.",
}

function groupDecks(decks: Deck[]): { type: DeckType; decks: Deck[] }[] {
  return TYPE_ORDER.map((type) => ({
    decks: decks.filter((deck) => deck.type === type),
    type,
  })).filter((group) => group.decks.length > 0)
}

export function DeckRow({ deck }: { deck: Deck }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <Link
        className="group flex min-h-11 min-w-0 flex-col gap-0.5 rounded-md hover:text-brand"
        to={deckHref(deck.id)}
      >
        <span className="flex items-baseline gap-2">
          <LayersIcon aria-hidden="true" className="size-3.5 shrink-0 self-center text-faint" />
          <span className="text-body font-medium text-foreground group-hover:text-brand">
            {deck.title}
          </span>
        </span>
        <span className="text-caption text-faint">
          {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-2 self-start ps-5 sm:self-auto sm:ps-0">
        <Button render={<Link to={reviewHref({ deck: deck.id, mode: "training" })} />} size="sm">
          <SparklesIcon aria-hidden="true" />
          Treinar
        </Button>
        <Button render={<Link to={deckHref(deck.id)} />} size="sm" variant="outline">
          Abrir
        </Button>
      </div>
    </li>
  )
}

export function Decks() {
  const [editorOpen, setEditorOpen] = useState(false)
  const resource = useResource("decks", () => flashcardsApi.listDecks())
  const groups = resource.data ? groupDecks(resource.data) : []
  const total = resource.data?.reduce((sum, deck) => sum + deck.cardCount, 0) ?? 0

  return (
    <div className="flex flex-col gap-8" data-slot="flashcards-decks">
      <PageHeader
        description="Decks são visões derivadas dos seus cards: um por guia, um por capítulo e um por seção. Treine qualquer um a qualquer momento."
        kicker="Flashcards"
        title="Decks"
      >
        <div className="flex flex-wrap gap-2">
          <Button render={<Link to={reviewHref({ scope: "all" })} />}>
            <SparklesIcon aria-hidden="true" />
            Revisar agora
          </Button>
          <Button onClick={() => setEditorOpen(true)} variant="outline">
            <PlusIcon aria-hidden="true" />
            Novo card
          </Button>
          <Button render={<Link to={statsHref()} />} variant="outline">
            Estatísticas
          </Button>
        </div>
      </PageHeader>

      {resource.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-2" data-slot="decks-loading">
          <span className="sr-only">Carregando decks…</span>
          {[0, 1, 2].map((row) => (
            <div className="h-12 w-full rounded-card bg-code" key={row} />
          ))}
        </div>
      ) : null}

      {resource.status === "error" ? (
        <div
          className="flex max-w-[var(--measure)] flex-col gap-2 rounded-card border border-border bg-card p-6"
          data-slot="decks-error"
          role="status"
        >
          <p className="text-body font-semibold text-foreground">Não foi possível carregar os decks.</p>
          <p className="text-meta text-muted-foreground">{resource.error}</p>
          <Button className="w-fit" onClick={resource.reload} size="sm" variant="outline">
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {resource.status === "ready" && groups.length === 0 ? (
        <div
          className="flex max-w-[var(--measure)] flex-col gap-2 rounded-card border border-border bg-card p-6"
          data-slot="decks-empty"
          role="status"
        >
          <p className="text-body font-semibold text-foreground">Nenhum deck ainda.</p>
          <p className="text-meta text-muted-foreground">
            Selecione um trecho em qualquer capítulo e use “Criar card”, ou escreva um card
            avulso aqui.
          </p>
          <Button className="w-fit" onClick={() => setEditorOpen(true)} variant="outline">
            <PlusIcon aria-hidden="true" />
            Novo card
          </Button>
        </div>
      ) : null}

      {groups.length > 0 ? (
        <p className="text-meta text-muted-foreground">
          {`${resource.data?.length ?? 0} decks · ${total} ${total === 1 ? "card" : "cards"}`}
        </p>
      ) : null}

      {groups.map((group) => (
        <section
          aria-labelledby={`deck-group-${group.type}`}
          className="flex max-w-[var(--measure)] flex-col gap-2"
          key={group.type}
        >
          <div className="flex items-baseline gap-2">
            <h2
              className="font-heading text-h2 text-foreground"
              id={`deck-group-${group.type}`}
            >
              {DECK_TYPE_LABELS[group.type]}
            </h2>
            <span className="ms-auto text-caption text-faint tabular-nums">
              {group.decks.length}
            </span>
          </div>
          <p className="text-caption text-faint">{TYPE_HINTS[group.type]}</p>
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {group.decks.map((deck) => (
              <DeckRow deck={deck} key={deck.id} />
            ))}
          </ul>
        </section>
      ))}

      <p className="max-w-[var(--measure)] text-meta text-muted-foreground">
        A fila do dia intercala todos os guias. Para revisar só um capítulo, abra o deck do
        capítulo e use “Revisar” — a sessão fica restrita a ele.
      </p>

      <Editor
        onOpenChange={setEditorOpen}
        onSaved={() => resource.reload()}
        open={editorOpen}
      />
    </div>
  )
}
