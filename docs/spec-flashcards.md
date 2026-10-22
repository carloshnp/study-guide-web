# Spec: Flashcards (Estudos)

Status: draft for approval. No implementation code exists yet.
Owner: Carlos (carloshnp). Agent: Hermes.
Repo: https://github.com/carloshnp/study-guide-web (code only, no content).
Base: the `study-site` app (React SPA + FastAPI + SQLite), served at
`https://carloshnp-1.tailfa3301.ts.net/`.

## Objective

Add a flashcard feature to the study site, Anki-like but grounded in current evidence,
integrated with the existing guides (Metallurgy, Strength of Materials, Numerical
Calculus, DSA, LLM foundations). Cards are created by the user from guide text
(evidence: user-generated cards beat premade decks), scheduled with a memory model
(FSRS-style states, 90% desired retention), reviewed in an interleaved queue, and
reinforced with lightweight regularity features (streak with freeze, heatmap, daily
goals). The feature must not promise efficacy claims stronger than the literature.

Success means: from a guide chapter, the user selects a passage, writes the answer,
gets the card scheduled; every day the site surfaces a short review session mixing
subjects; ratings update intervals per the FSRS model; the user sees a heatmap, a
load forecast and true retention; and all state survives a reload and lives in the
same SQLite behind the API.

## Evidence base (2020+; full synthesis in `docs/flashcards-research.md`)

| Topic | Finding | Source |
|:---|:---|:---|
| Spacing | Spaced retrieval practice beats massed (g=1.01, publication bias reported); expanding vs uniform intervals: null (g=0.034) | Latimier et al., 2021, doi:10.1007/s10648-020-09572-8 |
| Scheduler model | FSRS state model (difficulty/stability/retrievability) cuts prediction error ~64% vs baselines | Su et al., 2023, doi:10.1109/TKDE.2023.3251721 |
| Desired retention | 90% is the documented product default; >97% unsustainable (product docs, not empirical optimum) | Anki Manual, docs.ankiweb.net/deck-options.html |
| Retrieval practice | Testing boosts classroom learning: g=0.499 across 222 studies; corrective feedback and format alignment are cheap levers | Adesope et al., 2021, doi:10.1037/bul0000309 |
| Feedback timing | Immediate vs delayed feedback: null difference in computer-assisted learning (g=0.03) | 2026 meta-analysis, doi:10.1007/s10648-026-10117-8 |
| User-generated cards | Own cards > premade (d=0.45 memory, d=0.29 application); benefit comes from the generation process | Pan et al., 2022, doi:10.1037/mac0000083 |
| Interleaving | Interleaved practice improves memory (g up to 0.65) and transfer (g up to 0.66) | Brunmair & Richter, 2021, doi:10.1002/rev3.3266 |
| Gamification | Small-to-moderate cognitive effect (g=0.49), fragile behavioral/motivational effects; no direct evidence for streaks | Sailer et al., 2020, doi:10.1007/s10648-019-09498-w |
| Anki evidence | Medical-education associations are observational and mixed; consistency > volume | 2026 systematic reviews, doi:10.1007/s40670-026-02643-5 and doi:10.1111/tct.70353 |
| Community (r/Anki) | FSRS consensus, 90% retention, atomic cards, clam/leech = reformulate, 5–10 new cards/day, tiny-habits floor | thread links in `docs/flashcards-research.md` |

Design consequences locked by the decision oracle (2026-10-22):
- v1 scope = full SRS core (scheduler, editor, source-create, review UI, stats, habit),
  **no** .apkg/CSV import, **no** offline sync, **no** image occlusion (0.93).
- Scheduler = embed FSRS with stock parameters, desired retention 90%, no auto-optimize
  in v1; revlog from day one for later calibration (0.79).
- Card creation = select text in a guide → pre-filled editor, with a required
  "rewrite in your own words" step and a source anchor (0.95).
- Gamification = active days + streak with freeze (no punishment), simple heatmap,
  daily goals with reminders, framed as a regularity tool (0.84).
- Review queue = interleaved across subjects/chapters by default, with a filter to
  study one chapter/subject (exam cramming) (0.97).

## Locked decisions

| Decision | Choice |
|:---|:---|
| Data model | `notes` + `cards` (Anki-style): one note yields one or more cards (basic, reverse, cloze per lacuna). `revlog` records every rating with old/new intervals and duration. |
| Card kinds | `basic` (front/back), `basic-reverse` (both directions), `cloze` ({{c1::…}} syntax). Markdown + KaTeX + figures reuse the existing reader pipeline. |
| Source anchor | Each card stores `guide_id`, `chapter_slug`, optional `section_id`, plus the quoted source snippet, so the review can link back to the guide. |
| Scheduler | FSRS states per card: difficulty D, stability S, retrievability R; desired retention default 0.90, configurable 0.85–0.97 with a load warning above 0.95; fuzz on intervals; leech at 8 lapses (flag + suspend + review screen). |
| Review flow | Two-stage: prompt first, then reveal; four buttons (Again/Hard/Good/Easy) showing the next interval; keyboard 1–4, Space reveals, Enter = Good; corrective feedback with the correct answer after a rating. |
| Queue | Default queue interleaves all due cards; "study one guide/chapter" filter produces a temporary session without rescheduling (cramming mode). |
| Limits | Daily new-card limit (default 10) and review cap; a "today's floor" setting (e.g. 5 cards) to protect the habit. |
| Stats | Heatmap (active days), load forecast per day, true retention (recall at maturity), counts of new/learning/review. |
| Habit | Streak with freeze (a missed day is forgiven by a freeze token); reminders are a browser notification, never email; no punishment for breaking. |
| API | One FastAPI router `/api/flashcards/*`; single-user, same SQLite as progress; no auth beyond localhost/tailnet. |
| Tests | pytest for db/scheduler/api (deterministic clock, property tests for interval monotonicity); vitest for React; no new infra. |

## Capability map (Phase 0)

See `docs/flashcards-capability-map.md`. Build order: `fc-db` → `fc-scheduler` →
`fc-api` → `fc-editor` → `fc-source-create` → `fc-review-ui` → `fc-stats` →
`fc-habit`.

## Data model (v1, SQLite)

```sql
-- one note = one authored item; may generate several cards
CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('basic','basic-reverse','cloze')),
  front TEXT NOT NULL,            -- markdown + LaTeX; cloze uses {{cN::…}}
  back TEXT NOT NULL,
  guide_id TEXT,                  -- nullable: standalone cards allowed
  chapter_slug TEXT,
  section_id TEXT,
  source_snippet TEXT,
  tags TEXT NOT NULL DEFAULT '',  -- comma-separated
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE cards (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  template TEXT NOT NULL,         -- 'basic' | 'reverse' | 'cloze:c1' | …
  state TEXT NOT NULL DEFAULT 'new',  -- new | learning | review | suspended
  difficulty REAL NOT NULL DEFAULT 5.0,
  stability REAL NOT NULL DEFAULT 0.0,
  retrievability REAL,
  due TEXT,                       -- ISO date (or datetime) when the card is next due
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_review TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE revlog (
  id INTEGER PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  rating INTEGER NOT NULL,        -- 1=Again 2=Hard 3=Good 4=Easy
  state_before TEXT NOT NULL,
  interval_before INTEGER NOT NULL,  -- days
  interval_after INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL
);

CREATE TABLE habits (
  day TEXT PRIMARY KEY,           -- YYYY-MM-DD
  new_reviewed INTEGER NOT NULL DEFAULT 0,
  reviews_done INTEGER NOT NULL DEFAULT 0,
  streak_frozen INTEGER NOT NULL DEFAULT 0
);
```

The scheduler module owns all writes to `cards`/`revlog`; API routes only translate
HTTP into scheduler calls. `habits` is updated by the API on review completion.

## API surface (v1)

```
GET  /api/flashcards/queue?scope=all|guide:<id>|chapter:<id>:<slug>&limit=20
GET  /api/flashcards/cards/<id>          (question only; answer never included)
POST /api/flashcards/cards/<id>/review    {rating: 1..4, elapsed_ms}
POST /api/flashcards/notes                {kind, front, back, guide_id?, chapter_slug?, section_id?, source_snippet?, tags?}
PATCH /api/flashcards/notes/<id>
DELETE /api/flashcards/notes/<id>         (cascade cards)
POST /api/flashcards/notes/<id>/cards     (regenerate cards from the note)
GET  /api/flashcards/stats?from=&to=     (daily counts, true retention, forecast)
GET  /api/flashcards/habits?from=&to=     (active days, streak, freezes)
POST /api/flashcards/settings             {daily_new_limit, review_cap, desired_retention, floor}
```

Review rating payloads are validated (1–4). The reveal endpoint never returns the
answer before a `review` is posted (test-enforced).

## React surfaces

- `fc-editor`: modal/route with front/back textareas (Markdown preview, KaTeX),
  kind selector, tag input; "create from selection" pre-fills front + source anchor.
- `fc-review-ui`: card prompt → "Mostrar resposta" → answer + 4 buttons with next
  intervals; progress bar; end-of-session summary; keyboard shortcuts; the correct
  answer and a "link to guide section" appear after rating.
- `fc-stats`: heatmap grid, per-day forecast bars, true-retention line, counters.
- `fc-habit`: streak chip (with freeze state), daily goal slider, reminder toggle.
- Navigation: a "Flashcards" primary link in the sidebar (between Busca and the
  guides tree) and a route `/flashcards` with sub-routes `/flashcards/review`,
  `/flashcards/cards`, `/flashcards/stats`.

## Testing strategy

- pytest (backend): deterministic clock injected into the scheduler; property tests
  — Good never shrinks an interval, Again always shortens, intervals are monotone
  in rating; revlog integrity after every transition; leech threshold at exactly 8
  lapses; cloze parsing generates one card per lacuna; queue respects scope filters;
  API contract tests using TestClient.
- vitest (frontend): editor parse of cloze syntax; review button intervals render;
  keyboard shortcuts; stats from fixture payloads; streak logic (freeze consumed on
  first miss, no negative streak).
- Full suite must stay green: `pytest -q` and `npm run test -- --run`, plus
  `npm run typecheck` and `vite build`.

## Boundaries

- Always: write tests before/with each module; one commit per task; use the injected
  clock in scheduler tests; validate every rating payload; keep `revlog` append-only.
- Ask first: schema changes after approval, new npm/Python dependencies, changing
  the review flow UX, adding import/export formats.
- Never: modify `data/` or source guides; ship efficacy claims in UI copy
  (e.g. "comprovado"); delete revlog rows; merge state between machines by copying
  `state.db`/`estudos.db`.

## Success criteria

1. From a guide chapter, select a passage → editor opens with front pre-filled and
   the source anchor set; saving creates the note and its card(s).
2. `GET /api/flashcards/queue` returns due cards interleaved across subjects and
   never includes the answer; `POST …/review {rating:3}` moves a `new` card through
   learning steps and a mature card to a longer interval (property tests enforce).
3. After 8 lapses the card is flagged and suspended; the review UI surfaces it in a
   leech screen with a "reformulate" shortcut that opens the editor.
4. Streak logic: reviewing on consecutive days increments; a missed day consumes a
   freeze when available and never drops the streak below the frozen floor.
5. Stats show the seven-day heatmap, next 14-day load forecast, and true retention
   computed from mature cards (interval ≥ 21 days).
6. The review session works fully by keyboard (Space, 1–4, Enter, Esc back) and the
   next-interval labels on buttons match what the scheduler will apply.
7. All four React surfaces are covered by vitest; backend suite stays green; no
   build warnings introduced.

## Assumptions

1. Single user; no auth; the API trusts localhost/tailnet (same as today).
2. The existing reader's KaTeX/Markdown renderer is reused in cards and in the
   editor preview (no new rendering stack).
3. The built guide corpus (`content/guides/<id>/guide.json`) is the source of truth
   for anchors; anchors point at chapter slugs/section ids that already exist.
4. Clock for scheduling is UTC; `due` is a date; a card due today is shown.
5. No background jobs on the notebook: reminders use the browser Notification API
   only when the site is open (no push infra).
6. Browser target remains the same as the site (modern Chromium/Firefox/Safari).

## Open questions

1. Review session size: fixed session (e.g. 20 cards) vs "all due today"? Default
   proposal: a session target of 20, after which the user may continue. Confirm.
2. Should a rating of Again during learning show the answer again immediately, or
   does the card simply re-enter the queue (Anki default)? Proposal: re-enter, no
   immediate re-show.
3. Cloze note editing: when a cloze note's text changes, cards are regenerated —
   what happens to the review history of removed lacunas (proposal: cards deleted
   with their revlog, notes kept)?
4. Where should the "create card from selection" button live: a floating button in
   the chapter reader, the right-click/selection menu, or both (proposal: both)?
5. Desired-retention control: one global value vs per-guide presets (proposal:
   global with a per-guide override later).
