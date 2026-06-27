# Implementazione - Analisi Dettagliate

Analisi tecniche implementazioni completate per comprensione dettagli e decisioni. Documento per AI.

> **Nota (2026-06-24)**: i documenti in questa cartella descrivono per lo più il **client React legacy** (`web-client/`, tag `legacy/web-client-final`). Il codice non è più su `main`; i contenuti restano riferimento per il client Flutter.

> **Flutter (2026-06-27)**: aggancio al fondo chat → [conversation-bottom-anchor.md](../design/conversation-bottom-anchor.md); note vocali → [voice-notes.md](./voice-notes.md); inbox solo messaggi → [messages-only-inbox.md](./messages-only-inbox.md) (non legacy React).

## Documenti Disponibili

- **login-system.md** - Login popup glassmorphism
- **sync-system-complete.md** - Sistema sync Virtual UI + MAM-only DB (v4.0) + isolamento account (v2.2)
- **delivery-receipts-xep-0184.md** - XEP-0184 livello 2 spunte (✓✓ grigie)
- **chat-markers-xep-0333.md** - XEP-0333 livello 3 spunte (✓✓ blu)
- **scrollable-containers.md** + **scrollable-containers-implementation.md** - Utility scroll
- **voice-notes.md** - Note vocali WebM/Opus, registrazione, player, coda retry client (Flutter Alpha)
- **messages-only-inbox.md** - Inbox query-only su `messages`, `ChatPeer`, drop `inbox_threads` (Flutter Alpha, PR #130)

**Policy spunte**: [message-states.md](../architecture/message-states.md) (v2.1)

## Status Implementazioni

| Feature | Status | Documenti |
|---------|--------|-----------|
| Login System | ✅ | [login-system.md](./login-system.md) |
| Sync + Virtual UI + MAM | ✅ | [sync-system-complete.md](./sync-system-complete.md), [message-states.md](../architecture/message-states.md) |
| Isolamento storage per account | ✅ | [sync-system-complete.md](./sync-system-complete.md), [account-storage-isolation.md](../fixes/account-storage-isolation.md) |
| Spunte livello 1 (✓ inviato) | ✅ | [message-states.md](../architecture/message-states.md) |
| Spunte livello 2 XEP-0184 | ✅ | [delivery-receipts-xep-0184.md](./delivery-receipts-xep-0184.md) |
| Spunte livello 3 XEP-0333 | ✅ | [chat-markers-xep-0333.md](./chat-markers-xep-0333.md) |
| Scrollable Containers | ✅ | [scrollable-containers.md](./scrollable-containers.md) |
| Aggancio al fondo (Flutter) | ✅ | [conversation-bottom-anchor.md](../design/conversation-bottom-anchor.md), `alpha-full-stack.md` §2.10 |
| Note vocali (Flutter) | ✅ | [voice-notes.md](./voice-notes.md), `alpha-full-stack.md` §2.11 |
| Coda retry invio client (Flutter) | ✅ | `OutboundMessageQueue` — `alpha-full-stack.md` §2.7, [voice-notes.md](./voice-notes.md) |
| Inbox solo messaggi (Flutter) | ✅ | [messages-only-inbox.md](./messages-only-inbox.md), [address-based-messaging.md](../decisions/address-based-messaging.md), `alpha-full-stack.md` §2.5 |

## Pattern (Riferimento Rapido)

**Context**: Auth → Connection → VirtualMessages → Conversations → Messaging

**Services**: xmpp.ts, outbox-send.ts, mam-sync.ts, account-session.ts, messages.ts, sync-initializer.ts

**Repositories**: MessageRepository, ConversationRepository, MetadataRepository, OutboxRepository
