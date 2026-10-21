#!/usr/bin/env bash
# Serve a freshly published build for Playwright (and for any manual check).
#
# 1. builds the SPA if web/dist is missing;
# 2. publishes with pipeline.publish (staging copy, smoke check, atomic swap);
# 3. serves current/web + current/content on 127.0.0.1:8099 with a throwaway
#    SQLite database, so e2e runs never touch state.db.
#
# Playwright owns this process: it starts it from webServer and kills it when the
# run ends. `exec` keeps uvicorn in this pid so no child survives the kill.

set -euo pipefail

# web/e2e/serve.sh -> repository root
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

PY=".venv/bin/python"
PORT="${ESTUDOS_E2E_PORT:-8099}"
export ESTUDOS_DB="${TMPDIR:-/tmp}/estudos-e2e.state.db"
rm -f "$ESTUDOS_DB" "$ESTUDOS_DB-wal" "$ESTUDOS_DB-shm"

if [ ! -f web/dist/index.html ]; then
  (cd web && npm run build)
fi

# Serialise with the watcher and any manual publish: the swap is atomic, but two
# concurrent copies would still waste two full 120 MB trees.
mkdir -p builds
flock -w 300 builds/.watch.lock "$PY" -m pipeline.publish --skip-web-build --keep 3 >&2

exec "$PY" -c "import uvicorn; from pathlib import Path; from app.main import create_app; uvicorn.run(create_app(web_dist=Path('current/web'), content_dir=Path('current/content')), host='127.0.0.1', port=${PORT}, log_level='warning')"
