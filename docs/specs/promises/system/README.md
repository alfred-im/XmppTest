# Promesse SYSTEM — piattaforma

**Ultima revisione**: 2026-07-08

In SDD v2 le promesse **SYSTEM** sono il contratto tra client, piattaforma Supabase e bridge. Il dettaglio backend **non è stato ridotto**: resta nei documenti canonici sotto.

---

## Documenti canonici

| Documento | Contenuto |
|-----------|-----------|
| [../contracts/schema.md](../contracts/schema.md) | Tabelle, colonne, enum, RLS, bucket storage, vincoli |
| [../contracts/rpc.md](../contracts/rpc.md) | Firme RPC, parametri, semantica, mapping client |

Ogni modifica a schema o RPC **deve** aggiornare questi file e la capability legacy correlata (`MAILBOX-*`, `GROUP-*`, …) finché non distillata.

---

## Verifica

- Smoke SQL: `supabase/tests/*.sql`
- Gate: `bash scripts/check-spec-sync.sh`
- Integrazione live: `cd client && bash scripts/test.sh integration`

---

## Capability legacy come bundle SYSTEM+PRODUCT

Le spec in [../capabilities/](../capabilities/) con prefisso `MAILBOX-`, `GROUP-`, `RECEPTION-ALLOWLIST`, ecc. restano **authoritative** per:

- REQ backend già `implemented`
- Tracciabilità REQ-ID → smoke / test
- Amend sicurezza e piattaforma

Nuovo lavoro **solo backend**: aggiornare `contracts/` + capability legacy; opzionalmente estrarre `SYS-*` dedicato in futuro.

Nuovo lavoro **UX cross-cutting**: promessa PRODUCT + SURFACE (non duplicare in capability monolitica).
