#!/usr/bin/env bash
# Pushes the canonical corpus from this machine to the always-on host and
# republishes there. Used after `pipeline.ingest` adopts a new or regenerated
# guide: `data/` is the source of truth on the laptop, the server only serves.
#
#   scripts/sync-remote.sh            # sync + build + publish + restart
#   scripts/sync-remote.sh --dry-run  # show what rsync would move
#   HOST=carloshnp-1 scripts/sync-remote.sh
#
# Never copies `state.db`: reading progress and notes belong to the server's
# database, and overwriting it would erase what was marked on the phone.
set -euo pipefail

HOST="${HOST:-carloshnp-1}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=10)

if ! ssh "${SSH_OPTS[@]}" "$HOST" true 2>/dev/null; then
  echo "cannot reach $HOST over ssh (tailnet down, or the Tailscale SSH check expired)" >&2
  exit 1
fi

echo "== drift on this machine =="
(cd "$ROOT" && .venv/bin/python -m pipeline.drift --json | jq -r '.[] | "\(.guide)\t\(.status)"')

echo "== syncing data/ to $HOST =="
rsync -a --delete --itemize-changes \
  -e "ssh ${SSH_OPTS[*]}" \
  "$ROOT/data/" "$HOST:~/study-site/data/" | tail -20

echo "== rebuilding and publishing on $HOST =="
ssh "${SSH_OPTS[@]}" "$HOST" 'cd ~/study-site && .venv/bin/python -m pipeline.build --all | tail -7 && .venv/bin/python -m pipeline.publish --restart | tail -8'

echo "== live check =="
ssh "${SSH_OPTS[@]}" "$HOST" 'curl -s -m 5 http://127.0.0.1:8080/api/health; echo; curl -s -m 5 -o /dev/null -w "index %{http_code}\n" http://127.0.0.1:8080/content/index.json'
