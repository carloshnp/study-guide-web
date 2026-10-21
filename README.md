# Estudos

A single-user study-guide site: the merged markdown guides become JSON, the SPA renders
one page per chapter, and reading progress and notes live in SQLite. Built for a phone
first, served over Tailscale, no accounts.

- `SPEC.md` — what the site must do, including the nine success criteria.
- `docs/acceptance.md` — each criterion mapped to the command that proves it.
- `docs/contracts.md` — the JSON shapes the pipeline emits and the SPA consumes.
- `design-system/estudos/MASTER.md` — tokens, typography and per-page rules.
- `tasks/todo.md` — the build order (T00–T31).

```
catalog.yaml          published guides (in git)
sources.local.yaml    absolute paths of the source guides (gitignored)
data/                 canonical corpus, its own git repo (gitignored here)
content/              generated JSON + media cache (gitignored)
builds/<timestamp>/   published builds: web/ + content/ (gitignored)
current -> builds/<timestamp>
app/                  FastAPI: SPA, /content, /media, /api/progress, /api/notes
pipeline/             ingest, build, assets, search, drift, publish
web/                  Vite + React SPA; Playwright config, specs and e2e server live here
systemd/              user units: estudos.service, estudos-watch.service (+ watcher)
```

All commands below assume the repository root and a Linux host with Python 3.14 and
Node 26. They are copy-paste runnable as written.

## Setup

```bash
cd ~/study-site
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cd web && npm install && npx playwright install chromium && cd ..
```

`npx playwright install chromium` is needed once per machine (and after a Playwright
upgrade). Only chromium is used; both Playwright projects run on it.

The public repo carries no content. Two inputs are local only:

```bash
# catalog.yaml is in git; sources.local.yaml is not
cat > sources.local.yaml <<'YAML'
guides:
  aluminio: "/run/media/carloshnp/D/Faculdade/Disciplinas e Conteúdos/Metalurgia/outputs/metfis_2_aluminio/aluminio-final.md"
  titanio: "/run/media/carloshnp/D/Faculdade/Disciplinas e Conteúdos/Metalurgia/outputs/metfis_2_titanio/titanio-final.md"
  magnesio: "/run/media/carloshnp/D/Faculdade/Disciplinas e Conteúdos/Metalurgia/outputs/metfis_2_magnesio/outputs/magnesio-final.md"
  dsa: "/run/media/carloshnp/D/Programming/DSA/guide/outputs/dsa-guide.md"
  llm-l0l1: "/run/media/carloshnp/D/Programming/llm_chess/study-guide/outputs/foundations-l0l1-guide.md"
YAML
```

A guide may list several files instead of one; they are concatenated in that order, which is how
a Cálculo Numérico module keeps its theory and its question bank in a single guide:

```yaml
guides:
  cn-erros:
    - ".../Guias/calculo-numerico-modulo2-erros.md"
    - ".../Guias/calculo-numerico-modulo2-erros-questoes.md"
```

## Content

```bash
# adopt every published guide from its source folder into data/ (data/ is its own git repo)
.venv/bin/python -m pipeline.ingest --all

# report guides whose source changed since the ingest; never merges automatically
.venv/bin/python -m pipeline.drift

# adopt the changed guides on purpose
.venv/bin/python -m pipeline.ingest --all --force

# JSON contracts, WebP cache and search corpus
.venv/bin/python -m pipeline.build --all
.venv/bin/python -m pipeline.check_links
```

`pipeline.build --all` refuses to write when a guide's measured chapter count differs
from `expected_chapters` in `catalog.yaml`; fix the catalog, never the count.

## Run (development)

```bash
# terminal 1 — API + /content + /media on 8080, serving content/ and web/dist/
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8080

# terminal 2 — Vite on 5173, proxying /api, /content and /media to 8080
cd web && npm run dev
```

Open <http://127.0.0.1:5173>. The dev server reads the mutable `content/` tree, so a
`pipeline.build --all` is visible after a reload without restarting anything.

## Test

```bash
# backend, pipeline and API (includes the publish/atomic-swap test)
.venv/bin/pytest -q

# SPA unit and component tests
cd web && npm run test && npm run typecheck && npm run lint && cd ..

# end-to-end: mobile 375×812 and desktop 1440×900, against a published build
npm --prefix web run test:e2e
```

`npm --prefix web run test:e2e` runs `playwright test` from `web/`, which reads
`web/playwright.config.ts` and `web/e2e/*.e2e.ts`. The specs live inside `web/`
because Playwright resolves `@playwright/test` from `web/node_modules`. The
`webServer` entry runs `web/e2e/serve.sh`: build the SPA if `web/dist` is missing,
`pipeline.publish` into `builds/<timestamp>/`, then serve `current/web` and
`current/content` on
127.0.0.1:8099 with a throwaway `$TMPDIR/estudos-e2e.state.db`. Playwright starts it
before the first spec and kills it afterwards; nothing is left listening on 8099.

Useful during a debugging session:

```bash
cd web
npx playwright test --project=mobile
npx playwright test e2e/navigation.e2e.ts         # one spec
npx playwright test --headed                      # needs a desktop session
npx playwright show-trace test-results/<case>/trace.zip
```

## Two hosts: laptop (authoring) and carloshnp-1 (serving)

The site runs on **carloshnp-1** (`https://carloshnp-1.tailfa3301.ts.net/`), the
always-on machine, because the laptop travels. The laptop stays the authoring
host: the source folders live on its `D:` drive, `pipeline.ingest` runs there, and
`data/` is canonical there. The server holds a copy of `data/` and the published
build only.

```
laptop  D: sources --> pipeline.ingest --> ~/study-site/data (canonical, own git)
                                              |
                                              |  scripts/sync-remote.sh (rsync + build + publish)
                                              v
carloshnp-1  ~/study-site/data --> pipeline.build --> content/ --> builds/<ts>/ <-- current
                                              ^                                  |
                                              |                                  v
                        estudos.service (127.0.0.1:8080) <-- tailscale serve 443
                                              |
                                     state.db (progress + notes, lives HERE)
```

Rules that keep the two hosts sane:

- **Never sync `state.db`.** It holds the reading progress and notes written from
  the phone; the laptop's copy is stale the moment the phone marks a section.
- **The watcher runs on the laptop only.** `estudos-watch.service` needs the
  `D:` sources and `sources.local.yaml`; on the server those paths do not exist.
  Do not enable it there.
- **One public edge.** `tailscale serve --https=443` is on carloshnp-1 and off on
  the laptop (`tailscale serve --https=443 off`), so there is a single URL and a
  single database.
- `tailscale serve` needs the operator bit once per host:
  `sudo tailscale set --operator=$USER`. `loginctl enable-linger $USER` keeps the
  user unit alive without a login session.

Adding or regenerating a guide:

```bash
# laptop
cd ~/study-site
.venv/bin/python -m pipeline.ingest --all          # adopt from D:
.venv/bin/python -m pipeline.drift                 # expect "ok" for all
scripts/sync-remote.sh                             # rsync data/, rebuild, publish, restart
curl -s https://carloshnp-1.tailfa3301.ts.net/content/index.json | jq '.guides | length'
```

## Deploy (systemd user units + Tailscale)

The service serves the **published** tree, never the working directories:

- `pipeline.publish` copies `web/dist` and `content` into `builds/<timestamp>/`,
  smoke-checks the copy, renames it into place, then swaps the `current` symlink
  with `os.replace`. A reader resolving `current` always sees one complete build.
- `systemd/estudos.service` builds `create_app(web_dist=current/web,
  content_dir=current/content)` on 127.0.0.1:8080. uvicorn resolves that path at
  import, so a publish restarts the unit.

One-time install:

```bash
cd ~/study-site
.venv/bin/python -m pipeline.build --all
.venv/bin/python -m pipeline.publish          # npm run build + builds/<ts> + current
mkdir -p ~/.config/systemd/user
cp systemd/estudos.service systemd/estudos-watch.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now estudos.service
tailscale serve --bg --https=443 http://127.0.0.1:8080
tailscale serve status                          # expect https://<host>.<tailnet>.ts.net -> 127.0.0.1:8080
systemctl --user status estudos.service
curl -s http://127.0.0.1:8080/api/health        # {"status":"ok"}
```

Publish by hand after a content change:

```bash
cd ~/study-site
.venv/bin/python -m pipeline.build --all
.venv/bin/python -m pipeline.publish --restart   # npm run build + swap + restart
.venv/bin/python -m pipeline.publish --skip-web-build   # JSON/media only, SPA unchanged
```

Roll back to any previous build (they are kept, `--keep` defaults to 5):

```bash
cd ~/study-site
ls builds/
ln -sfn "builds/20261021T120000Z" current
systemctl --user restart estudos.service
```

The watcher (`systemd/estudos-watch.service`) runs `systemd/estudos-watch.sh`:

- watches the five source roots derived from `sources.local.yaml` with recursive
  `inotifywait`, ignoring `assets/`, `relatorios/`, `reports/`, `research/`,
  `plans/` and `__pycache__/`;
- debounces until the folder has been quiet for 30 s, so one regenerated guide
  produces one rebuild (`ESTUDOS_WATCH_DEBOUNCE` overrides for tuning);
- takes `flock` on `.estudos-watch.lock` for the whole rebuild, so a manual publish
  and a watched one never overlap;
- runs `pipeline.drift`, then `pipeline.build --all`, then
  `pipeline.publish --skip-web-build` — with `--restart` only when
  `estudos.service` is actually installed, so `--once` also works before the units
  are enabled.

Drift stays advisory by default: the watcher reports it and rebuilds from the
canonical copy in `data/`. Set `ESTUDOS_WATCH_INGEST=1` in the unit environment to
adopt regenerated guides (`pipeline.ingest --all --force`) before rebuilding.

```bash
systemctl --user enable --now estudos-watch.service
systemctl --user status estudos-watch.service
journalctl --user -u estudos-watch -f
systemctl --user stop estudos-watch.service     # stop watching
systemd/estudos-watch.sh --once                  # one rebuild, no waiting for events
```

Logs and health:

```bash
journalctl --user -u estudos -f
curl -s http://127.0.0.1:8080/api/health
curl -s http://127.0.0.1:8080/content/index.json | jq '.guides[].id'
```

## Troubleshooting

- **503 “SPA not built yet”** — `current` is missing or `builds/<ts>/web/index.html`
  is absent. Run `pipeline.publish` (it needs `web/dist`: `npm --prefix web run build`).
- **Chapter count mismatch on build** — `catalog.yaml` `expected_chapters` is stale;
  the error names the guide, the expected and the measured count.
- **`web/e2e/serve.sh` cannot publish** — publish refuses a real directory at `current`;
  remove it and re-run (`rm -rf current`), publish owns that path as a symlink.
- **Port already in use** — `ESTUDOS_E2E_PORT=8199 npm --prefix web run test:e2e`,
  and `ESTUDOS_E2E_PORT` is read by both the config and `e2e/serve.sh`.
- **`data/` looks dirty in `git status`** — it is its own repository. Use
  `git -C data status`, never add it to the public repo.
