import { HighlightedText } from "@/features/search/HighlightedText"
import { excerptFor, type SearchHit } from "@/features/search/useSearch"

type ResultSummaryProps = {
  hit: SearchHit
  query: string
}

/**
 * Body of one search result: chapter title, the heading that matched (when the hit came
 * from a heading) and a short excerpt around the first body match. Every piece is
 * highlighted with the accent-insensitive query.
 */
export function ResultSummary({ hit, query }: ResultSummaryProps) {
  const excerpt = excerptFor(hit.text, query)
  const showHeading = hit.matchedHeading !== null && hit.matchedHeading !== hit.title

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <HighlightedText
        className="truncate text-body font-semibold text-foreground"
        query={query}
        text={hit.title}
      />
      {showHeading ? (
        <HighlightedText
          className="truncate text-meta text-muted-foreground"
          query={query}
          text={hit.matchedHeading ?? ""}
        />
      ) : null}
      <HighlightedText
        className="line-clamp-2 text-meta text-muted-foreground"
        query={query}
        text={excerpt}
      />
    </span>
  )
}
