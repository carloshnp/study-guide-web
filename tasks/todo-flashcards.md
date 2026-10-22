# Todo: Flashcards (Estudos)

Ordered by dependency. One task per commit. Each task: failing test first, then
implementation. Verify with the command in the task, not with a claim.

## Phase A: dados e núcleo SRS

- [ ] T00 Flashcards schema and DB helpers
  - Acceptance: tables `notes`, `cards` (state incl. `deprecated` + `deprecated_at`), `revlog` (append-only), `habits`, `settings`; FK cascade note→cards→revlog; same SQLite connection as progress; helpers are the only way to write cards/revlog.
  - Verify: `.venv/bin/pytest tests/flashcards/test_db.py -q`.
  - Files: `app/db_flashcards.py`, `tests/flashcards/test_db.py`.

- [ ] T01 FSRS core transitions
  - Acceptance: rating 1–4 updates D/S/R per the stock FSRS formulas; intervals honor desired retention (global default 0.90 and per-guide override); fuzz applied; properties: Good never shrinks an interval, Again always shortens, intervals ordered by rating.
  - Verify: `.venv/bin/pytest tests/flashcards/test_scheduler.py -q` (incl. property tests).
  - Files: `app/flashcards/scheduler.py`, `tests/flashcards/test_scheduler.py`.

- [ ] T02 Learning steps, lapses, leech
  - Acceptance: same-day learning/relearning steps; lapse handling; at 8 lapses the card is flagged and suspended; deprecated cards are excluded from queues and stats.
  - Verify: `.venv/bin/pytest tests/flashcards/test_scheduler.py -q`.
  - Files: `app/flashcards/scheduler.py`, `tests/flashcards/test_scheduler.py`.

- [ ] T03 Queue, sessions, derived decks
  - Acceptance: due queue interleaves subjects by default; scope filters guide/chapter/section; a session yields exactly 20 cards then a continue signal; training mode is shuffled and does not reschedule unless the toggle is set; derived decks (guide/chapter/section/"outras") return the correct card sets.
  - Verify: `.venv/bin/pytest tests/flashcards/test_scheduler.py tests/flashcards/test_decks.py -q`.
  - Files: `app/flashcards/queue.py`, `app/flashcards/decks.py`, `tests/flashcards/test_decks.py`.

## Phase B: API

- [ ] T04 Notes and cards CRUD
  - Acceptance: create/update/delete notes; cloze `{{cN::…}}` generates one card per lacuna; reverse template generates the reverse card; regenerating a cloze note marks removed cards `deprecated` (history kept); invalid payloads fail with 422 naming the field.
  - Verify: `.venv/bin/pytest tests/flashcards/test_api_notes.py -q`.
  - Files: `app/routes/flashcards_notes.py`, `tests/flashcards/test_api_notes.py`.

- [ ] T05 Review endpoints
  - Acceptance: `GET queue` never includes answers; `POST review` validates rating 1–4 and elapsed_ms, appends revlog, updates habits; settings GET/POST support global + per-guide retention and flag values > 0.95.
  - Verify: `.venv/bin/pytest tests/flashcards/test_api_review.py -q`.
  - Files: `app/routes/flashcards_review.py`, `tests/flashcards/test_api_review.py`.

- [ ] T06 Stats, habits, decks endpoints
  - Acceptance: daily counts, true retention (mature ≥ 21 days), 14-day forecast, heatmap, streak with freeze (first missed day consumes a freeze; never negative), deck list/detail, `POST decks/<id>/session`.
  - Verify: `.venv/bin/pytest tests/flashcards/test_api_stats.py -q`.
  - Files: `app/routes/flashcards_stats.py`, `tests/flashcards/test_api_stats.py`.

## Phase C: frontend

- [ ] T07 Card editor
  - Acceptance: front/back Markdown + KaTeX preview; kind selector (basic, basic-reverse, cloze) with live cloze preview; tags; save/patch through the API.
  - Verify: `npm run test -- --run src/features/flashcards/editor.test.tsx`.
  - Files: `web/src/features/flashcards/editor/`, `web/src/features/flashcards/cloze.ts`, tests.

- [ ] T08 Source-create from the reader
  - Acceptance: selecting a passage in a chapter shows both a floating button and a selection-menu entry; both open the pre-filled editor with the snippet and the guide/chapter/section anchor.
  - Verify: `npm run test -- --run src/features/flashcards/source-create.test.tsx`.
  - Files: `web/src/features/flashcards/source-create.tsx`, `web/src/routes/Chapter.tsx` (integration point), tests.

- [ ] T09 Review UI (incl. training variant)
  - Acceptance: prompt → reveal; four buttons showing next intervals; keyboard Space/1–4/Enter/Esc; Again re-queues and shows the answer again; session of 20 with "Continuar"; training mode shuffled with the "Registrar no cronograma" toggle.
  - Verify: `npm run test -- --run src/features/flashcards/review.test.tsx`.
  - Files: `web/src/features/flashcards/review/`, tests.

- [ ] T10 Decks UI
  - Acceptance: `/flashcards/decks` lists guide/chapter/section decks with counts; deck detail browses the full card list and starts training; the guide page shows a "Flashcards" section linking its guide deck and per-chapter decks.
  - Verify: `npm run test -- --run src/features/flashcards/decks.test.tsx`.
  - Files: `web/src/features/flashcards/decks/`, `web/src/routes/Guide.tsx` (section), `web/src/routes/Flashcards.tsx`, tests.

- [ ] T11 Stats and habit UI
  - Acceptance: heatmap, forecast bars, true retention, streak chip with freeze state, daily goal control, reminder notification (site open only).
  - Verify: `npm run test -- --run src/features/flashcards/stats.test.tsx`.
  - Files: `web/src/features/flashcards/stats/`, `web/src/features/flashcards/habit/`, tests.

## Phase D: piloto e entrega

- [ ] T12 Seed drafts for Magnésio
  - Acceptance: draft cards authored from magnésio theory chapters + Glossário (Banco de Questões excluded, Referência Rápida included), each with a source anchor; stored as drafts and never auto-activated; a drafts screen lists/approves/patches/archives them.
  - Verify: draft JSON loads via the import endpoint; approving activates cards into the queue; `.venv/bin/pytest tests/flashcards/test_seed.py -q`.
  - Files: `data/flashcards/drafts/magnesio.yaml` (local, gitignored path per data policy), `app/routes/flashcards_drafts.py`, `tests/flashcards/test_seed.py`.

- [ ] T13 Integration and deploy
  - Acceptance: sidebar entry, routes wired, empty states; pytest + vitest + typecheck + build green; publish via `scripts/sync-remote.sh`; live checks (health, index, decks API); multimodal gate on review flow at desktop and mobile.
  - Verify: full suites; `git push`; `scripts/sync-remote.sh`; gate script output.
  - Files: `web/src/components/layout/SidebarTree.tsx` (nav), `web/src/router.tsx`, `scripts/` (gate), commit per change.
