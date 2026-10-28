# Plan: in-site chat for Estudos

Status: plan for approval. No product code written.
Written 2026-10-27 from four research subagents, the decision oracle (calls logged in ~/.hermes/decisions.jsonl under the `chat-plan-*` tasks), and your answers to five questions.

## 1. What you asked for, and what you decided

Requirements:
- Select passages in the study guides and add them to a chat as small snippets; remove any of them.
- Chat with Claude Code; choose the model and the reasoning effort.
- Two steps: step 1 answers with the chosen model; step 2 formats the answer as structured markdown with LaTeX, always claude-haiku-5-5 at low effort.
- Global chat history stored on the server; paste images.
- Not in this version: llm-wiki, RAG, skills.

Your answers:

| Question | Answer |
|:---|:---|
| Step 1 auth | claude.ai login on carloshnp-1, personal use only |
| History | one continuous global history |
| Math | KaTeX (the guides already use it) |
| Models in the picker | claude-haiku-5-5 only |
| Effort levels in the picker | all five: low, medium, high, xhigh, max |

Two notes on those answers:
- The picker has one entry, because you selected only claude-haiku-5-5. The models are a config list, so adding Sonnet or Opus later is a one-line change. Confirm this is what you meant.
- The API id is `claude-haiku-5-5` (hyphens). Anthropic's docs list no dotted form, so the code uses the hyphen id.

Decisions the oracle made. I followed every answer; the sandbox row needed a re-ask and a decision on your criterion.

| Fork | Oracle answer | Confidence | Effect |
|:---|:---|:---|:---|
| Snippet tray | server-side staging | 0.94 | the tray lives in state.db, adding a snippet is a request |
| Image upload | raw request body | 0.97 | no python-multipart dependency |
| Step 1 transport | stream-json on stdin for every request | 1.00 | one code path for text and images |
| Touch action | bottom bar above the safe area | 1.00 | driven by selectionchange, clear of the OS callout |
| Composer | native textarea plus chip tray | 1.00 | the installed coss composer stays unused |
| Enter key | sends on desktop only, not while composing | 0.99 | Send button on touch |
| Formatter failure | show the raw draft, flagged | 1.00 | Retry offered |
| Regenerate | keep prior versions with a switch | 0.76 | weakest answer of the batch; followed |
| Deploy during an answer | publish waits up to 10 min | 0.95 | then restarts |
| Snippet tray limit | 8 | 1.00 | a ninth is refused with a message |
| Effort levels | oracle 0.48, not used | 0.48 | asked you; you chose all five |
| Child process writes | first answer a (0.94) rested on a wrong framing; re-asked, the logged split is b 0.62 vs a 0.38 (printed confidence 0.24) | 0.24 | below the signal threshold, decided on your criterion: keep the unit unchanged and copy no credentials, which b does; gate T0.1 tests it first |

## 2. Current state (checked, not assumed)

- Code: laptop and host both at `9462251`. The host serves build `20261027T065041Z`; `estudos.service` is active.
- Data repo: host at `f1d3a5f`, laptop at `b4b7817`. The host's five newest data commits all exist on the laptop, so none is host-only. The host also has an untracked titanio resumo file. Both must clear the deploy gates.
- Backend: FastAPI with progress, notes and flashcards routers. `state.db` (WAL, 7 tables) has no chat tables. The schema is `CREATE TABLE IF NOT EXISTS` on every connection.
- Reader: `Chapter.tsx` already mounts `SelectionCardMenu` (line 320) for flashcards "Criar card". The chat reuses that menu and its selection contract.
- Notes: `ChapterNotes` is not imported by any non-test file, so the notes sheet is not on the reader, although `tasks/todo.md` marks T27 done. Separate issue, not in this plan.
- Composer: the coss composer (`composer.tsx`, `composer-editor.ts`, `use-composer-editor.ts`) is installed and unused, about 1,800 lines. Not adopted.
- Design: `MASTER.md`. `--faint` `#8a92a0` is 3.13:1 on white, below 4.5:1 for captions; its dark value `#7b8496` is 5.02:1. The border `#e7eaf0` is 1.21:1 (decorative only). The `--faint` fix is task T12.
- Host CLI: claude 2.1.309 at `~/.local/bin/claude`, logged in with claude.ai. It is not on the non-login PATH.
- Quota: one snapshot shows five-hour utilisation 73%, seven-day 38%, overage rejected.

## 3. Verified facts that shape the design

| # | Fact | How verified | Consequence |
|:---|:---|:---|:---|
| 1 | `--bare` ignores the claude.ai login and says "Not logged in" | run, exit 1 | plain `-p` only |
| 2 | `--effort` accepts low, medium, high, xhigh, max; an invalid value is ignored with exit 0 | run plus help text | the server validates effort against the allowlist before any call |
| 3 | stream-json: text deltas at `stream_event.event.delta.text`; final text at `result.result`; cost at `result.total_cost_usd` | run | the runner keeps only the final result; deltas drive live chunks |
| 4 | image as stream-json input is accepted | run | images use the same path as text; perception not yet verified (T0.3) |
| 5 | SIGTERM to the process group ended an idle process with no survivors | run | `start_new_session` plus `killpg`; live-stream cancel not yet tested (T0.4) |
| 6 | print mode loaded 35 user skills from `~/.claude/skills`, even in an empty cwd | system/init | answers may carry skill context and cost tokens; the help lists suppression flags, untested (T0.2) |
| 7 | one tiny call: 3.0 s wall, first event at 0.9 s, peak RSS 319 MB | run | one job at a time is enough on 15 GB RAM |
| 8 | the subscription quota is shared with Claude Code | rate-limit snapshot | quota cap and a visible quota note (T10) |
| 9 | the legal page: third-party developers may not offer claude.ai login inside their own apps; an end user may sign in to the unmodified Claude Code binary | fetched code.claude.com legal page | personal single-user use fits that reading. Not legal advice. If anyone else gets access, step 1 must move to an API key |
| 10 | effort is `output_config.effort` in the Messages API; Haiku 5.5 supports all five | fetched docs | the CLI takes the same levels through `--effort` |
| 11 | the unit sets `ProtectHome=read-only` | `systemd/estudos.service` | the child cannot write its login directory unless T0.1 settles it |

## 4. Architecture

```
reader (Chapter)  --POST /api/chat/snippets-->   state.db (staged snippets)
composer          --POST /api/chat/attachments-> chat/attachments/ (raw image)
composer          --POST /api/chat/messages----> 202, queue (1 worker, depth 5)
worker  step 1    claude -p --model <allowlisted> --effort <level> --tools ""  -> chat_chunks
worker  step 2    claude -p --model claude-haiku-5-5 --effort low             -> formatted (validated) or the draft
browser <--GET /api/chat/messages/{id}/stream (SSE, reads the DB, from=idx)--
```

The job runs detached. The SSE connection only reads, so a phone that locks does not lose the answer.

Config: `config/chat.yaml` (git-tracked), validated at startup by `ChatConfig`. A broken file disables chat (503 `chat_disabled`) and the reader keeps working.

### Storage (state.db, schema v2: needs your OK)

- `chat_threads`: one default row. It keeps `thread_id` so threads can come later without a migration. No thread list in v1.
- `chat_messages`: id, role, `request_id` (unique, idempotent), `in_reply_to` (retry and regenerate versions), content, draft, formatted, `formatter_status` (ok / fallback / skipped), model, effort, status (queued / running / done / failed / interrupted / cancelled), `error_code`, timings, timestamps.
- `chat_chunks`: message_id, idx, step, text. Persisted every 0.5 s or 512 characters.
- `chat_snippets`: staged rows have `message_id` NULL; sent rows bind to the user message and copy quote, guide_id, chapter_slug and section_id as text, so later guide edits never rewrite history.
- `chat_attachments`: message_id, position, sha256, media_type, bytes, width, height.
- Files: `ESTUDOS_CHAT_DIR`, default `<project>/chat/`, gitignored, outside `builds/` and `data/`.

### Step 1 and step 2

Step 1 (flags to confirm in T0.2 and T0.5):

```
claude -p --input-format stream-json --output-format stream-json --verbose --include-partial-messages \
  --model <allowlisted id> --effort <level> --tools "" --no-session-persistence \
  --system-prompt-file <answer-prompt> <suppression flags from T0.2>
```

- cwd: a scratch directory under `chat/`, outside the repo.
- env: PATH, HOME, LANG and `CLAUDE_CONFIG_DIR` only. The prompt arrives on stdin, never in argv.
- Timeouts: idle 120 s, total 300 s, line cap 1 MiB, draft cap 256 KiB. On timeout: `killpg` SIGTERM, SIGKILL after 5 s, status `failed` (`step1_timeout` or `output_too_large`) or `cancelled`.

Step 2: the same runner with `--model claude-haiku-5-5 --effort low`, 90 s timeout. Its input is only the user's question and step 1's draft. It never sees snippets, history, images or config.

Formatter contract: markdown only; inline math `$...$`; display math `$$...$$` on its own lines; no raw HTML, no images; links only if the draft has them; no new facts, numbers, citations or URLs; keep every number and formula.

Validation before accepting: non-empty; no HTML tag pattern; `$$` and code fences balanced; every URL in the output also appears in the draft; no `javascript:` or `data:`; length at most 3x the draft plus 2000 characters. Any failure gives `formatter_status = fallback`, and the reader shows the draft flagged.

### Cancel, restart, retry

- Cancel: `killpg`; status `cancelled`; partial draft kept.
- `publish --restart`: waits up to 10 minutes for a running answer, then restarts (the unit uses KillMode control-group, so the child dies with uvicorn).
- On startup, any queued or running row is marked `interrupted` with `error_code = server_restarted`. Its chunks stay visible.
- Retry: a new assistant message for the same user message, copying its snippets and attachments.

### Uploads

- Raw request body; no new dependency.
- Type by magic bytes only: PNG, JPEG, WebP.
- Limits: 5 MiB per image, 4 images per message, 20 MiB per message, 8000 px maximum side.
- Pillow: `MAX_IMAGE_PIXELS` 40 million; re-encode without EXIF; long side capped at 2048 px.
- Stored under `sha256` names; identical bytes dedupe.
- Served only by `GET /api/chat/attachments/{id}/file` with `nosniff` and a private cache. Never a static mount.
- Staged uploads older than 24 h are swept.

### Quota guard (proposed default)

30 requests per day; the 31st returns 429 with a reason. The value is yours to change.

## 5. Frontend

- Route `/chat`: one history, one column. A "Chat" link in the top bar.
- Entry points from the reader:
  - "Adicionar ao chat" as an item in `SelectionCardMenu` (`Chapter.tsx:320`);
  - a bottom action bar above the safe area on coarse pointers, driven by `selectionchange`;
  - a visible "Adicionar seção ao chat" button in h2 rows, 44 px. (Proposed default, not routed to the oracle.)
- Snippet tray above the composer: chips with a 44 px remove control; cap 8, and a ninth shows a message and adds nothing. Staged on the server.
- Composer: native Textarea; Attach button (44 px; PNG, JPEG, WebP); paste images on desktop; Enter sends on desktop only and never while composing (`isComposing` and keyCode 229 checked); 44 px Send button; HEIC refused by name.
- Model and effort selectors in the composer toolbar; below 768 px they collapse into one button with a popover.
- Conversation:
  - `role="log"` with `aria-live="off"`; one polite status region announces "Respondendo", "Formatando", "Resposta pronta";
  - the raw draft sits in a collapsed block;
  - the formatted answer renders through the existing `MarkdownRenderer` (KaTeX, lazy-loaded);
  - copy, stop, retry, regenerate (keeps versions with a switch);
  - failures read "A resposta falhou: motivo", with Retry.
- Picker state persists per device in `localStorage` (`estudos-chat-prefs`). A stored model missing from the list falls back to the default with a note.
- Draft text autosaves per device at 800 ms (proposed default).
- Design: `design-system/estudos/pages/chat.md` (new, from the research draft). Meta text uses `--muted-foreground`; composer and chip edges use `--input` for a 3:1 border.

## 6. Scope: files per part (scope decided with you; nothing else touched)

Backend:
- new: `app/chat/config.py`, `app/chat/runner.py`, `app/chat/formatter.py`, `app/chat/worker.py`, `app/chat/uploads.py`, `app/chat/snippets.py`, `app/api/chat.py`, `config/chat.yaml`, `tests/api/chat/*`, `tests/fixtures/fake_claude.py`;
- changed: `app/main.py` (include the router, same commit as `app/api/chat.py`), `app/db.py` (schema v2, your OK), `pipeline/publish.py` (wait policy), `systemd/estudos.service` (env vars, your OK), `.gitignore` (`chat/`).

Frontend:
- new: `web/src/routes/Chat.tsx`, `web/src/features/chat/*` (api, useChat, Tray, Composer, Turn, ModelPicker, stream, tests), `design-system/estudos/pages/chat.md`;
- changed: `web/src/router.tsx`, `web/src/components/layout/TopBar.tsx`, `web/src/features/flashcards/source-create/SelectionCardMenu.tsx` (add item), `web/src/routes/Chapter.tsx` (wire), `design-system/estudos/MASTER.md` (`--faint` fix, its own commit).

Docs: `SPEC.md` (move the in-site chat from out-of-scope to v1), `tasks/todo-chat.md` (new), `README.md` (ops notes).

Not touched: `data/`, `state.db`, `builds/`, the unused coss composer (removal is a separate decision).

## 7. Work breakdown (TDD: failing test first, as in `tasks/todo.md`)

### Phase 0: gates (no product code)

The owner runs one interactive step.

- **T0.1 Sandbox.** Owner runs `CLAUDE_CONFIG_DIR=<project>/chat/claude-config claude /login` once. Then a tiny call under `systemd-run --user` with the unit's sandbox (`ProtectHome=read-only`, `ProtectSystem=strict`, the same `ReadWritePaths`). Record which paths the CLI writes. Acceptance: login works under the sandbox and the file list is recorded. On failure, stop and report to you.
- **T0.2 Suppression.** Find flags from `--safe-mode`, `--setting-sources` and `--disable-slash-commands` that give `n_skills` 0 in system/init while login still works. 2 to 3 tiny calls.
- **T0.3 Image perception.** One PNG with a large word; ask for the word. Acceptance: the word is returned.
- **T0.4 Live cancel.** Start a real step-1 stream with haiku at low effort; send SIGTERM to the group after the first `text_delta`. Acceptance: no survivors; exit code recorded.
- **T0.5 Binary.** `readlink -f` and a run under the sandbox; set `ESTUDOS_CLAUDE_BIN` to the real path.

Budget: about 8 tiny haiku calls.

### Phase 1: backend core (pytest, fake CLI; no real model calls in tests)

- **T1 Config.** Allowlist parse and validation; `GET /api/chat/config`; a broken file disables chat and leaves the reader up. Tests: `test_chat_config.py`.
- **T2 Schema v2 (needs your OK).** The tables above. Test: an existing v1 `state.db` gains the tables and keeps its progress and notes rows.
- **T3 Snippets.** Stage, list, delete while staged; sent rows immutable (409); cap 8; quote 1 to 4000 characters; sweep after 24 h.
- **T4 Uploads.** Magic bytes; caps; Pillow re-encode without EXIF; dedupe; `GET` file headers; sweep. A GPS EXIF input must be absent from the stored file.
- **T5 Runner.** stream-json on stdin; env allowlist; cwd outside the repo; `killpg`; idle and total timeouts; output caps; keeps only the final result text. Fake CLI scenarios: `ok`, `slow`, `hang`, `grandchild`, `huge`, `exit1`, `bad_json`.
- **T6 Formatter.** Prompt template; validator unit cases; fallback when the formatter fails.
- **T7 Worker.** Lifespan single worker; queue depth 5 (429 busy); `request_id` idempotent (same id, same ids, one run); chunk persistence; cancel; startup marks running rows interrupted.
- **T8 SSE.** `from=idx` resume; ping every 15 s; a client disconnect does not cancel the job.
- **T9 Routes.** `POST /api/chat/messages` (202), `GET /api/chat/thread` (history in seq order), `GET` message, retry, cancel; 422 `unknown_model` and `unknown_effort`; 503 `chat_disabled`.
- **T10 Quota guard.** 30 per day; 429 with a reason.
- **T11 Deploy-facing.** `publish` waits up to 10 minutes for running rows, then restarts. `app/main.py` includes the router in the same commit as `app/api/chat.py` (the study-guide-site pitfall).

Regression: `tests/api` and `tests/pipeline` pass unchanged; `ruff check` clean.

### Phase 2: frontend (Vitest and Testing Library; Playwright after)

- **T12 Design.** `pages/chat.md`; the `--faint` fix in `MASTER.md` in its own commit (it changes an existing caption token, so the "Fim do guia" caption moves too). Acceptance: contrast computed for each new pair.
- **T13 Route.** `/chat`, top bar link, TanStack Query client, empty state.
- **T14 Reader entry points.** `SelectionCardMenu` item; bottom bar (coarse pointer, `selectionchange`, safe area); section button. Reuse the existing selection contract: guide, chapter and section ids, 3-character minimum, 800-character cap.
- **T15 Tray and composer.** Chips; remove; the cap-8 message; Textarea; Attach; paste; the Enter rule; IME check; limits and errors.
- **T16 Conversation.** SSE through `fetch` and `ReadableStream`; phases; raw draft collapsed; lazy `MarkdownRenderer`; copy, stop, retry, regenerate; failure and fallback states.
- **T17 Picker.** Model and effort; persisted prefs; stale-model fallback.
- **T18 Accessibility and layout.** 375, 768, 1024 and 1440 px; both themes; reduced motion; largest text; focus rules.
- **T19 e2e.** `web/e2e/serve.sh` publishes over the live `current` symlink. Read it before running anything, and run e2e only against a non-live build directory.

### Phase 3: deploy (one confirmation per deploy, the study-site-deploy gates)

- **T20 Host setup (owner).** The one-time login (T0.1); the unit env changes (approve first); the backup choice.
- **T21 Deploy.** `git fetch`; host tree clean (commit or move the untracked titanio resumo first); deletion audit; `sync-remote.sh --dry-run`; one confirmation naming the commit; publish; live checks: `/api/chat/config` returns 200, openapi lists the chat paths. One real smoke message only with your OK, because it spends quota.
- Never rsync `state.db` or `chat/`.

## 8. Verification (acceptance for the feature)

- Select text on desktop and on a phone emulation: both entry points add a snippet carrying guide, chapter and section.
- Remove a snippet; a ninth is refused with a message.
- Paste an image on desktop; attach one on a phone emulation. A 6 MB file and a GIF named `.png` are refused.
- Send two snippets and one image: the status reads "Respondendo", then "Formatando"; the formatted markdown renders `$...$` and `$$...$$` through KaTeX; the raw draft is one tap away.
- Close the phone tab mid-answer: the answer completes; reopening shows it.
- Deploy during an answer: publish waits; a deploy that times out marks the answer interrupted.
- Formatter failure (fake CLI) shows the draft, flagged.
- Reload: history and tray survive.
- `git status` shows no `chat/` or `state.db` in any repo.

## 9. Risks

- **Shared quota.** Five-hour usage is already 73% before the chat exists, and a long session can block Claude Code. The quota guard limits requests, but the chat cannot read the live quota except through the CLI's rate-limit event.
- **Terms.** Personal use only. If anyone else gets access, step 1 needs an API key, billed separately.
- **Skills in print mode.** Answer quality and token cost are unknown until T0.2 passes.
- **Sandbox.** T0.1 may fail. Then option a (narrow `ReadWritePaths` for `~/.claude`) is your call.
- **One worker.** A long answer blocks the queue; depth 5.
- **Untrusted output.** Model text can carry markup. `react-markdown` runs without raw HTML, and the validator rejects raw HTML in the formatter.
- **Disk.** `chat/` grows; attachments up to 20 MiB per message; no retention policy yet.
- **No backups** for `state.db` or `chat/` yet. Proposed: nightly `sqlite3 .backup` plus a tar of `chat/`.
- **One picker entry** (your answer). The formatter is always haiku, so step 2 is a fixed cost.

## 10. Owner decisions still open

1. Approve schema v2 for `state.db`. Per your rule, DB changes need confirmation.
2. Approve the unit change (env vars, `CLAUDE_CONFIG_DIR`) and run the one-time login (T0.1).
3. Confirm the picker is haiku-only, or add Sonnet and/or Opus.
4. Daily request cap: proposed 30.
5. Backups for `state.db` and `chat/`: proposed nightly.
6. Keep the "Adicionar seção ao chat" button: proposed yes.

## 11. Pre-existing issues found on the way (outside this plan)

- `ChapterNotes` is not mounted on the reader, though `todo.md` marks T27 done.
- `--faint` caption contrast is 3.13:1 on white.
- The laptop's `claude --version` hung past 90 s; the host's works. The chat runs on the host only.
- The host has an untracked titanio resumo file, and its data repo (`f1d3a5f`) is behind the laptop (`b4b7817`). The deploy gates must clear both.

## 12. Process notes

- Subagents: four, pinned to `claude-haiku-5-5` (`delegation.model` in `config.yaml`). The batch banner said the model was rejected, but all four finished real work with tool calls (transcripts in `~/.hermes/cache/delegation/live/deleg_4b25757a/`). The outputs are used. The banner is unexplained; check it with `hermes config get delegation.model`.
- Checked against the code or the host: the model id, the effort values, the `ChapterNotes` wiring, the contrast arithmetic, the `--bare` failure. Not checked: formatter output quality, and the suppression flags (T0.2).
- Where the frontend and backend research disagreed (history storage, tray storage), your requirement and the oracle decided: history and tray are on the server.
