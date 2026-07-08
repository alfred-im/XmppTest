# INBOX-SEARCH — Ricerca on-demand inbox (superseded)

| Campo | Valore |
|-------|--------|
| **Spec ID** | `INBOX-SEARCH` |
| **Layer** | capability (legacy v1) |
| **Status** | `superseded` |
| **Ultima revisione** | 2026-07-08 |
| **PR** | #132 |
| **Superseded by** | [PROM-LIST-FILTER](../promises/product/PROM-LIST-FILTER.md), [SURF-INBOX](../surfaces/SURF-INBOX.md) |

> **Non usare per nuovo lavoro.** Il contratto UX e di prodotto vive in SDD v2. Questo file conserva solo la mappa storica REQ-ID → promesse v2.

---

## Mappa storica REQ → SDD v2

| INBOX-SEARCH-REQ | Promessa v2 |
|------------------|-------------|
| REQ-001, 002, 004, 005, 009, 010, 012–014 | [PROM-LIST-FILTER](../promises/product/PROM-LIST-FILTER.md) |
| REQ-003, 006–008 | [SURF-INBOX](../surfaces/SURF-INBOX.md) |
| REQ-011 | PROM-LIST-FILTER-030 (no RPC lista) |

---

## Tracciabilità

Vedi [PROM-LIST-FILTER](../promises/product/PROM-LIST-FILTER.md) e [SURF-INBOX](../surfaces/SURF-INBOX.md).

---

| Documento | Ruolo |
|-----------|--------|
| [registry.md](../registry.md) | Indice promesse |
| [inbox-search-toggle.md](../../design/inbox-search-toggle.md) | Evidenza UX PR #132 |
| [MAILBOX-INBOX.spec.md](./MAILBOX-INBOX.spec.md) | Sorgente dati inbox |

**Codice**: `client/lib/widgets/collapsible_list_search.dart`, `inbox_panel.dart`, `inbox_controller.dart`
