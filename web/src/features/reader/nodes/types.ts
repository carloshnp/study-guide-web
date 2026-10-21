import type { ComponentPropsWithoutRef } from "react"

/** react-markdown hands the hast node along with the element props. */
export type MdProps<Tag extends keyof React.JSX.IntrinsicElements> =
  ComponentPropsWithoutRef<Tag> & {
    node?: unknown
  }
