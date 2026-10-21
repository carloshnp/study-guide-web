# Todo: Estudos

Ordered by dependency. One task per commit. Each task: failing test first, then implementation.
Verify with the command in the task, not with a claim.

## Phase 0: scaffolding

- [x] T00 Repo hygiene and runtime
  - Acceptance: `.gitignore` excludes `data/`, `content/`, `builds/`, `current`, `sources.local.yaml`, `.venv`, `node_modules`; `git remote -v` points at `github.com/carloshnp/study-guide-web`; `data/` is its own repo with no remote.
  - Verify: `git status --short`, `git -C data remote -v` (empty), `ls -a data/.git`.
  - Files: `.gitignore`, `README.md`.

- [x] T01 Python environment
  - Acceptance: `.venv` exists with fastapi, uvicorn, httpx, pyyaml, pillow, pytest; `pytest -q` collects one health test.
  - Verify: `.venv/bin/pytest -q`.
  - Files: `requirements.txt`, `requirements-dev.txt`, `app/main.py`, `tests/test_health.py`.

- [x] T02 Vite + React + TS + Tailwind + coss/ui
  - Acceptance: `npm run dev` serves the shell; `npx shadcn@latest init @coss/style` and `@coss/ui` completed; `src/components/ui/button.tsx` exists and is imported by the shell.
  - Verify: `npm run dev` then `curl -s localhost:5173 | head`, `npm run typecheck`.
  - Files: `package.json`, `vite.config.ts`, `tsconfig.json`, `web/src/main.tsx`, `web/src/components/ui/*`, `web/src/styles/globals.css`.

- [x] T03 Design tokens and Montserrat
  - Acceptance: `globals.css` carries every token from `design-system/estudos/MASTER.md` for light and dark, Montserrat loads from `web/public/fonts/`, no flash of wrong theme (inline `color-scheme` script).
  - Verify: both themes at 375px, computed `--font-sans` is Montserrat, `document.fonts.check("16px Montserrat")`.
  - Files: `web/src/styles/globals.css`, `web/public/fonts/montserrat-latin.woff2`, `web/public/fonts/montserrat-latin-italic.woff2`, `web/index.html`.

- [x] T04 Router and shell
  - Acceptance: routes `/`, `/estantes`, `/g/:guideId`, `/g/:guideId/c/:chapterSlug`, `/busca`, `*` render placeholders; skip link focuses `#conteudo`; sidebar collapses to a drawer under 768px.
  - Verify: `npm run test`, keyboard tab pass, 375px screenshot.
  - Files: `web/src/router.tsx`, `web/src/components/layout/Shell.tsx`, `web/src/components/layout/TopBar.tsx`, `web/src/routes/*`.

## Phase 1: content-store

- [x] T05 Catalog loader
  - Acceptance: valid YAML loads into typed entries; a missing `split` or unknown `subject` fails with the file and field named.
  - Verify: `.venv/bin/pytest tests/pipeline/test_catalog.py -q`.
  - Files: `pipeline/catalog.py`, `catalog.yaml`, `tests/pipeline/test_catalog.py`.

- [x] T06 Fence-aware heading scan
  - Acceptance: `#` inside fences never counts; returns heading list with level, title, line, and ignores front matter blocks by name.
  - Verify: `.venv/bin/pytest tests/pipeline/test_split.py -q` with fixtures from llm_chess and magnésio.
  - Files: `pipeline/split.py`, `tests/pipeline/test_split.py`, `tests/fixtures/*`.

- [x] T07 Ingest with asset resolution
  - Acceptance: copies the guide and every referenced asset, including `../` targets, writes `meta.json` with `sourcePath`, `sha256`, `ingestedAt`, `slug`; creates one commit in `data/`.
  - Verify: `.venv/bin/pytest tests/pipeline/test_ingest.py -q`, `git -C data log --oneline`.
  - Files: `pipeline/ingest.py`, `tests/pipeline/test_ingest.py`.

- [x] T08 Ingest refusals and drift
  - Acceptance: reports, briefings, `part-*`, `*-baseline*`, `*-backup*` rejected; same hash is a no-op; different hash reports drift and needs `--force`.
  - Verify: `.venv/bin/pytest tests/pipeline/test_ingest.py -q`, `.venv/bin/python -m pipeline.drift`.
  - Files: `pipeline/ingest.py`, `pipeline/drift.py`, `tests/pipeline/test_drift.py`.

- [x] T09 Adopt the first five guides
  - Acceptance: `data/guides/` holds alumínio, titânio, magnésio, DSA, llm_chess L0/L1 with assets; `catalog.yaml` records subject, type, split level and `expected_chapters`.
  - Verify: `.venv/bin/python -m pipeline.ingest --all --check`, `du -sh data/`.
  - Files: `catalog.yaml`, `sources.local.yaml`, `data/**`.

## Phase 2: content-build

- [x] T10 Chapter units down to H4
  - Acceptance: `split_chapters` returns chapters at the catalogued level with nested `sections` (H2/H3/H4) and stable ids namespaced by guide.
  - Verify: `.venv/bin/pytest tests/pipeline/test_split_units.py -q`.
  - Files: `pipeline/split.py`, `tests/pipeline/test_split_units.py`.

- [x] T11 Link rewriting and media cache
  - Acceptance: every image becomes `/media/<sha>/<w>.webp` with `width`, `height`, `webp` and `fallback`; missing targets fail the build; reruns hit the cache by hash.
  - Verify: `.venv/bin/pytest tests/pipeline/test_assets.py -q`, `find content/media -name '*.webp' | wc -l`.
  - Files: `pipeline/assets.py`, `tests/pipeline/test_assets.py`.

- [x] T12 JSON contract
  - Acceptance: `content/index.json`, `guide.json`, `chapters/*.json` match the documented shape; a contract test pins the keys.
  - Verify: `.venv/bin/pytest tests/pipeline/test_contract.py -q`, `jq . content/index.json | head`.
  - Files: `pipeline/build.py`, `tests/pipeline/test_contract.py`, `docs/contracts.md`.

- [x] T13 Build all five guides
  - Acceptance: chapter counts match `expected_chapters` (alumínio 29, titânio 39, magnésio 9, DSA 12, llm_chess 14); no asset 404 in the manifest.
  - Verify: `.venv/bin/python -m pipeline.build --all`, `.venv/bin/python -m pipeline.check-links`.
  - Files: `pipeline/build.py`, `pipeline/check_links.py`, `catalog.yaml`.

- [x] T14 Search corpus
  - Acceptance: `content/search.json` has one document per chapter with title, headings and body text stripped of markdown and math delimiters.
  - Verify: `.venv/bin/pytest tests/pipeline/test_search.py -q`, `jq length content/search.json`.
  - Files: `pipeline/search.py`, `tests/pipeline/test_search.py`.

## Phase 3: api

- [x] T15 Progress endpoints
  - Acceptance: `PUT /api/progress` upserts, `GET /api/progress` returns the map, invalid status is 422, repeated writes are idempotent.
  - Verify: `.venv/bin/pytest tests/api/test_progress.py -q`.
  - Files: `app/api/progress.py`, `app/db.py`, `tests/api/test_progress.py`.

- [x] T16 Notes endpoints
  - Acceptance: `PUT /api/notes` with empty text deletes, `GET` returns body and timestamp, long text capped at 20000 chars.
  - Verify: `.venv/bin/pytest tests/api/test_notes.py -q`.
  - Files: `app/api/notes.py`, `tests/api/test_notes.py`.

- [x] T17 Static mounts and SPA fallback
  - Acceptance: `/` serves the SPA, deep routes serve `index.html`, `/content` and `/media` are cacheable static mounts, missing media returns 404.
  - Verify: `.venv/bin/pytest tests/api/test_static.py -q`, `curl -sI localhost:8080/g/aluminio`.
  - Files: `app/main.py`, `tests/api/test_static.py`.

## Phase 4: shell and catalog UI

- [x] T18 Sidebar tree
  - Acceptance: groups by subject, expands chapters into sections, marks the active route, keyboard operable, 44px rows on touch.
  - Verify: `npm run test -- SidebarTree`.
  - Files: `web/src/components/layout/SidebarTree.tsx`, `web/src/components/layout/SidebarTree.test.tsx`.

- [x] T19 Home list and continue row
  - Acceptance: guide rows with type chip, chapter count, progress meter; "continuar" appears only with stored last-read route; empty state when the API is unreachable.
  - Verify: `npm run test -- GuideList`.
  - Files: `web/src/features/catalog/GuideList.tsx`, `web/src/routes/Home.tsx`, tests.

- [x] T20 Covers page with fuzzy subject search
  - Acceptance: card grid with cover or typographic placeholder; unaccented query matches accented subject; no-match state explains how to add a guide.
  - Verify: `npm run test -- CoversGrid`, manual check at 375px.
  - Files: `web/src/features/catalog/CoversGrid.tsx`, `web/src/features/catalog/SubjectFilter.tsx`, `web/src/routes/Covers.tsx`, tests.

## Phase 5: reader

- [x] T21 Markdown component map
  - Acceptance: headings, paragraphs, lists, links, blockquotes, inline code, code fences, tables, images, hr and footnotes all render through named components; no `dangerouslySetInnerHTML`.
  - Verify: `npm run test -- MarkdownRenderer`, `grep -r dangerouslySetInnerHTML web/src` returns nothing.
  - Files: `web/src/features/reader/MarkdownRenderer.tsx`, `web/src/features/reader/nodes/*.tsx`, tests.

- [x] T22 Math and code
  - Acceptance: `$...$` and `$$...$$` render via KaTeX, display math scrolls inside its block, code is highlighted and has a 44px copy button.
  - Verify: `npm run test -- Math`, on-device check of alumínio chapter 4.
  - Files: `web/src/features/reader/MarkdownRenderer.tsx`, `web/src/features/reader/nodes/CodeBlock.tsx`, `web/src/styles/globals.css`.

- [x] T23 Tables
  - Acceptance: each table sits in a labeled scroll region, headers use `scope`, numeric cells are tabular, 5+ column tables pin the first column on desktop, no page-level horizontal scroll at 375px.
  - Verify: `npm run test -- ChapterTable`, Playwright `tables` spec at 375px.
  - Files: `web/src/features/reader/nodes/DataTable.tsx`, tests.

- [x] T24 Figures and lightbox
  - Acceptance: `figure` with caption from alt, explicit dimensions, lazy loading, tap opens a dialog with zoom and a link to the original, `Esc` closes and focus returns.
  - Verify: `npm run test -- ChapterFigure`, Playwright `lightbox` spec.
  - Files: `web/src/features/reader/nodes/Figure.tsx`, `web/src/features/reader/Lightbox.tsx`, tests.

- [x] T25 Chapter page and guide cover
  - Acceptance: chapter route renders kicker, h1, sections, prev/next with titles, in-page TOC at `>= 1280px`, "voltar ao guia"; guide cover lists chapters with per-chapter progress and the migrated manual index.
  - Verify: Playwright `reader` spec, manual check at 1440px and 375px.
  - Files: `web/src/routes/Chapter.tsx`, `web/src/routes/Guide.tsx`, `web/src/features/reader/ChapterToc.tsx`, tests.

## Phase 6: progress and notes

- [x] T26 Section checks
  - Acceptance: check at h2/h3/h4 with 44px target on touch and a 20px gutter control on desktop; optimistic update with rollback and toast on failure; aggregate counts roll up.
  - Verify: `npm run test -- SectionCheck`, Playwright `progress` spec, cross-device manual check.
  - Files: `web/src/features/progress/SectionCheck.tsx`, `web/src/features/progress/useProgress.ts`, `web/src/features/progress/GuideMeter.tsx`, tests.

- [x] T27 Chapter notes
  - Acceptance: sheet with autosave debounced 800ms, saved indicator, empty notes delete the row, confirm before discarding a failed draft.
  - Verify: `npm run test -- ChapterNotes`.
  - Files: `web/src/features/notes/ChapterNotes.tsx`, `web/src/features/notes/useNotes.ts`, tests.

## Phase 7: search

- [x] T28 Search index and dialog
  - Acceptance: accent-insensitive match, title matches ranked above body, `Cmd/Ctrl+K` opens, arrow keys and `Enter` navigate, `Esc` closes, recent queries persist per device.
  - Verify: `npm run test -- SearchDialog`, Playwright `search` spec.
  - Files: `web/src/features/search/useSearch.ts`, `web/src/features/search/SearchDialog.tsx`, `web/src/routes/Search.tsx`, tests.

## Phase 8: deploy

- [x] T29 Publish with atomic swap
  - Acceptance: build into `builds/<ts>/`, smoke-check index, one chapter JSON and one media file, then swap `current`; a request during publish never sees a partial page.
  - Verify: `.venv/bin/pytest tests/pipeline/test_publish.py -q`, manual concurrent `curl` during publish.
  - Files: `pipeline/publish.py`, `tests/pipeline/test_publish.py`.

- [x] T30 systemd units and tailscale serve
  - Acceptance: `estudos.service` and `estudos-watch.service` enabled and green; watcher debounces 30s with `flock` and ignores generated folders; HTTPS 443 published to 127.0.0.1:8080.
  - Verify: `systemctl --user status estudos estudos-watch`, `tailscale serve status`, phone opens the URL.
  - Files: `systemd/estudos.service`, `systemd/estudos-watch.service`, `README.md`.

- [x] T31 End-to-end acceptance
  - Acceptance: all nine success criteria in `SPEC.md` demonstrated, Playwright suite green on mobile and desktop projects, `git status` clean of content and data.
  - Verify: `npm run test:e2e`, `git status --short`, manual pass on the phone.
  - Files: `e2e/*.spec.ts`, `docs/acceptance.md`.

## Later, deliberately not in v1

- Chat endpoint that writes into `data/` with a diff and explicit confirmation.
- Reading progress merge conflicts across devices.
- Offline PWA shell.
- Física, ResMat, Cálculo Numérico, benchmark-eval catalog entries.
- AWS deployment (build output to S3 + the API on a small compute target).
