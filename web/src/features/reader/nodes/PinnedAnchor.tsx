/**
 * A picture of a chapter, seen from the "imagem fixa" view.
 *
 * In that view the picture lives in the pinned pane, not in the text. The text
 * keeps a zero-height marker where the picture would sit, so the pane switches to
 * it when the reader reaches that place. The marker carries the picture's file and
 * caption; the pane looks up the rest (dimensions, srcset) in the chapter manifest.
 */

import type { MdProps } from "./types"

export function PinnedAnchor({ src = "", alt = "" }: MdProps<"img">) {
  if (src === "") return null
  return (
    <span
      aria-hidden="true"
      className="block h-0"
      data-alt={alt}
      data-pinned-anchor=""
      data-src={src}
    />
  )
}
