# Capability Map: Flashcards (Estudos)

Status: draft for approval. Owner: Carlos. Agent: Hermes.
Base: `study-site` (React SPA + FastAPI + SQLite). See `docs/spec-flashcards.md`.

## Modules

| Module id | Responsibility | Depends on |
|:---|:---|:---|
| `fc-db` | SQLite schema: `notes`, `cards`, `revlog`, `streaks`/meta; migrations; deterministic access helpers | — |
| `fc-scheduler` | FSRS core: per-card state (difficulty, stability, retrievability), intervals, desired retention 90%, leech detection, fuzz, interleaved queue | `fc-db` |
| `fc-api` | FastAPI endpoints: CRUD notes/cards, review session (fetch card, submit rating), stats, daily goals | `fc-scheduler` |
| `fc-editor` | React editor: create/edit basic + cloze cards with KaTeX and figures; optional reverse card | `fc-api` |
| `fc-source-create` | Select text in a guide chapter → pre-filled editor with source anchor (guide/chapter/section) | `fc-editor`, `fc-api` |
| `fc-review-ui` | Review flow: prompt → reveal → 4 rating buttons showing next interval; keyboard; session progress; corrective feedback | `fc-api` |
| `fc-stats` | Heatmap, load forecast, true retention, new/review counters | `fc-api` |
| `fc-habit` | Daily goals, streak with freeze, reminders, active-day tracking | `fc-api` |

Build order: `fc-db` → `fc-scheduler` → `fc-api` → `fc-editor` → `fc-source-create` →
`fc-review-ui` → `fc-stats` → `fc-habit`.

## Boundaries of this map

In scope for v1: everything above. Out of scope (see spec): `.apkg`/CSV import,
bidirectional sync, image occlusion, auto-generated LLM cards, multi-user.

Each module ships with its own tests (pytest for pipeline/api, vitest for React) and
does not proceed until its predecessor is green.
