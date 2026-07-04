# Catalogo spec — Alfred (prototipo)

**Ultima revisione**: 2026-07-04  
**REQ-ID**: MAILBOX-* `implemented` su `main`; MSG-INBOX/SEND/READ `superseded`.

Indice capability con stato e tracciabilità PR. Contratti: [rpc.md](./contracts/rpc.md), [schema.md](./contracts/schema.md).

**SDD v1**: REQ-ID + tracciabilità su tutte le capability Alpha (MSG-*, AUTH-MULTI, PROFILE, CONTACTS, INBOX-SEARCH). Metodo: [README.md](./README.md).

---

## Capability mailbox (modello caselle — su `main`)

| Spec ID | Titolo | Status | PR | File |
|---------|--------|--------|-----|------|
| **MAILBOX-CORE** | Archivio per owner, identificatori, migrazione | `implemented` | — | [MAILBOX-CORE.spec.md](./capabilities/MAILBOX-CORE.spec.md) |
| **MAILBOX-SEND** | Invio e outbox sempre | `implemented` | — | [MAILBOX-SEND.spec.md](./capabilities/MAILBOX-SEND.spec.md) |
| **MAILBOX-INBOX** | Inbox da archivio owner | `implemented` | — | [MAILBOX-INBOX.spec.md](./capabilities/MAILBOX-INBOX.spec.md) |
| **MAILBOX-READ** | Date consegna e lettura | `implemented` | — | [MAILBOX-READ.spec.md](./capabilities/MAILBOX-READ.spec.md) |

MSG-INBOX / MSG-SEND / MSG-READ → `superseded`.

---

## Capability message-centric (superseded)

| Spec ID | Titolo | Status | PR | File |
|---------|--------|--------|-----|------|
| **MSG-INBOX** | Inbox derivata da messaggi | `superseded` | #130, #134 | [MSG-INBOX.spec.md](./capabilities/MSG-INBOX.spec.md) |
| **MSG-SEND** | Invio messaggi (testo, media, location) | `superseded` | #115, #126, #153 | [MSG-SEND.spec.md](./capabilities/MSG-SEND.spec.md) |
| **MSG-READ** | Spunte delivered/read | `superseded` | #122, #130 | [MSG-READ.spec.md](./capabilities/MSG-READ.spec.md) |
| **INBOX-SEARCH** | Ricerca on-demand inbox | `implemented` | #132 | [INBOX-SEARCH.spec.md](./capabilities/INBOX-SEARCH.spec.md) |
| **PROFILE** | Profilo utente (avatar, pronomi) | `implemented` | #118, #134 | [PROFILE.spec.md](./capabilities/PROFILE.spec.md) |
| **CONTACTS** | Rubrica personale | `implemented` | #109 | [CONTACTS.spec.md](./capabilities/CONTACTS.spec.md) |
| **AUTH-MULTI** | Multi-account client | `implemented` | #140, #147, #152 | [AUTH-MULTI.spec.md](./capabilities/AUTH-MULTI.spec.md) |

---

## Mappa doc storica → spec

| Doc precedente | Spec canonica |
|----------------|---------------|
| `decisions/address-based-messaging.md` | MSG-INBOX (vincoli ADR) + MSG-SEND |
| `implementation/messages-only-inbox.md` | MSG-INBOX |
| `implementation/voice-notes.md`, `location-sharing.md` | MSG-SEND |
| `decisions/server-as-reception.md` | MSG-READ (ADR) |
| `decisions/multi-account-parallel-sessions.md` | AUTH-MULTI (ADR) |
| `implementation/multi-account-client.md`, `design/auth-overlay-shell.md` | AUTH-MULTI |
| `design/inbox-search-toggle.md` | INBOX-SEARCH |
| `PROJECT_MAP.md` § profilo | PROFILE |
| `decisions/address-based-messaging.md` | MSG-INBOX + CONTACTS (ADR rubrica isolata) |
| `architecture/mailbox-inbox-outbox-spec.md` | MAILBOX-CORE, MAILBOX-SEND, MAILBOX-INBOX, MAILBOX-READ |

---

## Prossime spec (backlog)

| ID proposto | Contenuto | Priorità |
|-------------|-----------|----------|
| BRIDGE-* | Consumer outbox federato (fase B post-mailbox) | dopo MAILBOX su `main` |
