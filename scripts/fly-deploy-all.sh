#!/usr/bin/env bash
# Deploy standard Fly.io dei bridge Alfred (monorepo).
# Usa fly deploy sulla sottocartella — metodo documentato Fly per monorepo.
# https://fly.io/docs/launch/monorepo/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FLY="${FLY:-flyctl}"

command -v "$FLY" >/dev/null 2>&1 || { echo "flyctl richiesto"; exit 1; }

if [[ -z "${FLY_API_TOKEN:-}" ]]; then
  echo "FLY_API_TOKEN non impostato (fly auth token o fly tokens create deploy)"
  exit 1
fi

cd "$ROOT"

deploy_bridge() {
  local dir="$1"
  local app="$2"
  echo "Deploy $app da ./$dir ..."
  "$FLY" deploy "./${dir}" --remote-only -a "$app"
}

deploy_bridge bridge-xmpp alfred-im-bridge-xmpp
deploy_bridge bridge-matrix alfred-im-bridge-matrix

echo "Deploy completato."
