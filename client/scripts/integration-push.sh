#!/usr/bin/env bash
# Copyright (C) 2026 im.alfred
#
# SPDX-License-Identifier: GPL-3.0-or-later

# Integration push: subscription + push_notify outbox after delivery.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> integration-push: delegating to integration-multi-account (delivery plane)"
bash scripts/integration-multi-account.sh "$@"

echo "==> integration-push: note — full push_notify verificato da push_delivery_trigger_smoke.sql su DB"
