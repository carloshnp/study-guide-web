# Acceptance: the nine SPEC criteria, and the command that proves each one

Run everything from the repository root unless a step says `cd web`.

| # | Criterion (SPEC.md) | Proof |
|:--|:--|:--|
| 1 | Five guides, catalogued chapter counts, `build --all` exits 0 | `.venv/bin/python -m pipeline.build --all` |
| 2 | One chapter per page, every image 200 from `/media` | `npm --prefix web run test:e2e -- -g "published content"` |
| 3 | KaTeX for `$…$` and `$$…$$`; a 40-row table scrolls in its own box at 375 px | `npm --prefix web run test:e2e -- -g "reading math and tables"` |
| 4 | Progress survives a reload and agrees with the API/meter | `npm --prefix web run test:e2e -- -g "reading progress"` |
| 5 | `magnesio` finds `magnésio`; covers filter is fuzzy | `npm --prefix web run test:e2e -- -g "unaccented\|covers page"` |
| 6 | Theme follows the system, manual cycle persists, 4.5:1 both ways | `npm --prefix web run test:e2e -- -g "theme follows"` |
| 7 | Keyboard: skip link, route-change focus, reachable controls | `npm --prefix web run test:e2e -- -g "skip link\|route change\|lightbox"` |
| 8 | `publish` swaps `current` atomically; Tailscale serves 443 | `.venv/bin/pytest tests/pipeline/test_publish.py -q` + `tailscale serve status` |
| 9 | Public `git status` clean of `data/`, `content/`, `builds/` | `git status --short` |

Two commands cover the whole gate:

```bash
cd ~/study-site
.venv/bin/pytest -q                                   # pipeline, API, publish
npm --prefix web run test:e2e                         # mobile + desktop
```

## 1. Five guides and the chapter counts

```bash
cd ~/study-site
.venv/bin/python -m pipeline.build --all; echo "build exit=$?"
jq -r '.guides[] | "\(.id) \(.chapterCount)"' content/index.json
```

Expected:

```
aluminio 29
titanio 39
magnesio 9
dsa 12
llm-l0l1 14
build exit=0
```

`magnesio` is **9**, not the 16 written in the SPEC: `split_document` promotes the
trailing H1 blocks (banco de questões, referência rápida, glossário) to chapters of
their own, which the catalog documents at the entry. The catalog is authoritative and
`build --all` fails on any disagreement with `expected_chapters`.

## 2. One chapter per page, every image served

```bash
cd ~/study-site
npm --prefix web run test:e2e -- --project=desktop -g "published content"
npm --prefix web run test:e2e -- --project=mobile -g "guide lists its chapters"
.venv/bin/python -m pipeline.check_links
```

What the specs assert: `content/index.json` lists the five ids with the counts above;
every `guide.json` has exactly that many chapters; every `chapters/<slug>.json` is 200;
every `images[].src` and every `srcset` candidate returns 200 with `image/webp`; a
chapter page has exactly one `h1` and none of the neighbouring titles as headings.
`pipeline.check_links` independently reports `all media references resolve`.

## 3. Math and a wide table at 375 px

```bash
cd ~/study-site
npm --prefix web run test:e2e -- -g "reading math and tables"
```

Chapter `magnesio/02-propriedades-e-generalidades` renders `.katex` inline and
`.katex-display` blocks inside `[data-slot="math-display"]` with `overflow-x: auto`.
Chapter `dsa/09-graphs` has a 45-data-row table inside a `region` named “tabela …” with
`tabindex="0"`; the document's `scrollWidth` stays within 1 px of `clientWidth` on the
375×812 project, so the page never scrolls sideways.

## 4. Progress on one device, visible on another

```bash
cd ~/study-site
npm --prefix web run test:e2e -- -g "reading progress"
```

The spec clears the guide's units through `PUT /api/progress` (`status: "absent"`),
opens a chapter, ticks the first heading checkbox (`Marcar "<título>" como lido`),
polls `GET /api/progress?guideId=aluminio` until the unit is `done`, reloads, and
asserts the checkbox is still checked. It then compares the guide page `meter`
`aria-valuenow` with the number of `done` units in the API response.

Manual cross-device pass (the SPEC's own scenario):

```bash
# on the phone and on the desktop, same Tailscale URL
# 1. open /g/aluminio/c/04-tratamentos-termicos-do-aluminio
# 2. tick one section on the phone, reload on the desktop
curl -s 'http://127.0.0.1:8080/api/progress?guideId=aluminio' | jq .count
```

## 5. Accent-insensitive search and fuzzy covers

```bash
cd ~/study-site
npm --prefix web run test:e2e -- -g "unaccented|covers page"
```

`/busca` with `magnesio` returns hits from all three guides that discuss the element
(alumínio and titânio mention it too); a `/g/magnesio/c/…` hit exists and opening it
lands on a chapter whose prose contains `magnésio`. On `/estantes`, typing
`programacao` keeps the “Programação” group and drops “Metalurgia”, because the subject
filter uses the same `foldAccents` as the corpus and highlights.

## 6. Theme

```bash
cd ~/study-site
npm --prefix web run test:e2e -- --project=desktop -g "theme follows"
```

`colorScheme: dark` + `estudos-theme=auto` gives `html.dark`; the toggle walks
auto → light → dark, writes `estudos-theme`, survives a reload, and the spec computes
the body-text contrast ratio against the nearest opaque background in both themes,
asserting ≥ 4.5:1.

## 7. Keyboard

```bash
cd ~/study-site
npm --prefix web run test:e2e -- -g "skip link|route change|lightbox"
npm --prefix web run test -- Shell SidebarTree SectionCheck
```

First `Tab` focuses “Pular para o conteúdo”, `Enter` focuses `main#conteudo`; clicking a
chapter link in the guide list leaves focus on `main`; the figure lightbox closes on
`Esc` and returns focus to its trigger.

## 8. Atomic publish and the public edge

```bash
cd ~/study-site
.venv/bin/pytest tests/pipeline/test_publish.py -q
.venv/bin/python -m pipeline.publish --skip-web-build --restart   # --restart needs the unit installed
tailscale serve status
```

`test_concurrent_reader_never_sees_a_partial_tree` publishes a second version while a
reader thread resolves `current` in a loop and reads `index.json`, a chapter JSON and a
media file from that resolution; every observation must be complete and self-consistent
and `current` never points into `builds/.staging-*`. `test_smoke_failure_…` proves a
failed smoke check leaves `current` on the previous build.

Manual overlap check against a live server (start it in one terminal):

```bash
# terminal 1
.venv/bin/python -m pipeline.publish --skip-web-build --restart

# terminal 2 — 500 requests while the publish above runs; all must print 200
for i in $(seq 500); do
  curl -s -o /dev/null -w '%{http_code}\n' \
    http://127.0.0.1:8080/content/guides/aluminio/chapters/01-o-aluminio-como-metal-de-engenharia.json
done | sort | uniq -c
```

The edge is Tailscale, not a public listener:

```bash
tailscale serve status     # https://carloshnp-2.tailfa3301.ts.net -> 127.0.0.1:8080
ss -ltn | grep 8080        # 127.0.0.1:8080 only, never 0.0.0.0
```

## 9. Nothing generated in the public repo

```bash
cd ~/study-site
git status --short
git check-ignore -v data content builds current state.db sources.local.yaml
```

`git status --short` must not list `data/`, `content/`, `builds/`, `current` or
`state.db`; `git check-ignore` prints a matching `.gitignore` rule for each.
`data/` is a separate repository: `git -C data remote -v` is empty.

## Results on this machine

Recorded on 2026-10-21, project root `/home/carloshnp/study-site`, Chromium 156
(Playwright 1.64.1, headless shell), Python 3.14.

| Gate | Command | Result |
|:--|:--|:--|
| Pipeline + API + publish | `.venv/bin/pytest -q` | **156 passed**, 1 dependency warning (11 of them in `tests/pipeline/test_publish.py`) |
| SPA units | `npm --prefix web run test` | **181 passed** in 29 files |
| Types / lint | `npm --prefix web run typecheck && npm --prefix web run lint` | exit 0 both (lint reports warnings only, all inside the copied coss `ui/` primitives) |
| E2E | `npm --prefix web run test:e2e` | **29 passed, 3 skipped, 0 failed** — mobile 13 passed + 3 skipped (content checks run once), desktop 16 passed |
| Media references | `.venv/bin/python -m pipeline.check_links` | `all media references resolve under …/content` |
| Publish, live overlap | 572 `curl` requests during one `pipeline.publish` | **572 × 200, 0 non-200**, `current` moved forward once |
| Unit files | `systemd-analyze --user verify systemd/*.service` | exit 0 |
| Service boot | transient unit with the unit's `ExecStart` | `{"status":"ok"}`, `/content/index.json` 200, deep chapter route 200, listening on `127.0.0.1:8080` only; stopped after the check |
| Watcher | `systemd/estudos-watch.sh --once` | exit 0: drift report → `build --all` (5 guides, 103 chapters, 343 images) → publish → `rebuild done` |
| Edge | `tailscale serve status` | 443 **not** published on this host (only VNC on 5900); see below |

E2E per project, exact counts:

```
mobile   13 passed, 3 skipped   (content.e2e.ts skipped by design)
desktop  16 passed
```

### Not verified here

- `tailscale serve --bg --https=443 http://127.0.0.1:8080` was **not** applied on this
  host: `tailscale serve status` currently shows only the VNC mapping on 5900. The
  command is in the README; run it once and the URL is live for the tailnet.
- The units were **not enabled** (`~/.config/systemd/user` belongs to the operator, not
  the repository). Their `ExecStart` was executed under a transient `systemd-run --user`
  unit instead, which is what the table above records.
- The phone pass is physical; the mobile project proves the 375×812 layout in Chromium,
  not iOS Safari.

