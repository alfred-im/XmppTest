#!/usr/bin/env bash
# Copyright (C) 2026 im.alfred
#
# SPDX-License-Identifier: GPL-3.0-or-later

# Push e2e Playwright — solo stack locale isolato (nessun dato utente sul live).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_URL:-}" || ! "$SUPABASE_URL" =~ localhost|127\.0\.0\.1 ]]; then
  echo "e2e-push-local richiede Supabase locale:" >&2
  echo "  supabase start" >&2
  echo "  eval \"\$(supabase status -o env)\"" >&2
  echo "  export ALFRED_BASE_URL=http://localhost:8080/" >&2
  exit 1
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "SUPABASE_SERVICE_ROLE_KEY mancante — eval \$(supabase status -o env)" >&2
  exit 1
fi

if [[ ! -x node_modules/.bin/playwright ]]; then
  npm install
  npx playwright install chromium
fi

export ALFRED_BASE_URL="${ALFRED_BASE_URL:-http://localhost:8080/}"

echo "==> e2e-push-local ALFRED_BASE_URL=${ALFRED_BASE_URL} SUPABASE_URL=${SUPABASE_URL}"
npx playwright test e2e/push-registration.spec.ts "$@"
