/**
 * One markdown entry point for every flashcard surface (editor preview, review
 * prompt/answer, deck browse).
 *
 * The reader's renderer is the heaviest dependency in the app (react-markdown +
 * KaTeX + highlight.js), so it keeps loading as its own chunk: the decks list is
 * useful before any markdown arrives.
 */

import { lazy, Suspense } from "react"

const MarkdownRenderer = lazy(async () => {
  const module = await import("@/features/reader/MarkdownRenderer")
  return { default: module.MarkdownRenderer }
})

export type FlashcardMarkdownProps = {
  markdown: string
  className?: string
}

export function FlashcardMarkdown({ markdown, className }: FlashcardMarkdownProps) {
  if (markdown.trim() === "") return null

  return (
    <Suspense fallback={<p className="text-meta text-muted-foreground">Carregando…</p>}>
      <MarkdownRenderer className={className} markdown={markdown} />
    </Suspense>
  )
}
