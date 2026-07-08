# SYS-MAILBOX — Archivio messaggi, invio, inbox e lettura

| Campo | Valore |
|-------|--------|
| **Promessa ID** | `SYS-MAILBOX` |
| **Classe** | SYSTEM |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Supersedes** | MAILBOX-CORE, MAILBOX-SEND, MAILBOX-INBOX, MAILBOX-READ (SDD v1 epurato) |
| **ADR** | [mailbox-inbox-outbox-spec.md](../../../architecture/mailbox-inbox-outbox-spec.md), [server-as-reception.md](../../../decisions/server-as-reception.md), [no-internal-external-chat-distinction.md](../../../decisions/no-internal-external-chat-distinction.md), [bridge-stateless.md](../../../decisions/bridge-stateless.md) |
| **PR origine** | #159 |

Promessa SYSTEM — modello **mailbox** (archivio per owner), pipeline invio/outbox, aggregazione inbox on-read, date consegna/lettura. Il dettaglio canonico di schema e RPC resta nei contratti; questo file è indice promessa + tracciabilità v2.

**Dettaglio canonico**: [contracts/schema.md](../../contracts/schema.md) § mailbox · [contracts/rpc.md](../../contracts/rpc.md) § mailbox

---

## 1. Problema / obiettivo

Ogni utente ha un **archivio messaggi indipendente** (`owner_id`). Mittente e destinatario hanno sempre righe distinte correlate da `logical_message_id` (λ). L'inbox non è entità DB: è aggregazione on-read sull'archivio dell'owner. Invio unificato via `send_message_to_profile`; recapito internal sincrono in transazione RPC con gate [SYS-RECEPTION](./SYS-RECEPTION.md). Spunte da date nullable su copia mittente; lettura locale su copia destinatario con propagazione `read_at` via λ.

Requisiti **client/UI** (coda outbound, realtime subscribe, checkmark rendering, multi-account focus, filtro lista) sono delegati a promesse **PRODUCT** / **SURFACE** — vedi §6.

---

## 2. Promesse backend

### SCHEMA — modello archivio e migrazione

#### MUST

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-001** | Tabella `messages` con `owner_id` (archivio) e `author_id` (autore originale contenuto) — [schema.md](../../contracts/schema.md) § mailbox |
| **SYS-MAILBOX-002** | Nessuna riga visibile a due owner: mittente e destinatario hanno **sempre** `id` riga distinti |
| **SYS-MAILBOX-003** | `logical_message_id` (λ) UUID generato server alla accettazione invio; correlazione copie e segnali spunta |
| **SYS-MAILBOX-004** | `client_message_id` solo sulla copia mittente (`owner_id = author_id = mittente`); dedup UNIQUE `(owner_id, client_message_id)` WHERE `client_message_id IS NOT NULL` |
| **SYS-MAILBOX-005** | Dedup materializzazione destinatario: UNIQUE `(owner_id, logical_message_id)` |
| **SYS-MAILBOX-006** | RLS: SELECT/INSERT/UPDATE solo `owner_id = auth.uid()` — **nessuna eccezione** |
| **SYS-MAILBOX-007** | Colonna `peer_profile_id` denormalizzata per raggruppamento inbox/storico (internal) |
| **SYS-MAILBOX-008** | Migrazione prototipo: drop modello message-centric + wipe dati test; ricrea schema mailbox; pulizia blob `chat-media` **non referenziati** post-migrazione |
| **SYS-MAILBOX-009** | Media: stesso `media_url` su copia mittente e destinatario; un upload, nessuna duplicazione blob |

#### SHOULD

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-010** | Indici `(owner_id, peer_profile_id, created_at DESC)` e `(owner_id, logical_message_id)` |
| **SYS-MAILBOX-011** | `peer_external_address` nullable per federazione futura (non usata in v1 UI) |

#### MUST NOT

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-012** | Tabella `inbox_threads`, cache inbox, `thread_id` client |
| **SYS-MAILBOX-013** | Colonna `direction` — in/out da `author_id` vs `owner_id` |
| **SYS-MAILBOX-014** | Tabella `message_read_receipts` (sostituita da date su `messages`) |
| **SYS-MAILBOX-015** | RLS che permette lettura archivio altrui |
| **SYS-MAILBOX-016** | Doppia scrittura message-centric + mailbox |

---

### SEND — invio e outbox

#### MUST

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-017** | Unico RPC invio: `send_message_to_profile` — firma invariata PostgREST — [rpc.md](../../contracts/rpc.md) § mailbox |
| **SYS-MAILBOX-018** | Accettazione: INSERT copia mittente (`owner_id = author_id = auth.uid()`), `delivered_at`/`read_at` null, λ assegnato |
| **SYS-MAILBOX-019** | **Outbox sempre**: INSERT `outbox` per ogni invio, incluso `protocol = internal` |
| **SYS-MAILBOX-020** | Driver internal (stessa transazione RPC): **se** mittente ∈ [SYS-RECEPTION](./SYS-RECEPTION.md) del destinatario → materializza copia destinatario + valorizza `delivered_at` su copia mittente (match λ); **altrimenti** skip copia destinatario, `delivered_at` null, RPC successo (rifiuto silenzioso) |
| **SYS-MAILBOX-021** | Idempotenza: retry stesso `(owner_id, client_message_id)` → stessa riga mittente, no duplicati |
| **SYS-MAILBOX-022** | Tipi `content_type`: `text`, `gif`, `voice`, `location` — validazione invariata da Alpha pre-#159 |
| **SYS-MAILBOX-023** | Bucket storage `chat-media`: path `{auth.uid()}/{uuid}.*` (upload prima RPC) |
| **SYS-MAILBOX-024** | Outbox retry: `attempts`, `last_error`, `status` → `failed` dopo soglia (default 5 tentativi worker/cron futuro; internal sincrono non fallisce salvo errore transazione) |
| **SYS-MAILBOX-025** | Invio fallito server: `failed_at` timestamptz sulla copia mittente (opzionale null se non applicabile) |

#### SHOULD

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-026** | Payload outbox include λ, destinatario, snapshot contenuto, `media_url` |
| **SYS-MAILBOX-027** | Preview inbox coerente per tipo (funzioni `format_*_preview`) |

#### MUST NOT

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-028** | Shortcut trigger `sent → delivered` senza outbox e senza copia destinatario |
| **SYS-MAILBOX-029** | Invio a sé stessi |
| **SYS-MAILBOX-030** | Indirizzo esterno `user@server` senza errore utente (v1: **unsupported** in compose) |
| **SYS-MAILBOX-031** | Overload ambigui `send_message_to_profile` PostgREST |
| **SYS-MAILBOX-032** | Pipeline invio distinta per internal vs federato (solo driver recapito differisce in fase B) |

---

### INBOX — aggregazione on-read

#### MUST

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-033** | `list_inbox()` aggrega **solo** `messages` WHERE `owner_id = auth.uid()` |
| **SYS-MAILBOX-034** | GROUP BY `peer_profile_id` (internal v1) |
| **SYS-MAILBOX-035** | Payload riga: `peer_profile_id`, `display_name`, `last_message_preview`, `last_message_at`, `unread_count`, campi profilo peer |
| **SYS-MAILBOX-036** | `list_peer_messages(peer)` = righe WHERE `owner_id = auth.uid()` AND `peer_profile_id = peer` ORDER BY `created_at` |
| **SYS-MAILBOX-037** | Prima riga inbox solo dopo primo messaggio nel mio archivio con quel peer |
| **SYS-MAILBOX-038** | `unread_count`: righe in entrata (`author_id <> auth.uid()`) con `read_at IS NULL` |

#### SHOULD

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-039** | Preview per tipo: testo troncato, `[GIF]`, `🎤`, `📍 Posizione` |
| **SYS-MAILBOX-040** | `last_message_at` = `created_at` dell'ultima riga nel mio archivio per quel peer |

#### MUST NOT

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-041** | Tabella/cache/vista materializzata inbox |
| **SYS-MAILBOX-042** | Query su righe dove l'utente non è `owner_id` |
| **SYS-MAILBOX-043** | `thread_id` esposto al client |
| **SYS-MAILBOX-044** | Record inbox prima del primo messaggio |
| **SYS-MAILBOX-045** | Rubrica prerequisito per scrivere (invariato) |

---

### READ — date consegna e lettura

#### MUST

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-046** | `delivered_at` valorizzato solo dopo materializzazione copia destinatario (MAILBOX-SEND) — non da Realtime client destinatario |
| **SYS-MAILBOX-047** | `mark_peer_read(peer)`: UPDATE righe in entrata nel mio archivio (`owner_id = io`, `author_id = peer`, `read_at IS NULL`) SET `read_at = now()` |
| **SYS-MAILBOX-048** | Per ogni λ delle righe lette: UPDATE copia mittente SET `read_at = now()` WHERE `owner_id = peer` (mittente) AND `logical_message_id = λ` AND `read_at IS NULL` — SECURITY DEFINER |
| **SYS-MAILBOX-049** | Lettura include body non vuoto OPPURE `content_type` ∈ gif, voice, location |
| **SYS-MAILBOX-050** | `list_inbox` unread: righe in entrata con `read_at IS NULL` |

#### MUST NOT

| ID | Promessa |
|----|----------|
| **SYS-MAILBOX-051** | UPDATE archivio destinatario per mostrare spunte al mittente |
| **SYS-MAILBOX-052** | Enum `message_delivery_status` su `messages` target |
| **SYS-MAILBOX-053** | Tabella `message_read_receipts` |
| **SYS-MAILBOX-054** | Regressione spunte: se `read_at` già set, ignorare segnale `delivered_at` tardivo |
| **SYS-MAILBOX-055** | Semantica «consegnato» = device P2P peer |

---

## 3. Identificatori e date spunta (contratto)

| Id | Scope | Ruolo |
|----|-------|-------|
| `id` | Per owner | PK riga archivio locale |
| `client_message_id` | Copia mittente | Idempotenza invio client |
| `logical_message_id` | Piattaforma | Correlazione copie + spunte |
| `external_id` | Federato futuro | Bridge (fase B) |

| Copia | Campi | Semantica |
|-------|-------|-----------|
| Mittente (uscita) | `delivered_at`, `read_at` | null = non ancora; valorizzate da pipeline / segnali |
| Destinatario (entrata) | `read_at` | Lettura locale; alimenta `mark_peer_read` |

Regola: se `read_at` valorizzata su copia mittente, `delivered_at` tardivo non la azzera.

---

## 4. Mappa legacy → SYS-MAILBOX

| Legacy REQ-ID | SYS-MAILBOX-ID |
|---------------|----------------|
| MAILBOX-CORE-REQ-001 | SYS-MAILBOX-001 |
| MAILBOX-CORE-REQ-002 | SYS-MAILBOX-002 |
| MAILBOX-CORE-REQ-003 | SYS-MAILBOX-003 |
| MAILBOX-CORE-REQ-004 | SYS-MAILBOX-004 |
| MAILBOX-CORE-REQ-005 | SYS-MAILBOX-005 |
| MAILBOX-CORE-REQ-006 | SYS-MAILBOX-006 |
| MAILBOX-CORE-REQ-008 | SYS-MAILBOX-007 |
| MAILBOX-CORE-REQ-009 | SYS-MAILBOX-008 |
| MAILBOX-CORE-REQ-010 | SYS-MAILBOX-009 |
| MAILBOX-CORE-REQ-011 | SYS-MAILBOX-010 |
| MAILBOX-CORE-REQ-012 | SYS-MAILBOX-011 |
| MAILBOX-CORE-REQ-013 | SYS-MAILBOX-012 |
| MAILBOX-CORE-REQ-014 | SYS-MAILBOX-013 |
| MAILBOX-CORE-REQ-015 | SYS-MAILBOX-014 |
| MAILBOX-CORE-REQ-016 | SYS-MAILBOX-015 |
| MAILBOX-CORE-REQ-017 | SYS-MAILBOX-016 |
| MAILBOX-SEND-REQ-001 | SYS-MAILBOX-017 |
| MAILBOX-SEND-REQ-002 | SYS-MAILBOX-018 |
| MAILBOX-SEND-REQ-003 | SYS-MAILBOX-019 |
| MAILBOX-SEND-REQ-004 | SYS-MAILBOX-020 |
| MAILBOX-SEND-REQ-005 | SYS-MAILBOX-021 |
| MAILBOX-SEND-REQ-006 | SYS-MAILBOX-022 |
| MAILBOX-SEND-REQ-007 | SYS-MAILBOX-023 |
| MAILBOX-SEND-REQ-009 | SYS-MAILBOX-024 |
| MAILBOX-SEND-REQ-010 | SYS-MAILBOX-025 |
| MAILBOX-SEND-REQ-011 | SYS-MAILBOX-026 |
| MAILBOX-SEND-REQ-012 | SYS-MAILBOX-027 |
| MAILBOX-SEND-REQ-013 | SYS-MAILBOX-028 |
| MAILBOX-SEND-REQ-014 | SYS-MAILBOX-029 |
| MAILBOX-SEND-REQ-015 | SYS-MAILBOX-030 |
| MAILBOX-SEND-REQ-016 | SYS-MAILBOX-031 |
| MAILBOX-SEND-REQ-017 | SYS-MAILBOX-032 |
| MAILBOX-INBOX-REQ-001 | SYS-MAILBOX-033 |
| MAILBOX-INBOX-REQ-002 | SYS-MAILBOX-034 |
| MAILBOX-INBOX-REQ-003 | SYS-MAILBOX-035 |
| MAILBOX-INBOX-REQ-004 | SYS-MAILBOX-036 |
| MAILBOX-INBOX-REQ-006 | SYS-MAILBOX-037 |
| MAILBOX-INBOX-REQ-009 | SYS-MAILBOX-038 |
| MAILBOX-INBOX-REQ-012 | SYS-MAILBOX-039 |
| MAILBOX-INBOX-REQ-013 | SYS-MAILBOX-040 |
| MAILBOX-INBOX-REQ-014 | SYS-MAILBOX-041 |
| MAILBOX-INBOX-REQ-015 | SYS-MAILBOX-042 |
| MAILBOX-INBOX-REQ-016 | SYS-MAILBOX-043 |
| MAILBOX-INBOX-REQ-017 | SYS-MAILBOX-044 |
| MAILBOX-INBOX-REQ-018 | SYS-MAILBOX-045 |
| MAILBOX-READ-REQ-002 | SYS-MAILBOX-046 |
| MAILBOX-READ-REQ-004 | SYS-MAILBOX-047 |
| MAILBOX-READ-REQ-005 | SYS-MAILBOX-048 |
| MAILBOX-READ-REQ-006 | SYS-MAILBOX-049 |
| MAILBOX-READ-REQ-008 | SYS-MAILBOX-050 |
| MAILBOX-READ-REQ-012 | SYS-MAILBOX-051 |
| MAILBOX-READ-REQ-013 | SYS-MAILBOX-052 |
| MAILBOX-READ-REQ-014 | SYS-MAILBOX-053 |
| MAILBOX-READ-REQ-015 | SYS-MAILBOX-054 |
| MAILBOX-READ-REQ-016 | SYS-MAILBOX-055 |

---

## 5. Implementazione contratto

| Elemento | Documento / codice |
|----------|-------------------|
| Schema `messages`, `outbox`, RLS, bucket `chat-media` | [contracts/schema.md](../../contracts/schema.md) § mailbox |
| RPC `send_message_to_profile`, `list_inbox`, `list_peer_messages`, `mark_peer_read`, `find_profile_by_username` | [contracts/rpc.md](../../contracts/rpc.md) § mailbox |
| Migrazioni mailbox | `supabase/migrations/*mailbox*` |
| Pipeline invio / gate allow list | body `send_message_to_profile` in migrazioni |
| Smoke SQL | `supabase/tests/mailbox_*.sql`, `reception_allowlist_gate_smoke.sql` |
| Client RPC / servizi | `message_service.dart`, `inbox_service.dart` |

### Flusso internal (transazione RPC)

```
send_message_to_profile
  → INSERT messages (owner=mittente, author=mittente, λ, peer=dest)     ← livello ✓
  → gate reception_allowlist (destinatario)
  → SE allowed:
       INSERT messages (owner=destinatario, …)
       UPDATE messages SET delivered_at=now() WHERE owner=mittente AND λ  ← livello ✓✓
     ALTRIMENTI:
       delivered_at resta null (✓ senza ✓✓)
  → INSERT outbox completed
  → RETURN riga mittente
```

### RPC `mark_peer_read`

```sql
mark_peer_read(p_peer_profile_id uuid) → void
```

1. UPDATE `messages` SET `read_at = now()` WHERE `owner_id = auth.uid()` AND `peer_profile_id = p_peer` AND `author_id = p_peer` AND `read_at IS NULL` AND contenuto leggibile
2. Per ogni λ toccato: UPDATE copia mittente `read_at` (funzione interna SECURITY DEFINER)

---

## 6. Requisiti delegati (PRODUCT / SURFACE)

Requisiti legacy **non backend** — non duplicati come SYS-ID; tracciati nelle promesse client.

| Legacy REQ-ID | Delegato a |
|---------------|------------|
| MAILBOX-CORE-REQ-007 | SURF chat — `(io, indirizzo peer)`; nessun `thread_id` |
| MAILBOX-SEND-REQ-008 | Client — `OutboundMessageQueue` + merge optimistic |
| MAILBOX-INBOX-REQ-005 | SURF chat — `ChatPeer.profileId` |
| MAILBOX-INBOX-REQ-007 | SURF-INBOX / client — Realtime subscribe `owner_id` |
| MAILBOX-INBOX-REQ-008 | SURF chat — Realtime filtro peer |
| MAILBOX-INBOX-REQ-010 | [PROM-MULTI-ACCOUNT](../product/PROM-MULTI-ACCOUNT.md) — focus multi-account |
| MAILBOX-INBOX-REQ-011 | [PROM-LIST-FILTER](../product/PROM-LIST-FILTER.md) + [SURF-INBOX](../../surfaces/SURF-INBOX.md) |
| MAILBOX-READ-REQ-001 | SURF chat — checkmark UI da date |
| MAILBOX-READ-REQ-003 | SURF chat — `mark_peer_read` in `MessagesController._init` |
| MAILBOX-READ-REQ-007 | SURF chat — Realtime UPDATE su righe mittente |
| MAILBOX-READ-REQ-009 | Client — stati `pending`/`failed` pre-ACK |
| MAILBOX-READ-REQ-010 | SURF chat — `mark_peer_read` solo apertura chat |
| MAILBOX-READ-REQ-011 | SURF chat — checkmarks solo bolle `isMine` |

---

## 7. Tracciabilità

| SYS-ID | Verifica |
|--------|----------|
| SYS-MAILBOX-001, 002, 006, 012, 014 | `supabase/tests/mailbox_schema_smoke.sql` |
| SYS-MAILBOX-004, 005, 021 | `supabase/tests/mailbox_idempotency_smoke.sql` |
| SYS-MAILBOX-008 | migrazione `supabase/migrations/*mailbox*` |
| SYS-MAILBOX-009, 022 | `supabase/tests/mailbox_send_media_smoke.sql` |
| SYS-MAILBOX-017 | `schema_smoke.sql` + `mailbox_send_smoke.sql` |
| SYS-MAILBOX-019, 020 | `mailbox_delivery_smoke.sql`, `reception_allowlist_gate_smoke.sql` |
| SYS-MAILBOX-028 | assenza trigger `on_message_inserted` legacy internal delivered |
| SYS-MAILBOX-030 | `ComposeService` → errore esterno |
| SYS-MAILBOX-033, 034, 036, 037, 050 | `supabase/tests/mailbox_inbox_smoke.sql` |
| SYS-MAILBOX-038 | smoke unread dopo messaggio in entrata non letto |
| SYS-MAILBOX-041 | `mailbox_schema_smoke.sql` |
| SYS-MAILBOX-046 | `mailbox_delivery_smoke.sql` |
| SYS-MAILBOX-047–049 | `supabase/tests/mailbox_read_smoke.sql` |
| SYS-MAILBOX-054 | `client/test/unit/models_and_utils_test.dart` |
| SYS-MAILBOX-017–025 (integrazione) | `bash scripts/test.sh integration` |
| MAILBOX-SEND-REQ-008 (delegato) | `messages_controller_multi_account_test.dart`, `multi_account_scope_test.dart` |
| MAILBOX-INBOX-REQ-007 (delegato) | `inbox_provider_listen_test.dart`, `inbox_realtime_owner_filter_test.dart` |
| MAILBOX-INBOX-REQ-010 (delegato) | `multi_account_chat_scenario_test.dart` |
| MAILBOX-INBOX-REQ-011 (delegato) | `PROM-LIST-FILTER`, `SURF-INBOX`; `inbox_controller.dart` `filteredPeers` |
| MAILBOX-READ-REQ-001 (delegato) | `message_bubble_test.dart`, `models_and_utils_test.dart` |
| MAILBOX-READ-REQ-007 (delegato) | `messages_controller_multi_account_test.dart` |
| SYS-MAILBOX-017–050 (E2E) | `bash scripts/test.sh e2e-multi` |

**Gate**: `bash scripts/check-spec-sync.sh` + `cd client && bash scripts/verify.sh` + `integration` + `e2e-multi`

---

## 8. Fuori scope

- Delete chat / messaggio singolo
- Gruppi (MUC) — vedi [SYS-GROUP](./SYS-GROUP.md)
- GC refcount continuo (solo purge orfani a migrazione + policy futura)
- Preservazione dati produzione (prototipo dev only)
- Bridge consumer (fase B post-mailbox)

---

## 9. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [contracts/schema.md](../../contracts/schema.md) | Dettaglio schema mailbox |
| [contracts/rpc.md](../../contracts/rpc.md) | Dettaglio RPC mailbox |
| [SYS-RECEPTION](./SYS-RECEPTION.md) | Gate recapito destinatario |
| [mailbox-inbox-outbox-spec.md](../../../architecture/mailbox-inbox-outbox-spec.md) | Principi architetturali |
