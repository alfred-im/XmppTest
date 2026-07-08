# PROM-REALTIME-OWNER — Realtime scoped all'archivio owner

| Campo | Valore |
|-------|--------|
| **Promessa ID** | `PROM-REALTIME-OWNER` |
| **Classe** | PRODUCT |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Supersedes** | MAILBOX-INBOX REQ-007, REQ-008; MAILBOX-READ REQ-007 (SDD v1 epurato) |
| **PR origine** | #159 |

Promessa di prodotto: subscribe Realtime Postgres su `messages` filtrato per `owner_id = io` — inbox, chat per peer e aggiornamento spunte mittente.

---

## 1. Problema / obiettivo

L'utente riceve aggiornamenti live solo sul **proprio** archivio messaggi. Inbox e chat si aggiornano senza polling; il mittente vede ✓✓ blu quando il destinatario legge, via UPDATE sulla propria copia in uscita.

Multi-account: realtime solo sull'account in focus — [PROM-MULTI-ACCOUNT](./PROM-MULTI-ACCOUNT.md).

---

## 2. Promesse

### MUST — inbox

| ID | Promessa |
|----|----------|
| **PROM-REALTIME-OWNER-001** | Realtime inbox: subscribe Postgres su `messages` filtro `owner_id = io` → `InboxController.load()` |
| **PROM-REALTIME-OWNER-002** | Nessun subscribe su righe dove l'utente non è `owner_id` |

### MUST — chat per peer

| ID | Promessa |
|----|----------|
| **PROM-REALTIME-OWNER-003** | Realtime chat: stessa tabella `messages`; filtro `owner_id = io` AND `peer_profile_id` (canale per peer o filtro client) |
| **PROM-REALTIME-OWNER-004** | `MessageService.subscribeToPeerMessages` — non più modello sender/recipient condiviso |

### MUST — spunte mittente

| ID | Promessa |
|----|----------|
| **PROM-REALTIME-OWNER-005** | Mittente: aggiornamento `read_at` via Realtime UPDATE su proprie righe (`owner_id = io`) |
| **PROM-REALTIME-OWNER-006** | `delivered_at` **non** valorizzato da Realtime client destinatario — solo da pipeline server ([PROM-MESSAGE-STATUS](./PROM-MESSAGE-STATUS.md)) |

### MUST — multi-account

| ID | Promessa |
|----|----------|
| **PROM-REALTIME-OWNER-007** | Inbox/realtime solo account in focus; al `setFocus`: swap canali senza dispose stato view per account |

### MUST NOT

| ID | Promessa |
|----|----------|
| **PROM-REALTIME-OWNER-010** | Realtime inbox per account non in focus (trade-off single-active GoTrue) |
| **PROM-REALTIME-OWNER-011** | Subscribe globale senza filtro `owner_id` |

---

## 3. Mappa legacy REQ

| Legacy REQ | PROM-ID |
|------------|---------|
| MAILBOX-INBOX-REQ-007 | PROM-REALTIME-OWNER-001 |
| MAILBOX-INBOX-REQ-008 | PROM-REALTIME-OWNER-003, 004 |
| MAILBOX-INBOX-REQ-010 | PROM-REALTIME-OWNER-007 |
| MAILBOX-INBOX-REQ-015 | PROM-REALTIME-OWNER-002, 011 |
| MAILBOX-READ-REQ-007 | PROM-REALTIME-OWNER-005 |
| MAILBOX-READ-REQ-002 | PROM-REALTIME-OWNER-006 |

---

## 4. Contratto implementativo

| Elemento | Responsabilità |
|----------|----------------|
| `InboxService` | RPC `list_inbox()` + canale Realtime `owner_id` |
| `InboxController` | `load()` su evento Realtime inbox |
| `MessageService.subscribeToPeerMessages` | Filtro `owner_id` + `peer_profile_id` |
| `MessagesController` | Ascolta UPDATE per spunte su bolle `isMine` |
| `HomeScreen` | Binding `InboxController` alla sessione focus |

### Flusso lettura → spunta mittente

```
Destinatario apre chat → mark_peer_read(peer)
  → read_at su righe destinatario (entrata)
  → read_at su copia mittente (stesso λ)
  → Realtime UPDATE su mittente → ✓✓ blu
```

---

## 5. Superfici conformi

| Superficie | Stato | File |
|------------|-------|------|
| SURF-INBOX | `implemented` | [SURF-INBOX.md](../../surfaces/SURF-INBOX.md) |
| Chat 1:1 | `implemented` | `inbox_service.dart`, `message_service.dart` |
| Chat gruppo | `implemented` | [PROM-GROUP-AUTHOR-DISPLAY](./PROM-GROUP-AUTHOR-DISPLAY.md) REQ-019 |

---

## 6. Tracciabilità

| PROM-ID | Verifica |
|---------|----------|
| PROM-REALTIME-OWNER-001 | `inbox_provider_listen_test.dart`, `inbox_realtime_owner_filter_test.dart` |
| PROM-REALTIME-OWNER-003, 004 | `inbox_realtime_owner_filter_test.dart` |
| PROM-REALTIME-OWNER-005 | `messages_controller_multi_account_test.dart` |
| PROM-REALTIME-OWNER-007 | `inbox_provider_lifecycle_test.dart`; `multi_account_chat_scenario_test.dart` |
| MAILBOX-INBOX-REQ-007–010 (legacy) | `bash scripts/test.sh integration` + `e2e-multi` |

Gate: `bash scripts/check-spec-sync.sh` + `cd client && bash scripts/verify.sh`

---

## 7. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [registry.md](../../registry.md) | Indice promesse |
| [SYS-MAILBOX](../system/SYS-MAILBOX.md) | Aggregazione inbox, `mark_peer_read` |
| [PROM-MULTI-ACCOUNT](./PROM-MULTI-ACCOUNT.md) | Scope focus |
| [PROM-MESSAGE-STATUS](./PROM-MESSAGE-STATUS.md) | Spunte da date |
