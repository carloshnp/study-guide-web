#!/usr/bin/env bash
# Pushes the canonical corpus from this machine to the always-on host and
# republishes there. Used after `pipeline.ingest` adopts a new or regenerated
# guide: `data/` is the source of truth on the laptop, the server only serves.
#
#   scripts/sync-remote.sh            # sync + build + publish + restart
#   scripts/sync-remote.sh --dry-run  # list what rsync would copy; change nothing
#   HOST=carloshnp-1 scripts/sync-remote.sh
#
# Never copies `state.db`: reading progress and notes belong to the server's
# database, and overwriting it would erase what was marked on the phone.
#
# Never copies or deletes on the host beyond what this machine has:
#   - no `--delete`: the host can hold files that exist only there (a guide's
#     section sidecar and images, or commits made on the host). An earlier run
#     with `--delete` removed them.
#   - `.git/` is excluded: the data repo's history and index on the host are
#     the host's own; replacing them would drop commits that exist only there.
# To remove a file on the host, do it by hand after checking it.
set -euo pipefail

HOST="${HOST:-carloshnp-1}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=10)

DRY_RUN=0
case "${1:-}" in
  "") ;;
  --dry-run) DRY_RUN=1 ;;
  -h|--help)
    sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 0 ;;
  *) echo "usage: $0 [--dry-run]" >&2; exit 2 ;;
esac

if ! ssh "${SSH_OPTS[@]}" "$HOST" true 2>/dev/null; then
  echo "cannot reach $HOST over ssh (tailnet down, or the Tailscale SSH check expired)" >&2
  exit 1
fi

echo "== drift on this machine =="
(cd "$ROOT" && .venv/bin/python -m pipeline.drift --json 2>/dev/null | jq -r '.[] | "\(.guide_id)\t\(.status)"') || true

if [ "$DRY_RUN" = 1 ]; then
  echo "== dry run: data/ files that would be copied to $HOST (no deletes, no .git) =="
  plan="$(mktemp)"
  trap 'rm -f "$plan"' EXIT
  rsync -a --dry-run --itemize-changes \
    --exclude='.git/' --exclude='state.db' --exclude='state.db-*' \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/data/" "$HOST:~/study-site/data/" > "$plan"
  # Directory lines (".d...") are noise; no matching lines means nothing to copy.
  { grep -v '^\.d' "$plan" || true; } | head -60
  echo "dry run: $(grep -c '^<f' "$plan" || true) file(s) would be copied, $(grep -c '^\*deleting' "$plan" || true) deleted (none by design)"
  echo "dry run: nothing changed on $HOST"
  exit 0
fi

echo "== updating code on $HOST =="
ssh "${SSH_OPTS[@]}" "$HOST" 'cd ~/study-site && git pull --ff-only --quiet && git log --oneline -1'

echo "== syncing data/ to $HOST (copy only, no deletes, no .git) =="
rsync -a --itemize-changes \
  --exclude='.git/' --exclude='state.db' --exclude='state.db-*' \
  -e "ssh ${SSH_OPTS[*]}" \
  "$ROOT/data/" "$HOST:~/study-site/data/" | tail -20

echo "== rebuilding and publishing on $HOST =="
ssh "${SSH_OPTS[@]}" "$HOST" 'cd ~/study-site && .venv/bin/python -m pipeline.build --all | tail -7 && .venv/bin/python -m pipeline.publish --restart | tail -8'

echo "== live check =="
ssh "${SSH_OPTS[@]}" "$HOST" 'for i in $(seq 1 10); do code=$(curl -s -m 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/health); [ "$code" = 200 ] && break; sleep 1; done; echo "health $code"; curl -s -m 5 http://127.0.0.1:8080/api/health; echo; curl -s -m 5 -o /dev/null -w "index %{http_code}\n" http://127.0.0.1:8080/content/index.json'
