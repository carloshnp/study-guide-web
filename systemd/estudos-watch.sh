#!/usr/bin/env bash
# Watch the five guide source folders and republish after they settle.
#
# Contract (tasks/todo.md T30):
#   * inotifywait, recursive, one watch per source root from sources.local.yaml;
#   * 30 s debounce: a burst of writes triggers exactly one rebuild, 30 s after
#     the last event (ESTUDOS_WATCH_DEBOUNCE overrides, for tuning only);
#   * flock around the rebuild, so a manual publish and a watched one never run
#     at the same time;
#   * generated folders are ignored: assets/, relatorios/, reports/, research/,
#     plans/ and __pycache__/.
#
# Drift policy: by default a changed source is *reported* (`pipeline.drift`) and
# the site is rebuilt from the canonical copy in data/. Set
# ESTUDOS_WATCH_INGEST=1 to adopt the regenerated guides (`ingest --all --force`)
# before rebuilding. The source folders are never written to.
#
# `estudos-watch.sh --once` runs one rebuild and exits; that is how the install
# is smoke-tested without waiting for a file event.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

PY="$ROOT/.venv/bin/python"
# Inside builds/ (gitignored) so the lock never shows up in `git status`.
LOCK="$ROOT/builds/.watch.lock"
DEBOUNCE="${ESTUDOS_WATCH_DEBOUNCE:-30}"
ONCE=0
[ "${1:-}" = "--once" ] && ONCE=1

# One regex for every generated directory we do not care about.
EXCLUDE='(^|/)(assets|relatorios|reports|research|plans|__pycache__)(/|$)'

log() { printf '%s estudos-watch: %s\n' "$(date -Is)" "$*" >&2; }

source_roots() {
  "$PY" - <<'PY'
from pathlib import Path
import yaml

path = Path("sources.local.yaml")
try:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
except FileNotFoundError:
    raise SystemExit(f"{path}: missing; cannot watch guide sources")
for source in (data.get("guides") or {}).values():
    if source:
        print(Path(source).expanduser().parent)
PY
}

run_rebuild() {
  # One rebuild at a time, across the watcher, serve.sh and any manual invocation.
  mkdir -p "$ROOT/builds"
  exec 9>"$LOCK"
  if ! flock -n 9; then
    log "another publish holds $LOCK; skipping this cycle"
    return 0
  fi

  log "rebuild start"
  if ! "$PY" -m pipeline.drift; then
    log "drift reported above; data/ remains canonical"
  fi

  if [ "${ESTUDOS_WATCH_INGEST:-0}" = "1" ]; then
    log "ESTUDOS_WATCH_INGEST=1: adopting regenerated guides (ingest --all --force)"
    if ! "$PY" -m pipeline.ingest --all --force; then
      log "ingest failed; keeping the published build"
      flock -u 9
      return 1
    fi
  fi

  if ! "$PY" -m pipeline.build --all; then
    log "build failed; keeping the published build"
    flock -u 9
    return 1
  fi

  # Restart the reader only when its unit is installed; --once must also work on a
  # machine where the units have not been enabled yet.
  RESTART_FLAG=()
  if systemctl --user cat estudos.service >/dev/null 2>&1; then
    RESTART_FLAG=(--restart)
  fi
  if ! "$PY" -m pipeline.publish --skip-web-build "${RESTART_FLAG[@]}"; then
    log "publish failed; current still points at the previous build"
    flock -u 9
    return 1
  fi

  log "rebuild done"
  flock -u 9
  return 0
}

if [ "$ONCE" = "1" ]; then
  run_rebuild
  exit $?
fi

mapfile -t ALL_ROOTS < <(source_roots)
if [ "${#ALL_ROOTS[@]}" -eq 0 ]; then
  log "sources.local.yaml lists no guides; nothing to watch"
  exit 1
fi

while true; do
  ROOTS=()
  for root in "${ALL_ROOTS[@]}"; do
    if [ -d "$root" ]; then
      ROOTS+=("$root")
    else
      log "source root unavailable (drive unmounted?): $root"
    fi
  done

  if [ "${#ROOTS[@]}" -eq 0 ]; then
    log "no source root is mounted; retrying in 60s"
    sleep 60
    continue
  fi

  log "watching ${#ROOTS[@]} root(s), debounce ${DEBOUNCE}s"
  # Wait for the first event of a burst.
  inotifywait -q -r -e close_write,create,delete,move \
    --exclude "$EXCLUDE" --format '%w%f' "${ROOTS[@]}" 2>/dev/null || {
      log "inotifywait failed (watch limit or unmounted drive); retrying in 60s"
      sleep 60
      continue
    }
  log "change detected; debouncing for ${DEBOUNCE}s of quiet"
  # Then wait until the folder has been quiet for the whole debounce window.
  while inotifywait -q -r -e close_write,create,delete,move \
    --exclude "$EXCLUDE" --timeout "$DEBOUNCE" "${ROOTS[@]}" >/dev/null 2>&1; do
    :
  done
  run_rebuild || true
done
