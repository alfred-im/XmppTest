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
Services Layer (xmpp.ts, messages.ts, conversations.ts, sync.ts, vcard.ts)
    ↓
Repository Layer (ConversationRepository, MessageRepository, VCardRepository, MetadataRepository)
    ↓
Data Layer (IndexedDB + XMPP Server)
```

## Principi Chiave

### Architettura "Sync-Once + Listen" (v3.0 - 15 dicembre 2025)

1. **Sync-Once**: Sincronizzazione SOLO all'avvio (full se DB vuoto, incremental se popolato)
2. **Listen**: Dopo sync iniziale, solo messaggi real-time via listener XMPP
3. **Cache-First**: Mostra sempre dati locali prima (< 100ms)
4. **Offline-First**: Funziona completamente senza connessione
5. **Minimal Server Queries**: 1 sync all'avvio, poi 0 query durante utilizzo
6. **Separation of Concerns**: Layer ben definiti (UI, Context, Services, Repository, Data)

### Differenze con Architettura Precedente

| Aspetto | Prima (v2.0) | Ora (v3.0) | Miglioramento |
|---------|--------------|------------|---------------|
| Punti di sync | 15+ sparsi | 1 (AppInitializer) | **-93%** |
| Pull-to-refresh | Su tutte le pagine | Eliminato | **-100%** |
| Sync dopo messaggio | Sempre | Mai | **-100%** |
| Query server/giorno | Centinaia | ~1-5 | **-95%** |
| Righe codice sync | ~1700 | ~530 | **-70%** |
