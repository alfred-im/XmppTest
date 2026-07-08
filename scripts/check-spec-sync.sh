#!/usr/bin/env bash
# SDD v2 — controlli allineamento promesse ↔ repository.
# Exit 0 = OK; exit 1 = problemi da correggere prima del merge.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SPECS_DIR="docs/specs/capabilities"
PRODUCT_DIR="docs/specs/promises/product"
SURFACES_DIR="docs/specs/surfaces"
INDEX="docs/specs/index.md"
REGISTRY="docs/specs/registry.md"
ERR=0

echo "==> SDD v2: registry e contratti SYSTEM"
if [[ ! -f "$REGISTRY" ]]; then
  echo "ERROR: manca $REGISTRY" >&2
  ERR=1
fi
for contract in docs/specs/contracts/rpc.md docs/specs/contracts/schema.md; do
  if [[ ! -f "$contract" ]]; then
    echo "ERROR: manca $contract" >&2
    ERR=1
  fi
done

echo "==> SDD v2: promesse PRODUCT in registry"
for prom in "$PRODUCT_DIR"/PROM-*.md; do
  [[ -f "$prom" ]] || continue
  base="$(basename "$prom" .md)"
  if ! grep -q "$base" "$REGISTRY"; then
    echo "ERROR: $base non elencato in $REGISTRY" >&2
    ERR=1
  fi
  if ! grep -q 'Promessa ID' "$prom"; then
    echo "ERROR: $prom senza campo Promessa ID" >&2
    ERR=1
  fi
  if ! grep -qE '\*\*PROM-[A-Z0-9-]+-[0-9]+\*\*' "$prom"; then
    echo "WARN: $prom senza PROM-ID (SDD v2)" >&2
  fi
  if ! grep -q 'Tracciabilità' "$prom"; then
    echo "WARN: $prom senza sezione Tracciabilità" >&2
  fi
done

echo "==> SDD v2: superfici in registry"
for surf in "$SURFACES_DIR"/SURF-*.md; do
  [[ -f "$surf" ]] || continue
  base="$(basename "$surf" .md)"
  if ! grep -q "$base" "$REGISTRY"; then
    echo "ERROR: $base non elencato in $REGISTRY" >&2
    ERR=1
  fi
  if ! grep -q 'Superficie ID' "$surf"; then
    echo "ERROR: $surf senza campo Superficie ID" >&2
    ERR=1
  fi
done

echo "==> SDD: catalogo capability legacy vs index.md"
for spec in "$SPECS_DIR"/*.spec.md; do
  [[ -f "$spec" ]] || continue
  base="$(basename "$spec")"
  id="${base%.spec.md}"
  if ! grep -q "$id" "$INDEX"; then
    echo "ERROR: $base non elencato in $INDEX" >&2
    ERR=1
  fi
  if ! grep -q 'Spec ID' "$spec"; then
    echo "ERROR: $base senza campo Spec ID" >&2
    ERR=1
  fi
  if ! grep -q 'Tracciabilità' "$spec"; then
    echo "WARN: $base senza sezione Tracciabilità" >&2
  fi
  if ! grep -qE '\*\*[A-Z0-9-]+-REQ-[0-9]+\*\*' "$spec"; then
    if grep -q '`superseded`' "$spec" 2>/dev/null; then
      : # capability storica — mappa REQ → v2, non richiede REQ-ID inline
    else
      echo "WARN: $base senza REQ-ID (capability legacy)" >&2
    fi
  fi
done

echo "==> SDD: contratti mailbox (no target stale)"
for contract in docs/specs/contracts/rpc.md docs/specs/contracts/schema.md; do
  if grep -q 'non su `main`' "$contract" 2>/dev/null; then
    echo "ERROR: $contract contiene ancora 'non su main' per mailbox" >&2
    ERR=1
  fi
  if grep -q '20260702120100' "$contract" 2>/dev/null && ! grep -q '20260704120000' "$contract" 2>/dev/null; then
    echo "ERROR: $contract milestone migrazioni obsoleto (manca 20260704120000)" >&2
    ERR=1
  fi
done

echo "==> SDD: smoke SQL tracciati MAILBOX-*"
MAILBOX_SPECS=(docs/specs/capabilities/MAILBOX-*.spec.md)
for smoke in supabase/tests/mailbox_*.sql; do
  [[ -f "$smoke" ]] || continue
  base="$(basename "$smoke")"
  if ! grep -rq "$base" "${MAILBOX_SPECS[@]}" docs/specs/contracts/rpc.md 2>/dev/null; then
    echo "WARN: $base non referenziato in spec MAILBOX o rpc.md" >&2
  fi
done
while IFS= read -r spec; do
  [[ -f "$spec" ]] || continue
  while IFS= read -r smoke_path; do
    [[ -n "$smoke_path" ]] || continue
    if [[ ! -f "$smoke_path" ]]; then
      echo "ERROR: $spec referenzia $smoke_path ma il file non esiste" >&2
      ERR=1
    fi
  done < <(grep -oE 'supabase/tests/[a-z0-9_]+\.sql' "$spec" | sort -u)
done < <(printf '%s\n' "${MAILBOX_SPECS[@]}")

echo "==> SDD: smoke SQL tracciati GROUP-*"
GROUP_SPECS=(docs/specs/capabilities/GROUP-*.spec.md)
for smoke in supabase/tests/group_*.sql; do
  [[ -f "$smoke" ]] || continue
  base="$(basename "$smoke")"
  if ! grep -rq "$base" "${GROUP_SPECS[@]}" docs/specs/contracts/rpc.md 2>/dev/null; then
    echo "WARN: $base non referenziato in spec GROUP o rpc.md" >&2
  fi
done
while IFS= read -r spec; do
  [[ -f "$spec" ]] || continue
  while IFS= read -r smoke_path; do
    [[ -n "$smoke_path" ]] || continue
    if [[ ! -f "$smoke_path" ]]; then
      echo "ERROR: $spec referenzia $smoke_path ma il file non esiste" >&2
      ERR=1
    fi
  done < <(grep -oE 'supabase/tests/[a-z0-9_]+\.sql' "$spec" | sort -u)
done < <(printf '%s\n' "${GROUP_SPECS[@]}")

if git rev-parse --git-dir >/dev/null 2>&1; then
  if git diff --name-only origin/main...HEAD 2>/dev/null | grep -q '^supabase/migrations/.*\.sql$'; then
    if ! git diff --name-only origin/main...HEAD 2>/dev/null | grep -q '^docs/specs/'; then
      echo "WARN: migrazioni SQL in branch ma nessun diff in docs/specs/ — verificare rpc.md / schema.md" >&2
    fi
  fi
fi

if [[ "$ERR" -ne 0 ]]; then
  echo "check-spec-sync: FAILED" >&2
  exit 1
fi

echo "check-spec-sync: OK"
