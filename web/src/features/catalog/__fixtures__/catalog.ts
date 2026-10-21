import aluminioSource from "./aluminio.json?raw"
import dsaSource from "./dsa.json?raw"
import indexSource from "./index.json?raw"
import titanioSource from "./titanio.json?raw"

import type { CatalogIndex, Guide } from "@/lib/catalog"
import type { StoredProgressStatus } from "@/lib/progress"

/**
 * Fixtures copied from the shapes `pipeline.build` writes (see `docs/contracts.md`),
 * trimmed to three guides so a failing assertion points at one row. Loaded through
 * Vite's `?raw` import for the same reason the search fixture does: the app tsconfig
 * keeps `resolveJsonModule` off.
 */
export const indexFixture = JSON.parse(indexSource) as CatalogIndex

export const guideFixtures: Record<string, Guide> = {
  aluminio: JSON.parse(aluminioSource) as Guide,
  dsa: JSON.parse(dsaSource) as Guide,
  titanio: JSON.parse(titanioSource) as Guide,
}

export type CatalogFetchOptions = {
  /** Units the fake API reports; empty means nothing marked yet. */
  progress?: Record<string, StoredProgressStatus>
  /** Which content file should answer 404. */
  missing?: "index" | "guide" | "all"
}

function jsonResponse(payload: unknown, ok = true, status = 200) {
  const body = JSON.stringify(payload)
  return {
    // `api.ts` reads the body with `text()` and parses it itself; content fetchers use `json()`.
    json: async () => payload,
    ok,
    status,
    text: async () => body,
  }
}

/**
 * A `fetch` stand-in for `vi.stubGlobal("fetch", vi.fn(catalogFetch()))`.
 * Content paths come from the fixtures, `/api/progress` from `options.progress`.
 */
export function catalogFetch(options: CatalogFetchOptions = {}) {
  return async (input: RequestInfo | URL) => {
    const path = String(input)

    if (path.startsWith("/api/progress")) {
      const units = options.progress ?? {}
      return jsonResponse({ count: Object.keys(units).length, guideId: null, units })
    }

    if (path === "/content/index.json") {
      if (options.missing === "index" || options.missing === "all") {
        return jsonResponse({ detail: "index.json missing" }, false, 404)
      }
      return jsonResponse(indexFixture)
    }

    const guideMatch = /^\/content\/guides\/([^/]+)\/guide\.json$/.exec(path)
    if (guideMatch) {
      const guide = guideFixtures[guideMatch[1] ?? ""]
      if (!guide || options.missing === "guide" || options.missing === "all") {
        return jsonResponse({ detail: "guide.json missing" }, false, 404)
      }
      return jsonResponse(guide)
    }

    return jsonResponse({ detail: "not found" }, false, 404)
  }
}
