#!/usr/bin/env bash
# Copyright (C) 2026 im.alfred
#
# SPDX-License-Identifier: GPL-3.0-or-later

# Integration push: delivery plane API (stesso di integration-multi-account).
# Verifica push DB: supabase/tests/push_*_smoke.sql (stack locale o MCP isolato).
# Nessun uso di account utente (test1–test4) né alfredagent sul live.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> integration-push: delivery plane (richiede AGENT1/2 in env se live)"
if [[ -z "${AGENT1_EMAIL:-}" || -z "${AGENT1_PASS:-}" ]]; then
  echo "SKIP: AGENT1_EMAIL/AGENT1_PASS non impostati — nessun login live automatico"
  echo "OK: usare stack locale (supabase start) + bash scripts/test.sh e2e-push-local"
  exit 0
fi

bash scripts/integration-multi-account.sh "$@"
echo "integration-push OK (delivery plane)"
echo "==> Smoke SQL push: supabase/tests/push_*_smoke.sql sul DB di test"
