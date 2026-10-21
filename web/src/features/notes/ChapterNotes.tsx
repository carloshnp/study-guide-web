/**
 * Per-chapter notes in a sheet: right-hand panel on desktop, full-width on the
 * phone. Text autosaves 800ms after the last keystroke (MASTER.md › Notes), the
 * footer carries an explicit "Salvo" indicator, and a blank draft deletes the
 * note server-side.
 *
 * No destructive action without confirmation: if a save failed and the sheet is
 * closed (X, Esc, backdrop), the draft is not thrown away silently — an alert
 * dialog offers "Continuar editando", "Tentar de novo" or "Descartar".
 */

"use client"

import { CircleAlertIcon, CheckIcon, NotebookPenIcon } from "lucide-react"
import { useId, useState } from "react"

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useNotes, type NoteStatus } from "./useNotes"

export type ChapterNotesProps = {
  guideId: string
  chapterId: string
  chapterTitle?: string
  className?: string
}

function statusText(status: NoteStatus): string {
  if (status === "loading") return "Carregando…"
  if (status === "saving") return "Salvando…"
  if (status === "error") return "Não salvo"
  return "Salvo"
}

function StatusLine({ error, status }: { error: string | null; status: NoteStatus }) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "flex min-h-5 flex-wrap items-center gap-1.5 text-meta",
        status === "error" ? "text-warning" : "text-muted-foreground",
      )}
      data-slot="notes-status"
      role="status"
    >
      {status === "error" ? (
        <CircleAlertIcon aria-hidden="true" className="size-3.5 shrink-0" />
      ) : status === "saved" ? (
        <CheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
      ) : null}
      <span>{statusText(status)}</span>
      {status === "error" && error ? (
        <span className="w-full text-caption text-faint">{error}</span>
      ) : null}
    </p>
  )
}

export function ChapterNotes({
  guideId,
  chapterId,
  chapterTitle,
  className,
}: ChapterNotesProps) {
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const notes = useNotes(guideId, chapterId)
  const fieldId = useId()

  const close = () => {
    // Flush the debounce so a fast close never drops the last sentence.
    void notes.saveNow()
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true)
      return
    }
    if (notes.hasFailedDraft) {
      setConfirmOpen(true)
      return
    }
    close()
  }

  const confirmDiscard = () => {
    setConfirmOpen(false)
    notes.discard()
    setOpen(false)
  }

  const retryAndStay = async () => {
    const saved = await notes.retry()
    if (saved) setConfirmOpen(false)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)} data-slot="chapter-notes">
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        <NotebookPenIcon aria-hidden="true" />
        Anotações
      </Button>

      <Sheet onOpenChange={handleOpenChange} open={open}>
        <SheetPopup
          className="max-sm:w-full max-sm:max-w-none"
          closeProps={{ "aria-label": "Fechar anotações" }}
          side="right"
        >
          <SheetHeader>
            <SheetTitle>Anotações</SheetTitle>
            <SheetDescription>
              {chapterTitle ? `Capítulo: ${chapterTitle}` : "Suas anotações neste capítulo"}
            </SheetDescription>
          </SheetHeader>

          <SheetPanel className="flex min-h-0 flex-1 flex-col gap-3">
            <Label htmlFor={fieldId}>Suas anotações</Label>
            <Textarea
              id={fieldId}
              onChange={(event) => notes.change(event.target.value)}
              placeholder="O que vale lembrar deste capítulo?"
              rows={12}
              value={notes.draft}
            />
            <p className="text-caption text-faint">
              Salva sozinho 800 ms depois da última tecla. Apagar o texto apaga a anotação.
            </p>
          </SheetPanel>

          <SheetFooter>
            <div className="me-auto">
              <StatusLine error={notes.error} status={notes.status} />
            </div>
            {notes.status === "error" ? (
              <Button onClick={() => void notes.retry()} size="sm" variant="outline">
                Tentar de novo
              </Button>
            ) : null}
            <Button onClick={close} size="sm" variant="outline">
              Concluir
            </Button>
          </SheetFooter>
        </SheetPopup>
      </Sheet>

      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar anotações não salvas?</AlertDialogTitle>
            <AlertDialogDescription>
              A última gravação falhou. Se descartar agora, o texto escrito depois do
              último salvamento será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              Continuar editando
            </AlertDialogClose>
            <Button onClick={() => void retryAndStay()} type="button" variant="outline">
              Tentar de novo
            </Button>
            <Button onClick={confirmDiscard} type="button" variant="destructive">
              Descartar
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  )
}
