#!/usr/bin/env bash
# Start, stop and inspect the Estudos server (systemd user unit estudos.service).
#
# The unit runs in the background under systemd, so it keeps serving after this
# shell or Claude Code closes (user lingering is enabled on this machine).
#
#   scripts/estudos-server.sh            # start (default)
#   scripts/estudos-server.sh stop
#   scripts/estudos-server.sh restart
#   scripts/estudos-server.sh status
#   scripts/estudos-server.sh logs       # follow the journal (Ctrl+C to leave)
#
# First run installs the unit from systemd/ if it is missing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT="estudos.service"
UNIT_DIR="$HOME/.config/systemd/user"
URL="http://127.0.0.1:8080/api/health"

install_unit() {
  mkdir -p "$UNIT_DIR"
  cp "$ROOT/systemd/$UNIT" "$UNIT_DIR/$UNIT"
  systemctl --user daemon-reload
  systemctl --user enable "$UNIT" >/dev/null
}

check_health() {
  for _ in 1 2 3 4 5; do
    if curl -sf "$URL" >/dev/null 2>&1; then
      echo "Estudos is up: $URL"
      return 0
    fi
    sleep 1
  done
  echo "Estudos did not answer at $URL; see: $0 logs" >&2
  return 1
}

case "${1:-start}" in
  start)
    [[ -f "$UNIT_DIR/$UNIT" ]] || install_unit
    systemctl --user start "$UNIT"
    check_health
    ;;
  stop)
    systemctl --user stop "$UNIT"
    echo "Estudos stopped."
    ;;
  restart)
    [[ -f "$UNIT_DIR/$UNIT" ]] || install_unit
    systemctl --user restart "$UNIT"
    check_health
    ;;
  status)
    systemctl --user status "$UNIT" --no-pager || true
    ;;
  logs)
    journalctl --user -u "$UNIT" -f
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status|logs}" >&2
    exit 2
    ;;
esac
