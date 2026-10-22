/**
 * Card editor: one note in, one or more cards out.
 *
 * The same dialog serves both entry points the spec locks — the floating
 * "Criar card" button in the reader and the selection menu — plus editing an
 * existing note. A selection-seeded editor keeps its source quote read-only and
 * carries the anchor (`guideId`, `chapterSlug`, `sectionId`) so the card can
 * link back to the passage it came from.
 *
 * Preview runs through the reader's markdown + KaTeX stack; for a cloze note it
 * shows the numbered lacunas instead of the answers, which is exactly what the
 * review will ask.
 */

"use client"

import { BookMarkedIcon, LoaderCircleIcon, SaveIcon } from "lucide-react"
import { useId, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

import { FlashcardMarkdown } from "../FlashcardMarkdown"
import {
  CARD_KINDS,
  CARD_KIND_LABELS,
  flashcardsApi,
  type CardKind,
  type FlashcardNote,
  type NoteInput,
} from "../api"
import { clozeAnswerMarkdown, clozePreview } from "../cloze"

export type EditorSeed = {
  kind?: CardKind
  front?: string
  back?: string
  tags?: string
  guideId?: string | null
  chapterSlug?: string | null
  sectionId?: string | null
  sourceSnippet?: string | null
}

export type EditorProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-filled values, e.g. the selected passage. */
  seed?: EditorSeed
  /** Existing note to patch instead of creating. */
  note?: FlashcardNote | null
  className?: string
  onSaved?: (note: FlashcardNote) => void
}

type FormState = {
  kind: CardKind
  front: string
  back: string
  tags: string
}

function initialState(seed: EditorSeed | undefined, note: FlashcardNote | null | undefined): FormState {
  return {
    back: note?.back ?? seed?.back ?? "",
    front: note?.front ?? seed?.front ?? "",
    kind: note?.kind ?? seed?.kind ?? "basic",
    tags: note?.tags ?? seed?.tags ?? "",
  }
}

function validate(state: FormState): string[] {
  const errors: string[] = []
  if (state.front.trim() === "") errors.push("Escreva a frente do card.")
  if (state.kind === "cloze") {
    if (clozePreview(state.front).answers.length === 0) {
      errors.push("Marque ao menos uma lacuna com {{c1::resposta}}.")
    }
  } else if (state.back.trim() === "") {
    errors.push("Escreva a resposta do card.")
  }
  return errors
}

function KindPicker({
  onChange,
  value,
}: {
  onChange: (kind: CardKind) => void
  value: CardKind
}) {
  return (
    <div aria-label="Tipo de card" className="flex flex-wrap gap-1.5" role="group">
      {CARD_KINDS.map((kind) => {
        const selected = kind === value
        return (
          <button
            key={kind}
            aria-pressed={selected}
            className={cn(
              "min-h-11 rounded-md border px-3 text-meta transition-colors duration-150 ease-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected
                ? "border-brand bg-accent-soft font-semibold text-brand-ink"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            onClick={() => onChange(kind)}
            type="button"
          >
            {CARD_KIND_LABELS[kind]}
          </button>
        )
      })}
    </div>
  )
}

type EditorFormProps = {
  seed?: EditorSeed
  note?: FlashcardNote | null
  onOpenChange: (open: boolean) => void
  onSaved?: (note: FlashcardNote) => void
}

function EditorForm({ seed, note, onOpenChange, onSaved }: EditorFormProps) {
  const [state, setState] = useState<FormState>(() => initialState(seed, note))
  const [errors, setErrors] = useState<string[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const frontId = useId()
  const backId = useId()
  const tagsId = useId()

  const anchor = {
    chapterSlug: note?.chapterSlug ?? seed?.chapterSlug ?? null,
    guideId: note?.guideId ?? seed?.guideId ?? null,
    sectionId: note?.sectionId ?? seed?.sectionId ?? null,
  }
  const sourceSnippet = note?.sourceSnippet ?? seed?.sourceSnippet ?? null
  const preview = state.kind === "cloze" ? clozePreview(state.front) : null

  const update = (patch: Partial<FormState>) => {
    setState((current) => ({ ...current, ...patch }))
    setErrors([])
    setFailure(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validate(state)
    if (found.length > 0) {
      setErrors(found)
      return
    }

    const payload: NoteInput = {
      back: state.kind === "cloze" ? "" : state.back,
      chapterSlug: anchor.chapterSlug,
      front: state.front,
      guideId: anchor.guideId,
      kind: state.kind,
      sectionId: anchor.sectionId,
      sourceSnippet,
      tags: state.tags.trim(),
    }

    setSaving(true)
    setFailure(null)
    try {
      const saved = note
        ? await flashcardsApi.updateNote(note.id, payload)
        : await flashcardsApi.createNote(payload)
      onSaved?.(saved)
      onOpenChange(false)
    } catch (error) {
      setFailure(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void submit(event)}>
      <DialogHeader>
        <DialogTitle>{note ? "Editar card" : "Novo card"}</DialogTitle>
        <DialogDescription>
          Markdown e LaTeX são aceitos. Escrever com as próprias palavras é o que fixa o
          conteúdo — use o trecho de origem como pista, não como resposta.
        </DialogDescription>
      </DialogHeader>

      <DialogPanel className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-meta font-medium text-foreground">Tipo</span>
            <KindPicker onChange={(kind) => update({ kind })} value={state.kind} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={frontId}>
              {state.kind === "cloze" ? "Texto com lacunas" : "Frente"}
            </Label>
            <Textarea
              id={frontId}
              onChange={(event) => update({ front: event.target.value })}
              placeholder={
                state.kind === "cloze"
                  ? "A camada passiva é composta de {{c1::ferrita}} e cementita."
                  : "O que você precisa lembrar?"
              }
              rows={4}
              value={state.front}
            />
          </div>

          {state.kind === "cloze" ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-meta font-medium text-foreground">Lacunas identificadas</span>
              {preview && preview.answers.length > 0 ? (
                <ol className="flex flex-col gap-1">
                  {preview.answers.map((answer, index) => (
                    <li className="flex gap-2 text-meta text-muted-foreground" key={index}>
                      <span className="font-semibold text-brand-ink tabular-nums">
                        c{index + 1}
                      </span>
                      <span className="min-w-0 break-words">{answer}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-caption text-faint">
                  Nenhuma lacuna ainda. Use {"{{c1::resposta}}"} para marcar uma.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={backId}>Resposta</Label>
              <Textarea
                id={backId}
                onChange={(event) => update({ back: event.target.value })}
                placeholder="A resposta, de preferência em uma frase."
                rows={4}
                value={state.back}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={tagsId}>Tags</Label>
            <Input
              id={tagsId}
              onChange={(event) => update({ tags: event.target.value })}
              placeholder="magnesio, precipitacao"
              value={state.tags}
            />
            <p className="text-caption text-faint">Separe por vírgulas.</p>
          </div>

          {sourceSnippet ? (
            <div className="flex flex-col gap-1.5 rounded-card border border-border bg-code p-3">
              <span className="text-kicker uppercase text-faint">Trecho de origem</span>
              <p className="max-h-32 overflow-y-auto text-meta text-muted-foreground">
                {sourceSnippet}
              </p>
              <p className="flex items-center gap-1.5 text-caption text-faint">
                <BookMarkedIcon aria-hidden="true" className="size-3.5 shrink-0" />
                {[anchor.guideId, anchor.chapterSlug, anchor.sectionId]
                  .filter((part): part is string => Boolean(part))
                  .join(" › ")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-code/40 p-4">
          <span className="text-kicker uppercase text-faint">Prévia</span>
          <div className="flex flex-col gap-1">
            <span className="text-caption font-semibold text-muted-foreground">Pergunta</span>
            {preview ? (
              <FlashcardMarkdown markdown={preview.question} />
            ) : (
              <FlashcardMarkdown markdown={state.front} />
            )}
          </div>
          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <span className="text-caption font-semibold text-muted-foreground">Resposta</span>
            <FlashcardMarkdown
              markdown={preview ? clozeAnswerMarkdown(state.front) : state.back}
            />
          </div>
        </div>
      </DialogPanel>

      <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {errors.length > 0 || failure ? (
          <div className="flex flex-col gap-1 text-meta text-warning sm:me-auto" role="alert">
            {errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
            {failure ? <span>{failure}</span> : null}
          </div>
        ) : null}

        <Button
          disabled={saving}
          onClick={() => onOpenChange(false)}
          type="button"
          variant="outline"
        >
          Cancelar
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? (
            <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
          ) : (
            <SaveIcon aria-hidden="true" />
          )}
          {saving ? "Salvando…" : "Salvar card"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function Editor({ open, onOpenChange, seed, note, className, onSaved }: EditorProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className={cn("sm:max-w-3xl", className)} showCloseButton>
        {open ? (
          <EditorForm
            key={note ? `note:${note.id}` : `seed:${seed?.front ?? ""}`}
            note={note}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
            seed={seed}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  )
}
