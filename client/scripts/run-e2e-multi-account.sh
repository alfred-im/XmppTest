#!/usr/bin/env bash
# E2E multi-account (manifest + F5) contro flutter web-server locale.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SESSION_NAME="flutter-dev-server"

if ! curl -sf -m 3 http://localhost:8080/ >/dev/null; then
  echo "==> Avvio flutter web-server su :8080"
  tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null || \
    tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$ROOT" -- "${SHELL:-bash}" -l
  tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" \
    "cd $ROOT && /opt/flutter/bin/flutter run -d web-server --web-port=8080 --web-hostname=0.0.0.0" C-m
  for _ in $(seq 1 60); do
  curl -sf -m 3 http://localhost:8080/ >/dev/null && break
    sleep 5
  done
fi

export ALFRED_BASE_URL="${ALFRED_BASE_URL:-http://localhost:8080/}"
echo "==> Playwright multi-account (${ALFRED_BASE_URL})"
npx playwright test e2e/multi-account-persist.spec.ts "$@"
