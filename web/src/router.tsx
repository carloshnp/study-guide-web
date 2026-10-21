import { createBrowserRouter, type RouteObject } from "react-router"

import { Shell } from "@/components/layout/Shell"
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
      { path: "*", element: <NotFound /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
