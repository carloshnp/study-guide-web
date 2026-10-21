import searchFixtureSource from "./search.json?raw"

import type { SearchDocument } from "../useSearch"

/**
 * Loads `search.json` through Vite's `?raw` import so the fixture keeps the exact shape the
 * Python build emits (a JSON array) without turning on `resolveJsonModule` for the app
 * tsconfig, and so tests exercise the same bytes the build writes.
 */
export const searchFixture = JSON.parse(searchFixtureSource) as SearchDocument[]
