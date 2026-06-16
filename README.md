# Alfred - XMPP Client Web

## Scopo di questo documento

Questo documento traccia lo stato del progetto Alfred per continuità del lavoro e comprensione architetturale. NON è documentazione per utenti esterni.

## Overview Tecnica

Alfred è un client XMPP web-based costruito con React 19 + TypeScript + Vite. Implementa protocollo XMPP tramite Stanza.js con architettura offline-first basata su IndexedDB.

### Metriche Performance Chiave

- Apertura chat: < 100ms (cache hit)
- Lista conversazioni: < 200ms (cache hit)
- Sync iniziale (DB vuoto): ~5-10s per 100 conversazioni
- Sync incrementale (DB popolato): ~2-5s per aggiornamenti
- Avvii successivi: < 5s (solo delta dal marker)
- Build production: ~15s (code splitting attivo)

## Feature Implementate (Riferimento Rapido)

Vedi `PROJECT_MAP.md` per dettagli completi.

**Core Funzionante**:
- Login XMPP con auto-login
- Lista conversazioni con sync ottimizzata
- Real-time messaging (campanello → virtual UI → MAM)
- Spunte WhatsApp 3 livelli: ✓ inviato, ✓✓ grigie (XEP-0184), ✓✓ blu (XEP-0333)
- vCard (avatar, profilo)
- Sync iniziale intelligente (full/incremental)
- MAM (XEP-0313) con marcatori RSM
- Push Notifications (XEP-0357) - richiede server con supporto
- Cache-first con IndexedDB
- Virtual UI + MAM-only DB (nessun duplicato al reload)
- Push Notifications (XEP-0357) - richiede server con supporto

**In Roadmap** (non iniziato):
- MUC (XEP-0045)
- OMEMO (XEP-0384)
- File upload (XEP-0363)
- Voice/Video calls
- Dark mode
- Emoji picker

## Build e Development

```bash
cd web-client
npm install
npm run dev       # Dev server su http://localhost:5173/XmppTest/
npm run build     # Build production in dist/
npm run preview   # Preview build locale
```

**Note Tecniche**:
- Base URL `/XmppTest/` per GitHub Pages
- HashRouter per compatibility hosting statico
- Hot reload funzionante con Vite

## Accesso Produzione

**URL Live**: https://alfred-im.github.io/XmppTest/

**Credenziali Test**:
- **Username**: `testardo@conversations.im`
- **Password**: `FyqnD2YpGScNsuC`

Vedi `TEST_CREDENTIALS.md` per altri account di test disponibili.

**Note**:
- Prima apertura: sync iniziale ~5-10 secondi
- Aperture successive: ~2 secondi (sync incrementale)
- Server XMPP: conversations.im

## Architettura (Sintesi)

Vedi `PROJECT_MAP.md` per architettura dettagliata completa.

**Layer**:
- UI Layer: Pages, Components
- Initialization Layer: AppInitializer (sync all'avvio + boundary handoff)
- Context Layer: ConnectionContext, AuthContext, VirtualMessagesContext, ConversationsContext, MessagingContext
- Services Layer: sync-initializer.ts, mam-sync.ts, outbox-send.ts, messages.ts, conversations.ts, vcard.ts
- Repository Layer: MessageRepository, OutboxRepository, ConversationRepository, VCardRepository, MetadataRepository
- Data Layer: IndexedDB (alfred-xmpp-db) + XMPP Server

**Principi (v4.0)**:
1. **Virtual UI + MAM-only DB**: campanello aggiorna UI virtuale; solo MAM scrive messaggi nel DB
2. **Sync-Once all'avvio**: full o incremental MAM fino al boundary T
3. **MAM incrementale su eventi**: dopo messaggio/receipt/displayed il campanello schedula MAM per conversazione
4. **Spunte 3 livelli**: XMPP send (✓) + XEP-0184 (✓✓ grigie) + XEP-0333 (✓✓ blu)
5. **Cache-First / Offline-First**
6. **origin-id canonico** (XEP-0359) per dedup e correlazione marker

## Documentazione (Struttura)

**Documenti Chiave per AI**:
- `PROJECT_MAP.md` - **LEGGERE ALL'INIZIO DI OGNI SESSIONE** (regola fondamentale)
- `.cursor-rules.md` - Regole di sviluppo
- `docs/architecture/` - Analisi architetturali (MAM strategy, conversazioni, performance)
- `docs/implementation/` - Dettagli implementazioni (sync v4.0, spunte 0184/0333, login)
- `docs/decisions/` - ADR (decisioni architetturali)
- `docs/fixes/` - Analisi fix applicati
- `docs/design/` - Principi design (brand identity, database architecture)
- `docs/archive/` - Documentazione storica

**Indice Navigabile**: `docs/INDICE.md`

## Known Issues e Limitazioni

Vedi `docs/fixes/known-issues.md` per lista completa aggiornata.

**Critici**:
- Push Notifications richiedono server XMPP con XEP-0357 (jabber.hot-chilli.net e conversations.im NON supportano)
- Password in plain text in localStorage (encryption pianificata)

**Performance**:
- MAM sync iniziale lenta con >5000 messaggi
- Alcuni server XMPP non supportano vCard photo

## Test Credentials

Vedi `TEST_CREDENTIALS.md` per account di test configurati.

**Quick reference**:
- `testardo@conversations.im` / `FyqnD2YpGScNsuC`
- `testarda@conversations.im` / `FyqnD2YpGScNsuC`

## License

MIT License - Vedi file `LICENSE`

---

**Ultimo aggiornamento**: 2026-06-16  
**Versione corrente**: 2.1.0  
**Architettura**: Virtual UI + MAM-only DB v4.0 + Spunte WhatsApp (XEP-0184 + XEP-0333)
