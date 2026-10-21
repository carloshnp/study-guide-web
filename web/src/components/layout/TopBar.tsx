import { MenuIcon, SearchIcon } from "lucide-react"
import { Link } from "react-router"

import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { Button } from "@/components/ui/button"

type TopBarProps = {
  /** Opens the navigation drawer on viewports below the fixed sidebar. */
  onOpenNav: () => void
}

/**
 * Sticky top bar: navigation trigger under `lg`, brand, search entry point and the
 * settings menu (theme, panel width, side margin). 56px on phones, 64px from `md` (`viewport-units`, `fixed-element-offset`).
 */
export function TopBar({ onOpenNav }: TopBarProps) {
  return (
    <header className="sticky top-0 z-[var(--z-bar)] border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-[var(--bar-h-phone)] items-center gap-2 px-3 md:h-[var(--bar-h)] md:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon-xl"
          className="lg:hidden"
          aria-label="Abrir navegação"
          aria-controls="navegacao"
          onClick={onOpenNav}
        >
          <MenuIcon aria-hidden="true" />
        </Button>

        <Link
          to="/"
          className="me-auto flex min-w-0 items-center rounded-md px-1 py-1"
          aria-label="Estudos, início"
        >
          <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
            Estudos
          </span>
        </Link>

        <Link
          to="/busca"
          aria-label="Buscar"
          className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 ease-enter hover:bg-accent hover:text-foreground"
        >
          <SearchIcon aria-hidden="true" className="size-5" />
        </Link>

        <SettingsMenu />
      </div>
    </header>
  )
}
