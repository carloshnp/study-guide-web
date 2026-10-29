import { BookOpenIcon, HouseIcon, LayersIcon, SearchIcon, type LucideIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, Outlet, useLocation } from "react-router"

import { SidebarTree, type SidebarNode } from "@/components/layout/SidebarTree"
import { TopBar } from "@/components/layout/TopBar"
import { ProgressToastProvider } from "@/features/progress/ProgressToastProvider"
import { SearchDialog } from "@/features/search/SearchDialog"
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * Placeholder navigation until the catalog API exists (Phase 1/T18 replaces the tree
 * content, not the shell). Three destinations plus a note that guides arrive later.
 */
const PLACEHOLDER_NODES: SidebarNode[] = [
  { id: "inicio", title: "Início", to: "/" },
  { id: "estantes", title: "Estantes", to: "/estantes" },
  { id: "busca", title: "Busca", to: "/busca" },
  { id: "fixcards", title: "Flashcards", to: "/flashcards" },
]

const RAIL_LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Início", icon: HouseIcon },
  { to: "/estantes", label: "Estantes", icon: BookOpenIcon },
  { to: "/busca", label: "Busca", icon: SearchIcon },
  { to: "/flashcards", label: "Flashcards", icon: LayersIcon },
]

/**
 * Application shell: skip link, sticky top bar, icon rail from `md`, the drawer
 * (coss `Sheet`) opened from the top bar's menu button at every width, and the routed
 * page in `main#conteudo`. There is no permanent wide sidebar: the rail is the
 * desktop navigation too, so the reading column keeps its room.
 * Route changes move focus to the main region (`focus-on-route-change`) and close
 * the drawer.
 *
 * The shell also mounts the two globals exactly once: `ProgressToastProvider`
 * (the toast host `useProgress`/`useNotes` raise failures into) and the
 * `SearchDialog`, so `Cmd/Ctrl+K` works from every page. `/busca` still mounts its
 * own palette from the route (phase 7 owns that file); the shell skips the
 * duplicate there so only one dialog can ever open.
 */
export function Shell() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const lastPath = useRef(location.pathname)

  useEffect(() => {
    // Only route *changes* move focus (`focus-on-route-change`). Leaving the initial
    // load alone keeps the skip link first in the tab order.
    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname
    setNavOpen(false)
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <ProgressToastProvider>
      <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-[var(--z-toast)] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-meta focus:font-semibold focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>

      <TopBar onOpenNav={() => setNavOpen(true)} />

      <div className="flex w-full">
        <nav
          aria-label="Estantes (atalhos)"
          className="sticky top-[var(--bar-h)] hidden h-[calc(100dvh-var(--bar-h))] w-[var(--rail-w)] shrink-0 flex-col items-center gap-2 border-e border-border bg-card py-4 md:flex"
        >
          {RAIL_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 ease-enter hover:bg-accent hover:text-foreground"
            >
              <Icon aria-hidden="true" className="size-5" />
            </Link>
          ))}
        </nav>

        <main
          ref={mainRef}
          id="conteudo"
          tabIndex={-1}
          className="min-w-0 flex-1 px-[var(--content-gutter)] pb-24 pt-8"
        >
          {/* Centred by default and switchable to full width in the settings menu. */}
          <div className="mx-auto w-full max-w-[var(--content-max)]" data-slot="content-column">
            <Outlet />
          </div>
        </main>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetPopup
          id="navegacao"
          side="left"
          className="w-[min(86vw,320px)] max-w-none shadow-pop"
        >
          <SheetHeader>
            <SheetTitle>Navegação</SheetTitle>
            <SheetDescription>Estantes e guias publicados</SheetDescription>
          </SheetHeader>
          <SheetPanel>
            <SidebarTree
              nodes={PLACEHOLDER_NODES}
              label="Navegação"
              onNavigate={() => setNavOpen(false)}
            />
          </SheetPanel>
        </SheetPopup>
      </Sheet>

        {location.pathname.startsWith("/busca") ? null : <SearchDialog />}
      </div>
    </ProgressToastProvider>
  )
}
