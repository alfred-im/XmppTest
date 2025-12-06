# Architettura - Analisi Tecniche

Analisi architetturali per comprensione sistema e decisioni implementative. Documento per AI.

## Documenti Disponibili

### Analisi MAM e Sincronizzazione
- **conversations-analysis.md** - Analisi tecnica recupero conversazioni XMPP (XEP-0313, XEP-0059, paginazione, algoritmi)
- **mam-global-strategy-explained.md** - Strategia MAM globale (query singola vs N query, vantaggi/svantaggi, implementazione)
- **mam-performance-long-term.md** - Performance MAM a lungo termine (scalabilità, grandi volumi, ottimizzazioni)
- **strategy-comparison.md** - Confronto strategie sync (ibrido vs globale vs per-contatto, decisione finale)

## Architettura Layer

Vedi `PROJECT_MAP.md` per dettagli completi.

```
UI Layer (Pages, Components)
    ↓
Context Layer (XmppContext, ConversationsContext, MessagingContext, AuthContext, ConnectionContext)
    ↓
Services Layer (xmpp.ts, messages.ts, conversations.ts, sync.ts, vcard.ts, push-notifications.ts)
    ↓
Repository Layer (ConversationRepository, MessageRepository, VCardRepository, MetadataRepository)
    ↓
Data Layer (IndexedDB + XMPP Server)
```

## Principi Chiave

1. **Offline-First**: Cache completa IndexedDB, UI funziona senza connessione
2. **Cache-First Loading**: Mostra dati locali prima, sync background
3. **Minimal Server Queries**: Query MAM globale (non N query), cache vCard persistente
4. **Separation of Concerns**: Layer ben definiti (UI, Context, Services, Repository, Data)
