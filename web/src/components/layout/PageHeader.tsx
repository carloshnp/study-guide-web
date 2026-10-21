import type { ReactNode } from "react"

type PageHeaderProps = {
  /** Uppercase 12px accent label above the title. */
  kicker?: string
  title: string
  description?: string
  children?: ReactNode
}

/**
 * One h1 per page (`heading-hierarchy`), 66ch measure (`line-length-control`),
 * kicker above the title. Every route starts with this.
 */
export function PageHeader({ kicker, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex max-w-[var(--measure)] flex-col gap-3">
      {kicker ? (
        <p className="text-kicker uppercase text-brand">{kicker}</p>
      ) : null}
      <h1 className="font-heading text-chapter text-foreground sm:text-page">{title}</h1>
      {description ? (
        <p className="text-body text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  )
}
