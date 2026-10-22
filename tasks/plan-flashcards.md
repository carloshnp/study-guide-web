# Plan: Flashcards (Estudos)

Implements `docs/spec-flashcards.md` (approved 2026-10-22, with user answers and
the decks/training additions). TDD throughout: each task is one failing test, one
minimal implementation, one commit. No task writes code for a later task. The
plan follows the capability map order: `fc-db` → `fc-scheduler` → `fc-api` →
`fc-editor` → `fc-source-create` → `fc-review-ui` → `fc-decks`/`fc-training` →
`fc-stats` → `fc-habit` → pilot (Magnésio cards).

## Phase A: dados e núcleo SRS (backend)

Goal: schema, FSRS core, queue/session semantics — all covered by pytest with an
injected deterministic clock.

- T00 Schema and DB helpers: `notes`, `cards` (state incl. `deprecated`),
  `revlog` (append-only), `habits`, `settings` (global + per-guide retention);
  connection module with the same SQLite used by progress; cascade rules.
- T01 FSRS core: per-card D/S/R transitions for ratings 1–4, intervals with
  desired retention (guide override), fuzz, monotonicity properties (Good never
  shrinks an interval; Again always shortens; intervals ordered by rating).
- T02 Learning steps, lapses and leech: same-day learning/relearning steps,
  lapse handling, leech threshold (8 lapses → flagged + suspended), deprecated
  cards excluded from every queue and stat.
- T03 Queue, sessions and decks: due selection interleaved across subjects;
  scope filters (guide/chapter/section); session of 20 + continue; training mode
  (shuffled, no rescheduling by default, explicit toggle); derived-deck queries
  (guide/chapter/section/"outras").

Checkpoint: `pytest -q` green with the full backend suite; property tests run;
a session bounds test proves 20 + continue.

## Phase B: API (FastAPI)

Goal: all HTTP routes translated into scheduler/db calls; TestClient tests.

- T04 Notes and cards CRUD: create/update/delete notes, cloze parser
  ({{cN::…}} → one card per lacuna), reverse template, regenerate with
  deprecation of removed cards, validation of every payload.
- T05 Review endpoints: `GET queue` (never includes answers), `POST review`
  (rating 1–4 + elapsed_ms, revlog append, habits update), settings GET/POST
  with per-guide retention and the >0.95 warning flag.
- T06 Stats, habits and decks endpoints: daily aggregates, true retention
  (mature interval ≥ 21 days), 14-day forecast, heatmap, streak with freeze,
  deck list/detail, `POST decks/<id>/session` (training/review).

Checkpoint: `pytest -q` green; API contract tests cover reveal-never-includes-
answer and invalid ratings (422).

## Phase C: frontend (React)

Goal: the four surfaces, keyboard-first, all componentized, vitest covered.

- T07 Editor: front/back Markdown + KaTeX preview, kind selector (basic,
  basic-reverse, cloze), tags, save through the API; cloze syntax preview.
- T08 Source-create: selecting a passage in the reader opens the pre-filled
  editor (floating button + selection menu, same component); anchor fields
  (guide/chapter/section + snippet) are included.
- T09 Review UI: two-stage prompt → reveal, four buttons showing next intervals,
  keyboard (Space, 1–4, Enter, Esc), Again re-queues and shows the answer again,
  session progress and end summary with "Continuar"; training mode variant with
  the "Registrar no cronograma" toggle.
- T10 Decks UI: `/flashcards/decks` browser with card counts, deck detail page
  to browse the whole deck and start training; the guide page gets a
  "Flashcards" section linking its guide deck and per-chapter decks.
- T11 Stats and habit UI: heatmap, forecast bars, true retention, streak chip
  with freeze, daily goal, reminder via Notification API (only with the site
  open).

Checkpoint: `npm run typecheck`, `npm run test -- --run`, `vite build` green;
review flow usable by keyboard alone.

## Phase D: piloto Magnésio e entrega

Goal: feature live with real content, deployed.

- T12 Seed drafts for Magnésio: author draft cards from its theory chapters and
  the Glossário (Banco de Questões excluded; Referência Rápida included per
  assumption), each with a source anchor; imported as drafts, never auto-
  activated; a drafts screen to review/approve/patch/archive.
- T13 Integration and deploy: sidebar route entry, empty states, full suites
  green, publish via `scripts/sync-remote.sh`, live checks (health, index,
  decks API), and a multimodal gate on the review flow at desktop + mobile.

Checkpoint: production shows the deck list with Magnésio decks; a training
session completes without altering scheduling; approved cards appear in the
review queue.

## Risks and mitigations

- FSRS port complexity → use the published stock formulas; deterministic tests
  with an injected clock; keep the scheduler pure (no I/O).
- Cloze regeneration edge cases (removed lacunas) → deprecation keeps history;
  tests pin the behavior.
- Per-guide retention plumbing → settings stored as one row per guide; API keys
  by guide id; the scheduler receives the resolved retention from the API.
- Browser notifications are restricted → reminders only when the site is open;
  no push infra (assumption 5).
