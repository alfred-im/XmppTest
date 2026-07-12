# Copyright (C) 2026 im.alfred
#
# SPDX-License-Identifier: GPL-3.0-or-later

#!/usr/bin/env bash
# Smoke test: build bridge image and verify /health on both ports (Fly entrypoint).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE="${IMAGE:-alfred-bridges-smoke}"
XMPP_PORT="${XMPP_PORT:-18080}"
MATRIX_PORT="${MATRIX_PORT:-18081}"

echo "==> docker build"
docker build -t "$IMAGE" .

cid=""
cleanup() {
  if [[ -n "$cid" ]]; then
    docker rm -f "$cid" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "==> docker run (CMD as in Dockerfile)"
cid="$(docker run -d -p "${XMPP_PORT}:8080" -p "${MATRIX_PORT}:8081" "$IMAGE")"

for _ in $(seq 1 30); do
  if curl -sf -m 2 "http://127.0.0.1:${XMPP_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

xmpp="$(curl -sf -m 5 "http://127.0.0.1:${XMPP_PORT}/health")"
matrix="$(curl -sf -m 5 "http://127.0.0.1:${MATRIX_PORT}/health")"

echo "$xmpp" | grep -q '"status": "ok"'
echo "$matrix" | grep -q '"status": "ok"'
echo "OK XMPP:  $xmpp"
echo "OK Matrix: $matrix"
