import { Fragment } from "react"

import { highlightSegments } from "@/features/search/useSearch"

type HighlightedTextProps = {
  text: string
  query: string
  className?: string
}

/**
 * Renders text with every accent-insensitive match of the query wrapped in `<mark>`,
 * keeping the original spelling (`magnesio` highlights `magnésio`).
 */
export function HighlightedText({ text, query, className }: HighlightedTextProps) {
  return (
    <span className={className}>
      {highlightSegments(text, query).map((segment, index) =>
        segment.match ? (
          <mark
            key={index}
            className="rounded-[.2rem] bg-brand/16 px-0.5 text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </span>
  )
}
