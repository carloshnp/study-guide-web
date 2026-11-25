/**
 * Standalone right-sidebar notes workspace.
 *
 * Docked beside the reader on desktop (`lg+`) so guides remain readable and
 * selectable while taking notes; rendered as a right-hand `Sheet` on smaller
 * screens. Notes exist independently of any chapter and associate automatically
 * with chapters/sections through internal reader links present in the body.
 */

"use client"

import {
  ArrowLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  Link2Icon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Link, useNavigate, useParams } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import { errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  studyNotesApi,
  type NoteLink,
  type StudyNote,
  type StudyNoteSummary,
} from "./api"
import { useStudyNotes, type StudyNoteQuote } from "./StudyNotesContext"

function formatQuoteMarkdown(quote: StudyNoteQuote): string {
  return (quote.markdown ?? quote.text).trim()
}

function linkKey(link: NoteLink): string {
  return `${link.guideId}\0${link.chapterId}\0${link.sectionId ?? ""}`
}

function appendUniqueLink(existing: readonly NoteLink[], incoming: NoteLink): NoteLink[] {
  const key = linkKey(incoming)
  if (existing.some((item) => linkKey(item) === key)) return [...existing]
  return [...existing, incoming]
}

const MarkdownNoteEditor = lazy(async () => {
  const mod = await import("./editor/MarkdownNoteEditor")
  return { default: mod.MarkdownNoteEditor }
})

const AUTOSAVE_DELAY_MS = 800
const SAVED_BADGE_DURATION_MS = 5000
const DEFAULT_NOTE_TITLE = "Sem título"
const SIDEBAR_WIDTH_KEY = "estudos-notes-width"
const DEFAULT_SIDEBAR_WIDTH = 480
const MIN_SIDEBAR_WIDTH = 320

function readStoredSidebarWidth(): number {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY)
    const parsed = raw ? Number(raw) : Number.NaN
    if (Number.isFinite(parsed)) {
      const maxWidth = Math.max(
        MIN_SIDEBAR_WIDTH,
        Math.min(960, Math.floor(window.innerWidth * 0.85)),
      )
      return Math.min(maxWidth, Math.max(MIN_SIDEBAR_WIDTH, parsed))
    }
  } catch {
    // Ignore storage errors.
  }
  return DEFAULT_SIDEBAR_WIDTH
}

type FilterScope = "all" | "chapter"
type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error"

export type NotesSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function linkHref(link: NoteLink): string {
  const base = `/g/${encodeURIComponent(link.guideId)}/c/${encodeURIComponent(link.chapterId)}`
  return link.sectionId ? `${base}#${encodeURIComponent(link.sectionId)}` : base
}

function linkLabel(link: NoteLink): string {
  return link.sectionId
    ? `${link.guideId} / ${link.chapterId} #${link.sectionId}`
    : `${link.guideId} / ${link.chapterId}`
}

function summarize(note: StudyNote): StudyNoteSummary {
  const collapsed = note.body.replace(/\s+/g, " ").trim()
  const excerpt = collapsed.length > 180 ? `${collapsed.slice(0, 179).trimEnd()}…` : collapsed
  return {
    createdAt: note.createdAt,
    excerpt,
    id: note.id,
    links: note.links,
    title: note.title,
    updatedAt: note.updatedAt,
  }
}

export function NotesSidebar({ open, onOpenChange }: NotesSidebarProps) {
  const isDesktop = useMediaQuery("lg")
  const navigate = useNavigate()
  const { guideId, chapterSlug } = useParams()
  const { consumePendingQuote, pendingQuote } = useStudyNotes()
  const hasChapterContext = Boolean(guideId && chapterSlug)

  const [scope, setScope] = useState<FilterScope>("all")
  const [notes, setNotes] = useState<StudyNoteSummary[]>([])
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">("idle")
  const [listError, setListError] = useState<string | null>(null)

  const [activeNote, setActiveNote] = useState<StudyNote | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftBody, setDraftBody] = useState("")
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showSavedBadge, setShowSavedBadge] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState<number>(readStoredSidebarWidth)
  const [isResizing, setIsResizing] = useState(false)

  const failedSignatureRef = useRef<string | null>(null)
  const activeIdRef = useRef<number | null>(null)
  const draftRef = useRef({ body: "", links: [] as NoteLink[], title: "" })
  const savedTimerRef = useRef<number | null>(null)

  const [listReloadKey, setListReloadKey] = useState(0)

  const flashSavedBadge = useCallback(() => {
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current)
    }
    setShowSavedBadge(true)
    savedTimerRef.current = window.setTimeout(() => {
      setShowSavedBadge(false)
      savedTimerRef.current = null
    }, SAVED_BADGE_DURATION_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current)
      }
    }
  }, [])

  // Fall back to "all" when leaving a chapter route.
  const effectiveScope: FilterScope = hasChapterContext ? scope : "all"

  const refreshList = useCallback(() => {
    setListReloadKey((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const filter =
      effectiveScope === "chapter" && guideId && chapterSlug
        ? { chapterId: chapterSlug, guideId }
        : undefined
    Promise.resolve()
      .then(() => {
        if (cancelled) return
        setListStatus("loading")
        setListError(null)
        return studyNotesApi.listStudyNotes(filter)
      })
      .then((items) => {
        if (cancelled || !items) return
        setNotes(items)
        setListStatus("idle")
      })
      .catch((cause) => {
        if (cancelled) return
        setListError(errorMessage(cause))
        setListStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [chapterSlug, effectiveScope, guideId, listReloadKey, open])

  const persistActive = useCallback(
    async (
      noteId: number,
      title: string,
      body: string,
      explicitLinks?: NoteLink[],
    ): Promise<boolean> => {
      const cleanTitle = title.trim() || DEFAULT_NOTE_TITLE
      const linksToSend =
        explicitLinks !== undefined
          ? explicitLinks
          : draftRef.current.links.length > 0
            ? draftRef.current.links
            : undefined
      const signature = `${noteId}\0${cleanTitle}\0${body}\0${linksToSend ? linksToSend.map(linkKey).join(",") : ""}`
      setSaveStatus("saving")
      setSaveError(null)
      setShowSavedBadge(false)
      try {
        const saved = await studyNotesApi.updateStudyNote(noteId, {
          body,
          links: linksToSend,
          title: cleanTitle,
        })
        failedSignatureRef.current = null
        if (activeIdRef.current === noteId) {
          setActiveNote(saved)
          draftRef.current.links = saved.links
          setSaveStatus("saved")
          flashSavedBadge()
        }
        setNotes((prev) => {
          const summary = summarize(saved)
          const rest = prev.filter((item) => item.id !== saved.id)
          return [summary, ...rest]
        })
        return true
      } catch (cause) {
        failedSignatureRef.current = signature
        if (activeIdRef.current === noteId) {
          setSaveError(errorMessage(cause))
          setSaveStatus("error")
        }
        return false
      }
    },
    [flashSavedBadge],
  )

  const isDirty =
    activeNote !== null && (draftTitle !== activeNote.title || draftBody !== activeNote.body)

  useEffect(() => {
    if (!open || !activeNote || !isDirty) return
    const cleanTitle = draftTitle.trim() || DEFAULT_NOTE_TITLE
    const linksSig =
      draftRef.current.links.length > 0 ? draftRef.current.links.map(linkKey).join(",") : ""
    const signature = `${activeNote.id}\0${cleanTitle}\0${draftBody}\0${linksSig}`
    if (failedSignatureRef.current === signature) return

    const timer = window.setTimeout(() => {
      void persistActive(activeNote.id, draftTitle, draftBody)
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [activeNote, draftBody, draftTitle, isDirty, open, persistActive])

  const flushActiveIfDirty = useCallback(() => {
    if (!activeNote) return
    const { body, title } = draftRef.current
    if (title === activeNote.title && body === activeNote.body) return
    void persistActive(activeNote.id, title, body)
  }, [activeNote, persistActive])

  const handleOpenNote = async (noteId: number) => {
    flushActiveIfDirty()
    activeIdRef.current = noteId
    setSaveStatus("loading")
    setSaveError(null)
    setShowSavedBadge(false)
    failedSignatureRef.current = null
    try {
      const loaded = await studyNotesApi.getStudyNote(noteId)
      if (activeIdRef.current !== noteId) return
      setActiveNote(loaded)
      setDraftTitle(loaded.title)
      setDraftBody(loaded.body)
      draftRef.current = { body: loaded.body, links: loaded.links, title: loaded.title }
      setSaveStatus("saved")
    } catch (cause) {
      if (activeIdRef.current !== noteId) return
      setSaveError(errorMessage(cause))
      setSaveStatus("error")
    }
  }

  const handleCreateNote = async () => {
    flushActiveIfDirty()
    setSaveStatus("saving")
    setSaveError(null)
    setShowSavedBadge(false)
    failedSignatureRef.current = null
    try {
      const created = await studyNotesApi.createStudyNote({
        body: "",
        title: DEFAULT_NOTE_TITLE,
      })
      activeIdRef.current = created.id
      setActiveNote(created)
      setDraftTitle(created.title)
      setDraftBody(created.body)
      draftRef.current = { body: created.body, links: created.links, title: created.title }
      setNotes((prev) => [summarize(created), ...prev.filter((item) => item.id !== created.id)])
      setSaveStatus("saved")
      flashSavedBadge()
    } catch (cause) {
      setSaveError(errorMessage(cause))
      setSaveStatus("error")
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    setSaveError(null)
    try {
      await studyNotesApi.deleteStudyNote(noteId)
      setNotes((prev) => prev.filter((item) => item.id !== noteId))
      if (activeIdRef.current === noteId) {
        activeIdRef.current = null
        setActiveNote(null)
        setDraftTitle("")
        setDraftBody("")
        draftRef.current = { body: "", links: [], title: "" }
        setSaveStatus("idle")
        setShowSavedBadge(false)
      }
    } catch (cause) {
      setSaveError(errorMessage(cause))
      setSaveStatus("error")
    }
  }

  const handleRemoveLink = (target: NoteLink) => {
    if (!activeNote) return
    const targetKey = linkKey(target)
    const nextLinks = activeNote.links.filter((item) => linkKey(item) !== targetKey)
    draftRef.current.links = nextLinks
    setActiveNote((prev) => (prev ? { ...prev, links: nextLinks } : prev))
    void persistActive(activeNote.id, draftRef.current.title, draftRef.current.body, nextLinks)
  }

  const handleBackToList = () => {
    flushActiveIfDirty()
    activeIdRef.current = null
    setActiveNote(null)
    setSaveStatus("idle")
    setSaveError(null)
    refreshList()
  }

  const handleClose = () => {
    flushActiveIfDirty()
    onOpenChange(false)
  }

  const handleTitleChange = (next: string) => {
    failedSignatureRef.current = null
    setDraftTitle(next)
    draftRef.current.title = next
  }

  const handleBodyChange = (next: string) => {
    failedSignatureRef.current = null
    setDraftBody(next)
    draftRef.current.body = next
  }

  // Insert an incoming quote from the study-guide reader into the active note
  // (or create a fresh standalone note if none is open). The passage markdown goes
  // into the body while the guide/chapter/section reference attaches at the top.
  useEffect(() => {
    if (!open || !pendingQuote) return
    const quote = pendingQuote
    consumePendingQuote()
    const markdown = formatQuoteMarkdown(quote)
    const incomingLink: NoteLink = {
      chapterId: quote.chapterSlug,
      guideId: quote.guideId,
      sectionId: quote.sectionId,
    }

    const currentId = activeIdRef.current
    if (currentId !== null) {
      const prevBody = draftRef.current.body
      const separator = prevBody.trim().length > 0 ? "\n\n" : ""
      const nextBody = `${prevBody.trimEnd()}${separator}${markdown}`
      const nextLinks = appendUniqueLink(draftRef.current.links, incomingLink)
      failedSignatureRef.current = null
      draftRef.current.body = nextBody
      draftRef.current.links = nextLinks
      Promise.resolve().then(() => {
        setDraftBody(nextBody)
        setActiveNote((prev) => (prev ? { ...prev, links: nextLinks } : prev))
        void persistActive(currentId, draftRef.current.title, nextBody, nextLinks)
      })
      return
    }

    const title = quote.chapterTitle?.trim() || DEFAULT_NOTE_TITLE
    void studyNotesApi
      .createStudyNote({ body: markdown, links: [incomingLink], title })
      .then((created) => {
        activeIdRef.current = created.id
        setActiveNote(created)
        setDraftTitle(created.title)
        setDraftBody(created.body)
        draftRef.current = { body: created.body, links: created.links, title: created.title }
        setNotes((prev) => [summarize(created), ...prev.filter((item) => item.id !== created.id)])
        setSaveStatus("saved")
        flashSavedBadge()
      })
      .catch((cause) => {
        setSaveError(errorMessage(cause))
        setSaveStatus("error")
      })
  }, [consumePendingQuote, flashSavedBadge, open, pendingQuote, persistActive])

  const handleRetrySave = () => {
    if (!activeNote) return
    failedSignatureRef.current = null
    void persistActive(activeNote.id, draftRef.current.title, draftRef.current.body)
  }

  const handleStartResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const target = event.currentTarget
    const pointerId = event.pointerId
    target.setPointerCapture?.(pointerId)
    setIsResizing(true)

    const onMove = (moveEvent: PointerEvent) => {
      const maxWidth = Math.max(
        MIN_SIDEBAR_WIDTH,
        Math.min(960, Math.floor(window.innerWidth * 0.85)),
      )
      const nextWidth = Math.min(
        maxWidth,
        Math.max(MIN_SIDEBAR_WIDTH, Math.round(window.innerWidth - moveEvent.clientX)),
      )
      setSidebarWidth(nextWidth)
    }

    const onEnd = () => {
      setIsResizing(false)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onEnd)
      window.removeEventListener("pointercancel", onEnd)
      setSidebarWidth((finalWidth) => {
        try {
          window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(finalWidth))
        } catch {
          // Ignore storage errors.
        }
        return finalWidth
      })
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onEnd)
    window.addEventListener("pointercancel", onEnd)
  }

  if (!open) return null

  const workspaceBody = (
    <div className="flex min-h-0 flex-1 flex-col" data-slot="notes-workspace">
      <div
        className="flex items-center gap-1.5 border-b border-border px-3 py-2.5"
        data-slot="notes-topbar"
      >
        {activeNote ? (
          <>
            <Button
              aria-label="Voltar às notas"
              onClick={handleBackToList}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ArrowLeftIcon aria-hidden="true" className="size-4" />
            </Button>

            <input
              aria-label="Título da nota"
              className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 font-heading text-h4 text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Sem título"
              type="text"
              value={draftTitle}
            />

            {saveStatus === "saving" ? (
              <span
                aria-live="polite"
                className="shrink-0 text-caption text-muted-foreground"
                data-slot="notes-save-status"
                role="status"
              >
                Salvando…
              </span>
            ) : saveStatus === "saved" && showSavedBadge ? (
              <span
                aria-live="polite"
                className="inline-flex shrink-0 items-center gap-1 text-caption text-muted-foreground"
                data-slot="notes-save-status"
                role="status"
              >
                <CheckIcon aria-hidden="true" className="size-3 shrink-0" />
                Salvo
              </span>
            ) : saveStatus === "error" ? (
              <span
                aria-live="polite"
                className="inline-flex shrink-0 items-center gap-1 text-caption text-warning"
                data-slot="notes-save-status"
                role="status"
                title={saveError ?? "Falha ao salvar"}
              >
                <CircleAlertIcon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="max-w-24 truncate">{saveError ?? "Erro"}</span>
                <Button
                  className="h-6 px-1.5 text-caption"
                  onClick={handleRetrySave}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Tentar de novo
                </Button>
              </span>
            ) : null}

            <Button
              aria-label="Excluir nota"
              onClick={() => void handleDeleteNote(activeNote.id)}
              size="icon-sm"
              title="Excluir nota"
              type="button"
              variant="ghost"
            >
              <Trash2Icon aria-hidden="true" className="size-4 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <div className="me-auto min-w-0 ps-1">
              <h2 className="truncate font-heading text-h4 text-foreground">Anotações</h2>
            </div>

            <Button
              onClick={() => void handleCreateNote()}
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusIcon aria-hidden="true" className="size-4" />
              Nova nota
            </Button>
          </>
        )}

        <Button
          aria-label="Fechar anotações"
          onClick={handleClose}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {!activeNote ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {hasChapterContext ? (
            <div className="flex items-center gap-1.5" role="group" aria-label="Filtro de notas">
              <Button
                aria-pressed={effectiveScope === "all"}
                onClick={() => setScope("all")}
                size="sm"
                type="button"
                variant={effectiveScope === "all" ? "default" : "outline"}
              >
                Todas
              </Button>
              <Button
                aria-pressed={effectiveScope === "chapter"}
                onClick={() => setScope("chapter")}
                size="sm"
                type="button"
                variant={effectiveScope === "chapter" ? "default" : "outline"}
              >
                Deste capítulo
              </Button>
            </div>
          ) : null}

          {listStatus === "error" && listError ? (
            <div className="flex flex-col gap-2 rounded-card border border-warning/40 bg-warning/8 p-3 text-meta">
              <p className="text-warning">{listError}</p>
              <Button
                className="w-fit"
                onClick={refreshList}
                size="sm"
                type="button"
                variant="outline"
              >
                Tentar de novo
              </Button>
            </div>
          ) : null}

          {listStatus === "loading" && notes.length === 0 ? (
            <p className="text-meta text-muted-foreground">Carregando notas…</p>
          ) : null}

          {listStatus !== "loading" && notes.length === 0 ? (
            <div className="rounded-card border border-dashed border-border p-4 text-meta text-muted-foreground">
              {effectiveScope === "chapter"
                ? "Nenhuma nota cita este capítulo ainda."
                : "Nenhuma nota criada ainda. Clique em “Nova nota” para começar."}
            </div>
          ) : null}

          <ul className="flex flex-col gap-2" data-slot="notes-list">
            {notes.map((item) => (
              <li key={item.id}>
                <button
                  className="flex w-full flex-col gap-1.5 rounded-card border border-border bg-background p-3 text-start transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => void handleOpenNote(item.id)}
                  type="button"
                >
                  <span className="truncate font-semibold text-foreground">{item.title}</span>
                  {item.excerpt ? (
                    <span className="line-clamp-2 text-caption text-muted-foreground">
                      {item.excerpt}
                    </span>
                  ) : (
                    <span className="text-caption text-faint">Nota vazia</span>
                  )}
                  {item.links.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.links.map((link) => (
                        <Badge
                          key={`${link.guideId}/${link.chapterId}/${link.sectionId ?? ""}`}
                          size="sm"
                          variant="secondary"
                        >
                          <Link2Icon aria-hidden="true" className="size-3" />
                          {link.guideId}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {activeNote.links.length > 0 ? (
            <div
              className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5"
              data-slot="note-links"
            >
              {activeNote.links.map((link) => {
                const label = linkLabel(link)
                return (
                  <span
                    key={linkKey(link)}
                    className="inline-flex items-center gap-1 rounded-sm border border-border bg-secondary py-0.5 ps-2 pe-1 text-caption text-foreground"
                  >
                    <Link
                      className="inline-flex items-center gap-1 hover:underline"
                      to={linkHref(link)}
                    >
                      <Link2Icon aria-hidden="true" className="size-3 shrink-0" />
                      <span className="max-w-44 truncate">{label}</span>
                    </Link>
                    <button
                      aria-label={`Remover vínculo ${label}`}
                      className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => handleRemoveLink(link)}
                      title="Remover vínculo"
                      type="button"
                    >
                      <XIcon aria-hidden="true" className="size-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col" data-slot="note-editor-slot">
            <Suspense
              fallback={
                <p className="p-4 text-meta text-muted-foreground">Carregando editor…</p>
              }
            >
              <MarkdownNoteEditor
                ariaLabel="Conteúdo da nota"
                onChange={handleBodyChange}
                onNavigateLink={(href) => {
                  if (href.startsWith("/")) {
                    void navigate(href)
                  } else {
                    window.open(href, "_blank", "noopener,noreferrer")
                  }
                }}
                value={draftBody}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <aside
        aria-label="Anotações"
        className={cn(
          "relative sticky top-[var(--bar-h)] flex h-[calc(100dvh-var(--bar-h))] shrink-0 flex-col border-s border-border bg-card",
          isResizing && "select-none",
        )}
        data-slot="notes-sidebar"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div
          aria-label="Redimensionar painel de anotações"
          aria-orientation="vertical"
          className={cn(
            "absolute inset-y-0 -start-1.5 z-20 w-3 cursor-col-resize transition-colors",
            isResizing ? "bg-brand/30" : "hover:bg-brand/20",
          )}
          data-slot="notes-resize-handle"
          onPointerDown={handleStartResize}
          role="separator"
        />
        {workspaceBody}
      </aside>
    )
  }

  return (
    <Sheet onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())} open={open}>
      <SheetPopup
        className="max-sm:w-full max-sm:max-w-none"
        showCloseButton={false}
        side="right"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Anotações</SheetTitle>
          <SheetDescription>Suas anotações independentes</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex min-h-0 flex-1 flex-col p-0">{workspaceBody}</SheetPanel>
      </SheetPopup>
    </Sheet>
  )
}
