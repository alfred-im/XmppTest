# PROM-RECEPTION-FILTER — Filtro ricezione sempre attivo e rifiuto silenzioso

| Campo | Valore |
|-------|--------|
| **Promessa ID** | `PROM-RECEPTION-FILTER` |
| **Classe** | PRODUCT |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Supersedes** | RECEPTION-ALLOWLIST semantica osservabile utente (SDD v1 epurato) |
| **PR origine** | #161 |

Promessa di prodotto: il destinatario controlla chi può **consegnargli** messaggi; filtro **sempre attivo**; rifiuto **silenzioso** verso il mittente (stile blocco XMPP).

Gate server e schema `reception_allowlist` restano in capability legacy e `contracts/schema.md`.

---

## 1. Problema / obiettivo

L'utente Alfred decide chi può materializzare messaggi nel proprio archivio. Lista vuota = nessuno può recapitare. Il mittente non riceve errore né etichetta «bloccato»: vede al massimo ✓ (accettato server), mai ✓✓ (consegnato) se il destinatario non consente.

### Semantica spunte (mittente) — due livelli

1. **✓** — server ha **accettato** il messaggio (copia mittente persistita; RPC ok).
2. **✓✓ grigie** — messaggio **consegnato** al destinatario (copia nel suo archivio; `delivered_at` valorizzato).

Su rifiuto allow list: il mittente resta al livello **1** per sempre — come blocco XMPP, senza feedback esplicito.

---

## 2. Promesse

### MUST — semantica filtro

| ID | Promessa |
|----|----------|
| **PROM-RECEPTION-FILTER-001** | Filtro **sempre attivo** — nessun toggle on/off globale utente o piattaforma |
| **PROM-RECEPTION-FILTER-002** | Lista vuota → **nessun** mittente può consegnare messaggi nuovi |
| **PROM-RECEPTION-FILTER-003** | Nuovo account: lista vuota di default (nessuno può scrivere finché non si aggiunge qualcuno) |
| **PROM-RECEPTION-FILTER-004** | Condizione recapito: mittente ∈ `reception_allowlist` del destinatario |
| **PROM-RECEPTION-FILTER-005** | Su rifiuto: copia mittente esiste (✓); **nessuna** copia destinatario; `delivered_at` null permanente sulla copia mittente |
| **PROM-RECEPTION-FILTER-006** | Su rifiuto: RPC ritorna successo al mittente — **nessun** errore, codice o messaggio «bloccato» / «rifiutato» |
| **PROM-RECEPTION-FILTER-007** | Destinatario **non** vede messaggi rifiutati nell'inbox |
| **PROM-RECEPTION-FILTER-008** | Rimozione da lista: messaggi già in archivio **restano**; solo messaggi **nuovi** dopo rimozione rifiutati |
| **PROM-RECEPTION-FILTER-009** | Aggiunta a lista: **nessuna** retro-consegna di messaggi precedentemente rifiutati |

### MUST — isolamento da rubrica

| ID | Promessa |
|----|----------|
| **PROM-RECEPTION-FILTER-010** | Rubrica (`contacts`) **non** implica consenso ricezione — vedi [PROM-PERSONAL-CONTACTS](./PROM-PERSONAL-CONTACTS.md) |

### MUST NOT

| ID | Promessa |
|----|----------|
| **PROM-RECEPTION-FILTER-020** | Errore RPC o messaggio «bloccato» verso il mittente |
| **PROM-RECEPTION-FILTER-021** | Mostrare al mittente che il destinatario usa un filtro di ricezione |
| **PROM-RECEPTION-FILTER-022** | Toggle globale enable/disable della funzionalità |
| **PROM-RECEPTION-FILTER-023** | Usare rubrica come proxy dell'allow list |
| **PROM-RECEPTION-FILTER-024** | Eliminare dall'archivio messaggi già ricevuti quando si rimuove qualcuno dalla lista |
| **PROM-RECEPTION-FILTER-025** | Retro-consegnare messaggi rifiutati all'aggiunta tardiva |

---

## 3. Mappa legacy REQ

| Legacy REQ | PROM-ID |
|------------|---------|
| RECEPTION-ALLOWLIST-REQ-006 | PROM-RECEPTION-FILTER-004 |
| RECEPTION-ALLOWLIST-REQ-007 | PROM-RECEPTION-FILTER-002 |
| RECEPTION-ALLOWLIST-REQ-008 | PROM-RECEPTION-FILTER-005 |
| RECEPTION-ALLOWLIST-REQ-009 | PROM-RECEPTION-FILTER-006 |
| RECEPTION-ALLOWLIST-REQ-011 | PROM-RECEPTION-FILTER-008 |
| RECEPTION-ALLOWLIST-REQ-012 | PROM-RECEPTION-FILTER-009 |
| RECEPTION-ALLOWLIST-REQ-013 | PROM-RECEPTION-FILTER-003 |
| RECEPTION-ALLOWLIST-REQ-014 | PROM-RECEPTION-FILTER-001 |
| RECEPTION-ALLOWLIST-REQ-021 | PROM-RECEPTION-FILTER-020 |
| RECEPTION-ALLOWLIST-REQ-022 | PROM-RECEPTION-FILTER-023 |
| RECEPTION-ALLOWLIST-REQ-024 | PROM-RECEPTION-FILTER-025 |
| RECEPTION-ALLOWLIST-REQ-025 | PROM-RECEPTION-FILTER-024 |
| RECEPTION-ALLOWLIST-REQ-026 | PROM-RECEPTION-FILTER-022 |
| RECEPTION-ALLOWLIST-REQ-027 | PROM-RECEPTION-FILTER-021 |
| (§1 semantica spunte) | PROM-RECEPTION-FILTER-005, 006, 007 |

---

## 4. Contratto implementativo

| Elemento | Responsabilità |
|----------|----------------|
| `send_message_to_profile` | Gate prima di INSERT copia destinatario |
| `is_sender_allowed_for_reception` | Helper SECURITY DEFINER (solo RPC interne) |
| `reception_allowlist` | Tabella allow list per `owner_id` |
| UI gestione lista | [SURF-ALLOWLIST](../../surfaces/SURF-ALLOWLIST.md), toggle in [PROM-PEER-PROFILE](./PROM-PEER-PROFILE.md) |

### Comportamento osservabile

| Ruolo | Rifiuto allow list |
|-------|-------------------|
| Mittente | RPC ok; ✓ permanente; mai ✓✓ |
| Destinatario | Messaggio assente da inbox |

---

## 5. Superfici conformi

| Superficie | Stato | File |
|------------|-------|------|
| SURF-ALLOWLIST | `implemented` | [SURF-ALLOWLIST.md](../../surfaces/SURF-ALLOWLIST.md) |
| Toggle overlay peer | `implemented` | [PROM-PEER-PROFILE](./PROM-PEER-PROFILE.md) |
| Spunte mittente | `implemented` | [PROM-MESSAGE-STATUS](./PROM-MESSAGE-STATUS.md) |

---

## 6. Tracciabilità

| PROM-ID | Verifica |
|---------|----------|
| PROM-RECEPTION-FILTER-002, 005–006 | `reception_allowlist_gate_smoke.sql` |
| PROM-RECEPTION-FILTER-008–009 | `reception_allowlist_gate_smoke.sql` |
| PROM-RECEPTION-FILTER-006 | `bash scripts/test.sh integration` |
| PROM-RECEPTION-FILTER-005, 007 | [SYS-MAILBOX](../system/SYS-MAILBOX.md) — `delivered_at` null = ✓ singola |
| PROM-RECEPTION-FILTER-020, 021 | `reception_allowlist_gate_smoke.sql`; nessun campo client `reception_rejected` |

Gate: `bash scripts/check-spec-sync.sh` + `verify.sh` + smoke SQL + `integration`

---

## 7. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [registry.md](../../registry.md) | Indice promesse |
| [SYS-RECEPTION](../system/SYS-RECEPTION.md) | Gate recapito backend |
| [SYS-MAILBOX](../system/SYS-MAILBOX.md) | Pipeline invio condizionata |
| [server-as-reception.md](../../../decisions/server-as-reception.md) | ADR semantica consegna |
