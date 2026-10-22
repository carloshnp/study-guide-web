import { createBrowserRouter, Navigate, type RouteObject } from "react-router"

import { Shell } from "@/components/layout/Shell"
import { DeckDetail } from "@/features/flashcards/decks/DeckDetail"
import { Decks } from "@/features/flashcards/decks/Decks"
import { Drafts } from "@/features/flashcards/drafts/Drafts"
import { Review } from "@/features/flashcards/review/Review"
import { Stats } from "@/features/flashcards/stats/Stats"
import { Chapter } from "@/routes/Chapter"
import { Covers } from "@/routes/Covers"
import { Guide } from "@/routes/Guide"
import { Home } from "@/routes/Home"
import { NotFound } from "@/routes/NotFound"
import { Search } from "@/routes/Search"

/**
 * Route table, shared by the browser router and by tests (which build a memory
 * router from the same objects, so a passing test covers the shipped routes).
 * Every route renders inside the shell, so the skip link, top bar and sidebar are
 * present on all of them, 404 included (`deep-linking`, `state-preservation`).
 *
 * `/flashcards` redirects to the deck browser: the feature's real entry points
 * are the decks list, a session and the stats, and a bare `/flashcards` should
 * never dead-end.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <Home /> },
      { path: "estantes", element: <Covers /> },
      { path: "g/:guideId", element: <Guide /> },
      { path: "g/:guideId/c/:chapterSlug", element: <Chapter /> },
      { path: "busca", element: <Search /> },
      { path: "flashcards", element: <Navigate replace to="/flashcards/decks" /> },
      { path: "flashcards/decks", element: <Decks /> },
      { path: "flashcards/decks/:deckId", element: <DeckDetail /> },
      { path: "flashcards/review", element: <Review /> },
      { path: "flashcards/drafts", element: <Drafts /> },
      { path: "flashcards/stats", element: <Stats /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
