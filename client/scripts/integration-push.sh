#!/usr/bin/env bash
# Copyright (C) 2026 im.alfred
#
# SPDX-License-Identifier: GPL-3.0-or-later

# Integration push: smoke SQL su stack locale, oppure delivery plane live (agent1/2).
# Nessun uso di account utente (test1–test4) negli script automatici.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

is_local_supabase() {
  [[ "${SUPABASE_URL:-}" =~ localhost|127\.0\.0\.1 ]]
}

run_push_sql_smoke() {
  if ! docker ps --format '{{.Names}}' | grep -q '^supabase_db_alfred$'; then
    echo "SKIP: container supabase_db_alfred assente" >&2
    return 1
  fi
  echo "==> Smoke SQL push (stack locale)"
  for smoke in "$REPO_ROOT"/supabase/tests/push_*.sql; do
    [[ -f "$smoke" ]] || continue
    echo "    $(basename "$smoke")"
    docker exec -i supabase_db_alfred psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
      <"$smoke" >/dev/null
  done
  echo "push SQL smoke OK"
  return 0
}

if is_local_supabase && run_push_sql_smoke; then
  echo "integration-push OK (SQL locale)"
  exit 0
fi

echo "==> integration-push: delivery plane live (richiede AGENT1/2 in env)"
if [[ -z "${AGENT1_EMAIL:-}" || -z "${AGENT1_PASS:-}" ]]; then
  echo "SKIP: AGENT1_EMAIL/AGENT1_PASS non impostati"
  echo "OK: supabase start + eval \$(supabase status -o env) + bash scripts/test.sh integration-push"
  echo "OK: oppure bash scripts/test.sh e2e-push-local"
  exit 0
fi

bash scripts/integration-multi-account.sh "$@"
echo "integration-push OK (delivery plane live)"
echo "==> Smoke SQL push: eseguire su DB di test (supabase/tests/push_*_smoke.sql)"
