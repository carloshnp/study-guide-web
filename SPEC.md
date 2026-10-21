# Spec: Estudos, a study-guide site

Status: draft for approval. No implementation code exists yet.
Owner: Carlos (carloshnp). Agent: Hermes.
Repo: https://github.com/carloshnp/study-guide-web (public, code only, no content).
Runtime: single-user site on `carloshnp-2` (Tailscale 100.80.179.86), reachable at
`https://carloshnp-2.tailfa3301.ts.net/`.

## Objective

Turn the merged study-guide markdown that the `study-guide` workflow produces into a site
that can be read on a phone: one page per chapter, grouped by subject, with reading progress
that follows the user between devices. The corpus is curated, not discovered: only guides
confirmed in `catalog.yaml` are published.

Success means: open the site on the phone, pick Metalurgia, open chapter 4, read a chapter
with math, tables and figures, tick a section as done, close the browser, reopen on the
desktop, and see the same progress and notes.

Out of scope for v1: multi-user accounts, offline PWA, comments, the in-site chat, PDF
export from the UI, automatic media optimization for print, content editing in the browser.

## Capability map (Phase 0)

| Module id | Responsibility | Depends on |
|:---|:---|:---|
| `content-store` | Adopt a guide from a source folder into the site-owned data directory, record provenance, detect drift, keep a local git history | none |
| `content-build` | Split guides into chapters, rewrite links, emit JSON contracts, optimize images, build the search corpus | `content-store` |
| `api` | Serve the built SPA, store progress and notes in SQLite, stay single-user | none |
| `web-shell` | Vite + React Router shell: routing, layout, theme (auto/light/dark), sidebar/drawer, breadcrumbs | none |
| `catalog-ui` | Home list by subject plus a covers page with fuzzy subject search | `web-shell`, `content-build` |
| `reader` | Chapter page: markdown component map, KaTeX, code, tables, figures, lightbox, heading checkboxes | `web-shell`, `content-build`, `progress-ui` |
| `progress-ui` | Per-section done/review state, aggregate per chapter/guide, continue-reading entry point | `api`, `reader` |
| `notes-ui` | Per-chapter notes saved through the API | `api` |
| `search-ui` | MiniSearch over the built corpus, accent-insensitive, command palette and search page | `content-build` |
| `deploy` | systemd user units, inotify watcher, versioned publish with atomic symlink, `tailscale serve` | all |

Build order: `content-store` → `content-build` → `api` → `web-shell` → `catalog-ui` → `reader`
→ `progress-ui` → `notes-ui` → `search-ui` → `deploy`.

## Locked decisions (from the interview and the decision oracle)

| Decision | Choice |
|:---|:---|
| Catalog | Curated `catalog.yaml`, no auto-discovery. Absolute source paths live in a gitignored `sources.local.yaml`. |
| Content ownership | Ingest copies a guide once into `data/`; the copy becomes canonical for rendering and for future chat writes. The source folder is never overwritten. Drift is reported, never auto-merged. |
| Content history | `data/` is its own local git repository, no remote, one commit per ingest or rewrite. |
| Ingestion scope | Final guide markdown plus the assets it references (including assets outside the guide folder), never reports, briefings, backups, `part-*` files. |
| Frontend | Vite + React 19 + React Router 7 + Tailwind CSS v4, componentized, no raw HTML in `.tsx`. |
| UI kit | coss/ui (Base UI + Tailwind v4) installed through the shadcn CLI with the `@coss` registry. No shadcn default theme. |
| Markdown | `react-markdown` with `remark-gfm`, `remark-math`, `rehype-katex` and a full component map. No `dangerouslySetInnerHTML`. |
| Content delivery | Python build emits per-guide and per-chapter JSON; the SPA fetches it at runtime. |
| Search | MiniSearch over a build-generated corpus; fuzzy subject search on the covers page. |
| Serving | One FastAPI + uvicorn service for the SPA, `/content`, `/media` and the JSON API, bound to 127.0.0.1, published by `tailscale serve --bg --https=443`. |
| Publish | Build into `builds/<timestamp>/`, verify, then atomically repoint `current`. |
| Progress | Per heading unit (H2/H3/H4 when present), states `done` and `review`, aggregated upward; SQLite behind the API. |
| Notes | Per chapter text, saved through the API, empty by default. |
| Theme | `auto` by default, manual cycle light/dark, persisted per device. |
| First publish | Metalurgia (alumínio, titânio, magnésio), DSA, llm_chess L0/L1. |

## Design direction (ui-ux-pro-max Step 2)

Product type: long-form technical reading tool plus a light dashboard. Audience: one power user,
reading on a phone between tasks and on a laptop for study sessions.

Dials: **Variance 3** (calm, ordered, one accent), **Motion 2** (micro-interactions only),
**Density 5** (comfortable reading, dense lists).

Style family: modern technical editorial, sans-serif only, borrowed from
`capacitacao_ia_arquitetura/slides/index.html`: white surfaces, hairline borders, 14px cards,
uppercase kickers, one blue accent, tabular numerals in tables.

Anti-patterns rejected on purpose: serif body text, gradient hero, colored cards per subject,
emoji as icons, hover-only affordances, shadows on every element, full-bleed text measure.

Tokens, typography, spacing, motion and the per-page rules live in
`design-system/estudos/MASTER.md`. Design rules applied by name: `color-semantic`,
`line-length-control`, `readable-font-size`, `image-optimization`, `image-dimension`,
`bundle-splitting`, `touch-target-size`, `hover-vs-tap`, `focus-states`, `heading-hierarchy`,
`deep-linking`, `state-preservation`, `adaptive-navigation`, `number-tabular`,
`color-dark-mode`, `reduced-motion`, `focus-on-route-change`.

## Tech stack

Backend and pipeline: Python 3.14, FastAPI 0.133, uvicorn 0.41, Pillow 12, PyYAML, pytest,
ruff. SQLite 3 with WAL. No ORM.

Frontend: Node 26, npm 11, Vite, React 19, React Router 7, TypeScript strict, Tailwind CSS v4,
coss/ui via `npx shadcn@latest`, `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`,
`katex`, `rehype-highlight` (highlight.js), `minisearch`, `lucide-react` icons,
TanStack Query for server state, Vitest + Testing Library, Playwright for end-to-end.

Fonts: Montserrat variable woff2 copied from the slides folder (`montserrat-latin.woff2`,
`montserrat-latin-italic.woff2`), self-hosted, `font-display: swap`. Mono: system stack
(`ui-monospace`), no download.

## Commands

```bash
# setup
cd ~/study-site
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
npm install
npx shadcn@latest init @coss/style          # once, coss preset
npx shadcn@latest add @coss/ui              # all primitives

# dev
npm run dev                                  # Vite on :5173, proxying /api and /content to :8080
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8080

# content
.venv/bin/python -m pipeline.ingest "/run/media/carloshnp/D/.../aluminio-final.md" \
  --slug aluminio --title "Alumínio" --subject metalurgia --type teoria --split 2
.venv/bin/python -m pipeline.build --all     # JSON, images, search corpus
.venv/bin/python -m pipeline.drift            # report sources that changed since ingest
.venv/bin/python -m pipeline.publish          # npm build + builds/<ts> + symlink swap

# tests
.venv/bin/pytest -q                           # backend, pipeline, API
npm run test                                  # Vitest + Testing Library
npm run test:e2e                              # Playwright, mobile and desktop projects
npm run typecheck && npm run lint && .venv/bin/ruff check .

# serve
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080
tailscale serve --bg --https=443 http://127.0.0.1:8080
tailscale serve status
```

## Project structure

```
~/study-site/
  SPEC.md                      this document
  catalog.yaml                 published guides, one entry each (in git)
  sources.local.yaml           absolute source paths (gitignored)
  data/                        canonical corpus, local git repo, NOT on GitHub
    guides/<subject>/<slug>/   guide.md, assets/, meta.json
    .git/
  pipeline/                    Python build
    catalog.py                 load and validate catalog.yaml
    ingest.py                  adopt a source, copy referenced assets, hash, provenance
    split.py                   fence-aware heading scan, chapter units, front matter
    assets.py                  resolve links, resize, WebP cache keyed by content hash
    search.py                  search corpus documents
    build.py                   orchestrate, emit content/
    publish.py                 build SPA, version dir, symlink swap
    drift.py                   compare stored hashes against sources.local.yaml
  content/                     generated JSON + media cache (gitignored)
    index.json  search.json  guides/<slug>/{guide.json,chapters/*.json}
    media/<sha256>/<width>.webp
  app/                         FastAPI
    main.py                    static mounts, SPA fallback, /api router
    db.py                      SQLite schema and connection (WAL)
    api/progress.py            GET/PUT /api/progress
    api/notes.py               GET/PUT /api/notes
  web/                         Vite app
    src/main.tsx  src/router.tsx
    src/routes/                home, covers, guide, chapter, search, not-found
    src/features/reader/       MarkdownRenderer + node components + lightbox
    src/features/progress/     useProgress, SectionCheck, GuideMeter
    src/features/notes/        ChapterNotes
    src/features/search/       useSearch, SearchDialog
    src/features/catalog/      GuideList, CoversGrid, SubjectFilter
    src/components/ui/         coss primitives (copied by the CLI, owned here)
    src/components/layout/     Shell, SidebarTree, TopBar, ThemeToggle
    src/lib/                   api client, slugs, formatting
    src/styles/globals.css     Tailwind v4 entry + coss tokens + Montserrat
    tests/                     unit and component tests
  e2e/                         Playwright specs
  design-system/estudos/MASTER.md
  systemd/                     user units for service and watcher
  builds/<timestamp>/          published builds
  current -> builds/<timestamp>
```

## Code style

React: one component per file, props typed, no inline HTML blobs, no `any`, no `dangerouslySetInnerHTML`,
data fetching through hooks in `src/lib`, Tailwind classes only (no CSS-in-JS), `cn()` helper for
conditionals.

```tsx
// src/features/progress/SectionCheck.tsx
import { Checkbox } from "@/components/ui/checkbox"
import { useProgress } from "./use-progress"

type SectionCheckProps = {
  guideId: string
  unitId: string
  title: string
}

export function SectionCheck({ guideId, unitId, title }: SectionCheckProps) {
  const { status, toggle } = useProgress(guideId, unitId)

  return (
    <Checkbox
      aria-label={`Marcar "${title}" como lido`}
      checked={status === "done"}
      onCheckedChange={() => toggle("done")}
      className="size-5"
    />
  )
}
```

Python: type hints on public functions, dataclasses for contracts, no prints in library code,
errors raised with the file path in the message, one module per pipeline stage.

## Testing strategy (TDD, vertical slices)

Framework: pytest for pipeline and API, Vitest + Testing Library for components and hooks,
Playwright for the flows that must work on a phone.

**Seams under test (must be confirmed before writing tests):**

1. `pipeline.split.split_chapters(markdown, level) -> list[Chapter]` — pure, no I/O.
2. `pipeline.assets.rewrite_links(markdown, source_file, media_root) -> (markdown, images)` — pure.
3. `pipeline.ingest.ingest(source, data_root, meta) -> IngestResult` — filesystem, temp dirs.
4. `pipeline.catalog.load(path) -> Catalog` — validation errors are part of the contract.
5. `pipeline.build.build_guide(slug, ...) -> Path` — writes the JSON contract.
6. `app.api.progress` and `app.api.notes` through `TestClient` — the HTTP contract only.
7. `MarkdownRenderer` — public component: markdown in, accessible DOM out.
8. `useProgress` and `useNotes` — hook behavior with a mocked fetch, optimistic update and rollback.
9. `SidebarTree`, `SectionCheck`, `CoversGrid`, `SearchPage` — rendered output and interaction.
10. Playwright flows: home → guide → chapter, mark section, reload persists, search with an
    unaccented query finds the accented heading, lightbox opens and closes.

Rules of the loop: one seam, one failing test, minimal implementation, repeat. Expected values
come from the source files and from the spec, never recomputed the way the code computes them.
No test at an unconfirmed seam.

Coverage expectations: every pipeline stage has at least one test for the happy path and one for
its documented failure (missing source, drift, broken asset, invalid catalog entry, oversized
chapter split). API endpoints: 200 and validation failure. No numeric coverage target.

## Boundaries

Always: run `.venv/bin/pytest -q` and `npm run test` before a commit; bump `catalog.yaml`
`updated` when a guide changes; keep `data/` out of the public repo; validate every catalog entry
against the schema; report broken asset links instead of skipping them.

Ask first: changing the JSON contract consumed by the SPA; adding a runtime dependency; changing
the SQLite schema; adding a new subject or renaming a guide id; touching more than five files in
one task.

Never: commit `data/`, `content/`, `builds/`, `current`, `.venv`, `node_modules`, or
`sources.local.yaml`; edit files inside the source folders under `/run/media/carloshnp/D`;
write raw HTML into `.tsx`; use `dangerouslySetInnerHTML`; invent content when a guide is missing;
serve without the tailnet.

## Success criteria

1. `catalog.yaml` publishes five guides: alumínio (29 chapters), titânio (39), magnésio (16),
   DSA (12), llm_chess L0/L1 (14), and `pipeline.build --all` exits zero.
2. Every chapter page loads its own markdown only (no page carries more than one chapter), and
   every image reference returns 200 from `/media`.
3. A chapter with math renders both `$...$` and `$$...$$` through KaTeX, and a 40-row table
   stays inside its own horizontal scroll container on a 375px viewport without page-level
   horizontal scroll.
4. Ticking a section on the phone and reloading on the desktop shows the same state; the guide
   meter and the home "continue" entry point agree with the API.
5. Search for `magnesio` (no accent) finds chapters that contain `magnésio`; the covers page
   filters subjects with a fuzzy query.
6. Theme follows the system, the manual cycle persists, and both themes pass 4.5:1 on body text.
7. Keyboard: every check, link and figure is reachable, focus is visible, route changes move
   focus to the main region.
8. `pipeline.publish` swaps `current` atomically: a request during a build never gets a partial
   page, and `tailscale serve status` shows HTTPS 443 to 127.0.0.1:8080.
9. `git status` in the public repo is clean of `data/`, `content/`, `builds/`.

## Assumptions

1. One user, no login: access control is the tailnet. The API trusts requests from localhost.
2. Images are served from a local cache; originals stay in `data/`.
3. Chapter numbering comes from the source headings, not from the catalog order.
4. The first publish uses `--split 2` for Metalurgia, llm_chess and benchmark, `--split 1` for DSA.
5. `gh` is installed but its auth state was not confirmed (it produced no output within 15s);
   pushing the repo is a task, not an assumption.
6. Chromium for Playwright must be installed once (`npx playwright install chromium`).
7. `data/` sits inside the project but is a separate git repository, so the public repo cannot
   accidentally include it.

## Open questions

1. Do you want the site to also list the older guides (Física, ResMat, Cálculo Numérico,
   benchmark-eval) in the catalog from day one, disabled, or to add them later as their own task?
2. Should `Estudos` be the document title and the visible brand, or only the tab title?
3. Chapter ids: derive from the heading slug (`04-solucao-solida`) or keep the source number
   (`cap-04`)? The first reads better in a URL, the second survives retitling.
