#!/usr/bin/env bash
# Deploy bridge Fly da root repo — Fly legge fly.*.toml + Dockerfile.bridge-* in root.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="${ROOT}/deploy/fly-bridges.json"
FLY="${FLY:-flyctl}"

command -v jq >/dev/null 2>&1 || { echo "jq richiesto"; exit 1; }
command -v "$FLY" >/dev/null 2>&1 || { echo "flyctl richiesto"; exit 1; }

cd "$ROOT"

jq -c '.apps[]' "$MANIFEST" | while IFS= read -r entry; do
  config="$(echo "$entry" | jq -r '.config')"
  app="$(echo "$entry" | jq -r '.app')"
  echo "Deploy $app (--config $config) ..."
  "$FLY" deploy --config "$config" --remote-only -a "$app"
done

echo "Deploy completato."
