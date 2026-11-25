/**
 * CodeMirror 6 Live Preview Markdown + MathJax editor with formatting toolbar.
 *
 * Designed to be lazy-loaded in its own Vite chunk so CodeMirror and MathJax
 * never inflate the initial application bundle.
 */

"use client"

import "./editor.css"

import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands"
import { Compartment, EditorSelection, EditorState } from "@codemirror/state"
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view"
import {
  BoldIcon,
  BracesIcon,
  Code2Icon,
  CodeIcon,
  Heading2Icon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  SigmaIcon,
  SparklesIcon,
  SquareFunctionIcon,
  Undo2Icon,
} from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { DEFAULT_SNIPPETS } from "./default-snippets"
import { createLatexSuiteExtension } from "./latex-suite"
import { createLivePreviewExtension } from "./live-preview"
import { createSlashCommandsExtension } from "./slash-commands"
import {
  DEFAULT_SNIPPETS_SOURCE,
  loadActiveSnippets,
  loadUserSnippetsSource,
  resetUserSnippetsSource,
  saveUserSnippetsSource,
} from "./user-snippets"

export type MarkdownNoteEditorProps = {
  value: string
  onChange: (next: string) => void
  ariaLabel?: string
  placeholder?: string
  onNavigateLink?: (href: string) => void
  className?: string
}

function wrapSelection(view: EditorView, before: string, after: string, fallback = ""): void {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const selected = doc.sliceString(from, to)

  // Case 1: The delimiters sit immediately outside the current selection (e.g. pressing Ctrl+B twice).
  const hasSurrounding =
    from >= before.length &&
    to + after.length <= doc.length &&
    doc.sliceString(from - before.length, from) === before &&
    doc.sliceString(to, to + after.length) === after

  if (hasSurrounding) {
    view.dispatch({
      changes: [
        { from: from - before.length, insert: "", to: from },
        { from: to, insert: "", to: to + after.length },
      ],
      selection: EditorSelection.range(from - before.length, to - before.length),
    })
    view.focus()
    return
  }

  // Case 2: The selection itself includes the opening & closing delimiters.
  if (
    selected.startsWith(before) &&
    selected.endsWith(after) &&
    selected.length >= before.length + after.length
  ) {
    const unwrapped = selected.slice(before.length, selected.length - after.length)
    view.dispatch({
      changes: { from, insert: unwrapped, to },
      selection: EditorSelection.range(from, from + unwrapped.length),
    })
    view.focus()
    return
  }

  // Case 3: Collapsed cursor inside an enclosing symmetric wrapper on the same line (e.g. `**wo|rd**`).
  if (from === to && before === after) {
    const line = doc.lineAt(from)
    const rel = from - line.from
    const openIdx = line.text.lastIndexOf(before, Math.max(0, rel - 1))
    const closeIdx = line.text.indexOf(after, rel)
    if (openIdx !== -1 && closeIdx !== -1 && openIdx + before.length <= rel && closeIdx >= rel) {
      const inner = line.text.slice(openIdx + before.length, closeIdx)
      if (!inner.includes(before)) {
        const absOpen = line.from + openIdx
        const absClose = line.from + closeIdx
        view.dispatch({
          changes: [
            { from: absOpen, insert: "", to: absOpen + before.length },
            { from: absClose, insert: "", to: absClose + after.length },
          ],
          selection: EditorSelection.cursor(from - before.length),
        })
        view.focus()
        return
      }
    }
  }

  const inner = selected || fallback
  const inserted = `${before}${inner}${after}`
  view.dispatch({
    changes: { from, insert: inserted, to },
    selection: EditorSelection.range(from + before.length, from + before.length + inner.length),
  })
  view.focus()
}

function toggleLinePrefix(view: EditorView, prefix: string): void {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  if (line.text.startsWith(prefix)) {
    view.dispatch({
      changes: { from: line.from, insert: "", to: line.from + prefix.length },
    })
  } else {
    view.dispatch({
      changes: { from: line.from, insert: prefix, to: line.from },
    })
  }
  view.focus()
}

function cycleHeading(view: EditorView): void {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const match = /^(#{1,6})\s+/.exec(line.text)
  let nextPrefix = "## "
  let replaceLen = 0
  if (match) {
    replaceLen = match[0].length
    const level = match[1].length
    if (level === 2) nextPrefix = "### "
    else if (level === 3) nextPrefix = "# "
    else nextPrefix = ""
  }
  view.dispatch({
    changes: { from: line.from, insert: nextPrefix, to: line.from + replaceLen },
  })
  view.focus()
}

function insertDisplayMath(view: EditorView): void {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  const before = from > 0 && view.state.doc.sliceString(from - 1, from) !== "\n" ? "\n$$\n" : "$$\n"
  const after = "\n$$"
  const insert = `${before}${selected}${after}`
  const cursor = from + before.length + selected.length
  view.dispatch({
    changes: { from, insert, to },
    selection: EditorSelection.cursor(cursor),
  })
  view.focus()
}

function insertTheoremCallout(view: EditorView): void {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  const prefix =
    from > 0 && view.state.doc.sliceString(from - 1, from) !== "\n"
      ? "\n>[!theorem] Definição\n>"
      : ">[!theorem] Definição\n>"
  const insert = `${prefix}${selected}`
  view.dispatch({
    changes: { from, insert, to },
    selection: EditorSelection.cursor(from + insert.length),
  })
  view.focus()
}

function ToolbarButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active || undefined}
      className="size-7 px-0"
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      size="icon-sm"
      title={label}
      type="button"
      variant={active ? "secondary" : "ghost"}
    >
      {children}
    </Button>
  )
}

export function MarkdownNoteEditor({
  ariaLabel = "Conteúdo da nota",
  className,
  onChange,
  onNavigateLink,
  placeholder = "Escreva em Markdown e LaTeX… Links internos (/g/guia/c/capitulo#secao) associam esta nota ao capítulo.",
  value,
}: MarkdownNoteEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const compartmentRef = useRef(new Compartment())
  const snippetsCompartmentRef = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  const onNavigateRef = useRef(onNavigateLink)
  const initialValueRef = useRef(value)
  const [sourceMode, setSourceMode] = useState(false)
  const [snippetsOpen, setSnippetsOpen] = useState(false)
  const [snippetsDraft, setSnippetsDraft] = useState("")
  const [snippetsError, setSnippetsError] = useState<string | null>(null)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onNavigateRef.current = onNavigateLink
  }, [onNavigateLink])

  useEffect(() => {
    const parent = hostRef.current
    if (!parent) return

    const compartment = compartmentRef.current
    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [
        history(),
        keymap.of([
          {
            key: "Mod-b",
            run: (view) => {
              wrapSelection(view, "**", "**")
              return true
            },
          },
          {
            key: "Mod-i",
            run: (view) => {
              wrapSelection(view, "*", "*")
              return true
            },
          },
          {
            key: "Mod-e",
            run: (view) => {
              wrapSelection(view, "`", "`")
              return true
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        compartment.of(
          createLivePreviewExtension({
            onNavigateLink: (href) => onNavigateRef.current?.(href),
            sourceMode: false,
          }),
        ),
        snippetsCompartmentRef.current.of(
          createLatexSuiteExtension({ snippets: loadActiveSnippets() }),
        ),
        createSlashCommandsExtension(),
        cmPlaceholder(placeholder),
        EditorView.contentAttributes.of({
          "aria-label": ariaLabel,
          "aria-multiline": "true",
          role: "textbox",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({ parent, state })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [ariaLabel, placeholder])

  // Reconfigure Live Preview vs Source Mode in-place without losing undo history.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: compartmentRef.current.reconfigure(
        createLivePreviewExtension({
          onNavigateLink: (href) => onNavigateRef.current?.(href),
          sourceMode,
        }),
      ),
    })
  }, [sourceMode])

  // Sync external note switches without disrupting active typing.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, insert: value, to: current.length },
      })
    }
  }, [value])

  const withView = (fn: (view: EditorView) => void) => {
    const view = viewRef.current
    if (view) fn(view)
  }

  const openSnippetsDialog = () => {
    setSnippetsDraft(loadUserSnippetsSource())
    setSnippetsError(null)
    setSnippetsOpen(true)
  }

  const saveSnippets = () => {
    const result = saveUserSnippetsSource(snippetsDraft)
    if (!result.ok) {
      setSnippetsError(result.error)
      return
    }
    setSnippetsError(null)
    viewRef.current?.dispatch({
      effects: snippetsCompartmentRef.current.reconfigure(
        createLatexSuiteExtension({ snippets: result.snippets }),
      ),
    })
    setSnippetsOpen(false)
  }

  const resetSnippets = () => {
    resetUserSnippetsSource()
    setSnippetsDraft(DEFAULT_SNIPPETS_SOURCE)
    setSnippetsError(null)
    viewRef.current?.dispatch({
      effects: snippetsCompartmentRef.current.reconfigure(
        createLatexSuiteExtension({ snippets: DEFAULT_SNIPPETS }),
      ),
    })
  }

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent", className)}
      data-slot="markdown-note-editor"
    >
      <div
        aria-label="Formatação da nota"
        className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2.5 py-1"
        role="toolbar"
      >
        <ToolbarButton label="Negrito (Ctrl+B)" onClick={() => withView((v) => wrapSelection(v, "**", "**"))}>
          <BoldIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Itálico (Ctrl+I)" onClick={() => withView((v) => wrapSelection(v, "*", "*"))}>
          <ItalicIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Título" onClick={() => withView(cycleHeading)}>
          <Heading2Icon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton label="Lista com marcadores" onClick={() => withView((v) => toggleLinePrefix(v, "- "))}>
          <ListIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" onClick={() => withView((v) => toggleLinePrefix(v, "1. "))}>
          <ListOrderedIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Citação" onClick={() => withView((v) => toggleLinePrefix(v, "> "))}>
          <QuoteIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Callout (Teorema)" onClick={() => withView(insertTheoremCallout)}>
          <SparklesIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton label="Código inline" onClick={() => withView((v) => wrapSelection(v, "`", "`"))}>
          <CodeIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Link" onClick={() => withView((v) => wrapSelection(v, "[", "](url)", "texto"))}>
          <Link2Icon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Matemática inline" onClick={() => withView((v) => wrapSelection(v, "$", "$"))}>
          <SigmaIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Matemática em bloco" onClick={() => withView(insertDisplayMath)}>
          <SquareFunctionIcon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton label="Desfazer" onClick={() => withView((v) => { undo(v); v.focus() })}>
          <Undo2Icon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Refazer" onClick={() => withView((v) => { redo(v); v.focus() })}>
          <Redo2Icon aria-hidden="true" className="size-3.5" />
        </ToolbarButton>

        <div className="ms-auto flex items-center gap-0.5">
          <ToolbarButton label="Editar snippets LaTeX" onClick={openSnippetsDialog}>
            <BracesIcon aria-hidden="true" className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={sourceMode}
            label="Modo fonte"
            onClick={() => setSourceMode((prev) => !prev)}
          >
            <Code2Icon aria-hidden="true" className="size-3.5" />
          </ToolbarButton>
        </div>
      </div>

      <div className="cm-notes-host" ref={hostRef} />

      <Dialog onOpenChange={setSnippetsOpen} open={snippetsOpen}>
        <DialogPopup className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Snippets LaTeX</DialogTitle>
            <DialogDescription>
              Formato compatível com Obsidian LaTeX Suite (<code>latex-snippets.js</code>). Salvo
              neste dispositivo.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-2">
            <Textarea
              aria-label="Código dos snippets LaTeX"
              className="min-h-80 font-mono text-caption"
              onChange={(event) => {
                setSnippetsDraft(event.target.value)
                setSnippetsError(null)
              }}
              spellCheck={false}
              value={snippetsDraft}
            />
            {snippetsError ? (
              <p className="text-caption text-warning" role="alert">
                {snippetsError}
              </p>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <Button
              className="me-auto"
              onClick={resetSnippets}
              size="sm"
              type="button"
              variant="outline"
            >
              Restaurar padrão
            </Button>
            <Button
              onClick={() => setSnippetsOpen(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button onClick={saveSnippets} size="sm" type="button">
              Salvar snippets
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  )
}
