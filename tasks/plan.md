# Plan: Estudos

Implements `SPEC.md`. TDD throughout: each task is one failing test, one minimal implementation,
one commit. No task writes code for a later task. The plan follows the capability map order.

## Phase 0: Scaffolding (1 session)

Goal: a repo that runs, tests, and shows an empty shell in the right style.

- `pyproject.toml`-free setup: `requirements.txt` (fastapi, uvicorn, pyyaml, pillow, pytest,
  httpx), `.venv`, `.gitignore` covering `data/`, `content/`, `builds/`, `current`,
  `sources.local.yaml`, `node_modules`, `.venv`, `dist`.
- `data/` as its own git repo (`.git/` inside, no remote).
- Vite + React + TS + Tailwind v4, then `npx shadcn@latest init @coss/style` and
  `npx shadcn@latest add @coss/ui`. Resolve any CLI mismatch before styling anything.
- `src/styles/globals.css`: coss tokens overridden with `design-system/estudos/MASTER.md` values,
  Montserrat `@font-face` pointing at `public/fonts/`, `--font-sans` wired, dark tokens under
  `.dark`, `color-scheme` per theme.
- Router skeleton: `/`, `/estantes`, `/g/:guideId`, `/g/:guideId/c/:chapterSlug`, `/busca`, 404.
- `Shell` layout with sidebar/drawer slots and a `<main id="conteudo">` focus target.

Checkpoint: `npm run dev` renders the shell at 375px without horizontal scroll, `npm run test`
passes with one trivial component test, `pytest -q` passes with one health test.

## Phase 1: content-store (2 sessions)

Seams: `pipeline.catalog.load`, `pipeline.ingest.ingest`.

- Test: a catalog entry missing `split` fails with the file and field named.
- Test: ingest of `aluminio-final.md` copies the guide plus every referenced asset, including
  `../assets/...` paths outside the guide folder, rewrites nothing yet, and writes `meta.json` with
  `sourcePath`, `sha256`, `ingestedAt`, `slug`.
- Test: ingesting the same source twice is idempotent when the hash matches; when it differs, the
  result reports drift and refuses to overwrite without `--force`.
- Test: reports, briefings, `part-*`, `*-baseline*` and `*-backup*` are rejected with a clear error.
- Implementation: `catalog.py`, `ingest.py`, `meta.json` contract, `data/` git commit per ingest.
- Adopt the five first guides and review `expected_chapters` against the real counts.

Checkpoint: `data/guides/` holds five guides, `git -C data log --oneline` shows five commits, the
source folders under `/run/media/carloshnp/D` are untouched (`stat` timestamps unchanged).

## Phase 2: content-build (3 sessions)

Seams: `pipeline.split.split_chapters`, `pipeline.assets.rewrite_links`, `pipeline.build.build_guide`.

- Test: split ignores `#` inside fenced code (the llm_chess trap) and cuts only at the catalogued
  level; front matter blocks (`Índice`, `How to use this guide`, `Contents`, `Conventions`,
  `A0 About this appendix`) are returned as `cover`, not chapters.
- Test: units are the heading tree down to H4 (magnésio has 71 H4), each with a stable id, level,
  title and parent, so the UI can nest checks.
- Test: image links resolve relative to the source file, get copied into the media cache, and are
  rewritten to `/media/<hash>/<width>.webp` with `width`, `height` and a 2x candidate.
- Test: the JSON contract for one chapter matches the documented shape, including `sections` and
  `images`.
- Implementation: `split.py`, `assets.py`, `search.py` document builder, `build.py` emitting
  `content/index.json`, `content/guides/<slug>/{guide.json,chapters/*.json}`, `content/search.json`.
- Build all five guides; assert chapter counts against `catalog.yaml`.

Checkpoint: `content/` totals under 3MB of JSON, media cache built once, rerunning the build with no
source change takes under 3 seconds (cache hit), and a deliberately broken image link fails the
build instead of passing silently.

## Phase 3: api (1 session)

Seams: `TestClient` on `/api/progress` and `/api/notes`.

- Test: `PUT /api/progress` with an unknown unit creates it; `GET` returns the map; repeated `PUT`
  is idempotent; invalid status returns 422.
- Test: `PUT /api/notes` stores empty text as deletion; `GET` returns the latest body and timestamp.
- Test: `/` serves `index.html`, an unknown path under `/g/` serves `index.html` (SPA fallback), and
  a missing `/media/...` returns 404 rather than HTML.
- Implementation: `db.py` (WAL, migrations as `CREATE TABLE IF NOT EXISTS`), `main.py` mounts,
  routers, `PUT` requiring a JSON body and returning the stored row.
- Schema: `progress(guide_id, unit_id, status, updated_at, PRIMARY KEY(guide_id, unit_id))`,
  `notes(guide_id, chapter_id, body, updated_at, PRIMARY KEY(guide_id, chapter_id))`.

Checkpoint: `sqlite3 ~/study-site/state.db 'select * from progress'` shows the row written by a test
call, and killing uvicorn mid-write does not corrupt the DB.

## Phase 4: web-shell + catalog-ui (2 sessions)

Seams: `SidebarTree` and `CoversGrid` components; route rendering.

- Test: sidebar renders guides grouped by subject, chapter rows expand to sections on demand, the
  active chapter is marked with `aria-current`.
- Test: covers page filters by subject with an unaccented query matching an accented label, and
  shows the documented empty state when nothing matches.
- Test: home shows the "continuar" row only when the API reports history.
- Implementation: `Shell`, `SidebarTree`, `TopBar`, `ThemeToggle` (auto/light/dark, persisted,
  no flash), `GuideList`, `CoversGrid`, `SubjectFilter` with a small fuzzy matcher.
- Data: `src/lib/api.ts` wrappers with typed responses; TanStack Query for caching.

Checkpoint: visual check at 375/768/1440 in both themes against `MASTER.md`, plus `axe` with zero
critical violations on home and covers.

## Phase 5: reader (3 sessions, the highest-risk phase)

Seams: `MarkdownRenderer`, `ChapterFigure`, `ChapterTable`.

- Test: `MarkdownRenderer` renders a `$$` block into a `.katex-display` node without
  `dangerouslySetInnerHTML` in our code.
- Test: a GFM table becomes a scroll container with `role="region"`, `aria-label`, and `scope` on
  headers; numeric cells get the tabular class.
- Test: an image node becomes a `figure` with `figcaption` from alt text, explicit dimensions, lazy
  loading, and a button that opens the lightbox.
- Test: headings render the injected check slot at h2/h3/h4 and keep anchor ids.
- Test: code fences render highlighted tokens and a 44px copy button.
- Implementation: component map (`h1..h4`, `p`, `a`, `ul/ol`, `blockquote`, `code/pre`, `table`,
  `img`, `hr`, `footnote`), route-level code splitting, KaTeX CSS imported only on chapter routes,
  `ChapterFigure` + lightbox `Dialog`, `ChapterTable` wrapper, in-page TOC from `sections`.
- Performance: memoize the renderer, verify a 500-line chapter stays under 100ms of scripting.

Checkpoint: open alumínio chapter 4 on the phone over Tailscale: math renders, the 40-row table
scrolls inside its container, the figure lightbox zooms, and there are zero console errors.

## Phase 6: progress-ui + notes-ui (2 sessions)

Seams: `useProgress`, `useNotes`, `SectionCheck`, `GuideMeter`.

- Test: toggling a check issues one `PUT`, updates optimistically, and rolls back on failure with a
  toast.
- Test: aggregate counts roll up from units to chapter to guide, with `review` counted separately.
- Test: notes autosave debounces to one request per burst and shows the saved state.
- Implementation: `useProgress` (TanStack Query mutation + cache patch), `SectionCheck`, `GuideMeter`,
  `ChapterNotes` sheet, `ContinueReading` stored per device in `localStorage` as the last route.
- Cross-device check: mark on the phone, reload on the desktop.

Checkpoint: progress survives a server restart, and the home meter matches the sum of chapter counts.

## Phase 7: search-ui (1 session)

Seam: `searchChapters(query)`.

- Test: MiniSearch index built from `content/search.json` finds `magnesio` for `magnésio`,
  `solucao solida` for `solução sólida`, and ranks titles above body hits.
- Test: `Command` palette opens with `Cmd/Ctrl+K`, arrow keys move, `Enter` navigates, `Esc` closes.
- Implementation: index builder, query hook with debounce, result grouping, highlights, recent
  queries in `localStorage`.

Checkpoint: search a term with a typo-free but unaccented spelling on the phone and land on the
right chapter.

## Phase 8: deploy (1 session)

- `pipeline.publish`: run `npm run build`, copy `dist` + `content` + `media` into
  `builds/<timestamp>/`, run a smoke check (index, one chapter JSON, one media file), then swap
  `current` with `os.symlink` + `os.replace`.
- FastAPI reads through `current` per request.
- systemd user units: `estudos.service` (uvicorn on 127.0.0.1:8080, `Restart=on-failure`) and
  `estudos-watch.service` (inotifywait on the source roots, 30s debounce, `flock`, ignore
  `assets/`, `relatorios/`, `reports/`, `research/`, `plans/`).
- `tailscale serve --bg --https=443 http://127.0.0.1:8080`; if certificates are refused, enable
  HTTPS for the tailnet first and record it in the README.
- README with the exact commands from `SPEC.md`, plus `npx playwright install chromium`.

Checkpoint: a build during an active read leaves the served page intact; `systemctl --user status`
shows both units green; the phone opens the HTTPS URL with a valid certificate.

## Risks and mitigations

| Risk | Mitigation |
|:---|:---|
| `react-markdown` + KaTeX make a heavy chapter slow on a mid-range phone | route-level splitting, KaTeX CSS per route, memoized renderer, per-chapter markdown capped by split, measure on device before adding memo complexity |
| coss/ui CLI assumes a Next.js layout | run `init @coss/style` on the Vite app and fix the generated `globals.css`/font wiring by hand; treat the CLI output as source we own |
| Heading levels lie across guides | split level from the catalog, fence-aware parser, a test per real guide structure (llm_chess H2, benchmark H1 parts, DSA H1 chapters, magnésio H4) |
| Image paths escape the guide folder | rewrite at build time from the source file, fail the build on a missing target, verify with a link audit |
| Ingestion drift between `data/` and `/run/media` | hash on ingest, `pipeline.drift` report, no automatic merge, explicit `--force` |
| Watcher rebuild storms while an agent edits | debounce 30s, `flock`, atomic publish, ignore generated folders |
| Progress ids break when a heading is retitled | slug from normalized title plus a stored alias map per guide, orphans kept and reported, never silently deleted |
| Public repo leaking local paths or content | `sources.local.yaml` gitignored, `data/` its own repo, `git status` gate in the publish script |

## Parallel work

Phase 3 (api) can run in parallel with Phase 2 once the JSON contract is fixed in Phase 2's first
task. Phase 7 (search) can run any time after Phase 2. Everything else is sequential because each
phase consumes the previous contract.

## Definition of done for the plan

All nine success criteria in `SPEC.md` verified with real requests on the tailnet URL, both themes,
375px and 1440px, with a passing Playwright suite and a clean `git status` in the public repo.
