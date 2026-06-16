# Implementazione - Analisi Dettagliate

Analisi tecniche implementazioni completate per comprensione dettagli e decisioni. Documento per AI.

## Documenti Disponibili

- **login-system.md** - Login popup glassmorphism (LoginPopup, route preservation, stati, logoutIntentional flag)
- **sync-system-complete.md** - Sistema sync "Sync-Once + Listen" (cache-first, IndexedDB)
- **scrollable-containers.md** + **scrollable-containers-implementation.md** - Utility class `.scrollable-container` (scroll verticale, touch support, iOS)
- **chat-markers-xep-0333.md** - Chat Markers XEP-0333 (strategia rendering, storage marker, invio/ricezione, sync MAM)

## Status Implementazioni

| Feature | Status | Data | Documenti |
|---------|--------|------|-----------|
| Login System | ✅ Completato | 30 Nov 2025 | [login-system.md](./login-system.md) |
| Sync System | ✅ Completato | 15 Dic 2025 | [sync-system-complete.md](./sync-system-complete.md) |
| Scrollable Containers | ✅ Completato | 30 Nov 2025 | [scrollable-containers.md](./scrollable-containers.md) |
| Chat Markers (XEP-0333) | ✅ Completato | 17 Dic 2025 | [chat-markers-xep-0333.md](./chat-markers-xep-0333.md) |
| Conversations List | ✅ Completato | Nov 2025 | - |
| Chat Interface | ✅ Completato | Nov 2025 | - |
| vCard Support | ✅ Completato | Nov 2025 | - |

## Pattern (Riferimento Rapido)

**Custom Hooks**: useMessages, useBackButton

**Context**: AuthProvider → ConnectionProvider → ConversationsProvider → MessagingProvider

**Services**: xmpp.ts, sync-initializer.ts, conversations.ts, messages.ts, vcard.ts, conversations-db.ts

**Repositories**: services/repositories/ (ConversationRepository, MessageRepository, MetadataRepository, VCardRepository)

**Error Handling**: Try-catch async, logging console, fallback a cache

**Performance**: debouncing, lazy loading, code splitting
