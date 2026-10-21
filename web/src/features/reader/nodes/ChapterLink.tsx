/**
 * `a` of a chapter body.
 *
 * Three destinations, three behaviours: an external URL opens in a new tab with
 * `rel="noreferrer noopener"`; an app path (`/g/…`, `/busca`) goes through the
 * router so the shell, theme and scroll position survive; everything else — a
 * `#fragment` of the guide index, a `/media/…` file, a footnote reference — stays
 * a plain anchor so no client route is invented for it.
 */

import type { ReactNode } from "react"
import { Link } from "react-router"

import type { MdProps } from "./types"

const EXTERNAL = /^(?:https?:|mailto:|tel:)/i
const ASSET = /^\/(?:media|content|api)\//

export function isAppPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !ASSET.test(href)
}

export function ChapterLink({
  href = "",
  children,
  node: _node,
  ...props
}: MdProps<"a"> & { children?: ReactNode }) {
  if (EXTERNAL.test(href)) {
    return (
      <a
        className="font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
        href={href}
        rel="noreferrer noopener"
        target="_blank"
        {...props}
      >
        {children}
      </a>
    )
  }

  const className =
    "font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"

  if (isAppPath(href)) {
    return (
      <Link className={className} to={href} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <a className={className} href={href} {...props}>
      {children}
    </a>
  )
}
