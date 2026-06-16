# Decisioni Architetturali (ADR)

Architecture Decision Records per tracciare decisioni importanti e motivazioni. Documento per AI.

## Decisioni Documentate

### 1. No Message Deletion
- **[no-message-deletion.md](./no-message-deletion.md)**
- **Data**: Novembre 2025
- **Status**: ✅ Accettata
- **Summary**: Non implementare cancellazione messaggi XMPP

**Perché**: 
- XEP-0424 non supportato da conversations.im
- Complessità implementativa alta
- Benefici limitati per utenti finali
- Alternative esistenti (hide conversation)

### 2. No Modify Source Data
- **[no-modify-source-data.md](./no-modify-source-data.md)**
- **Data**: Dicembre 2025
- **Status**: Regola maestra
- **Summary**: Non modificare/eliminare dati in IndexedDB come scorciatoia; filtrare in lettura/rendering

### 3. MAM Global Strategy
- **Status**: ✅ Accettata  
- **Summary**: Usare query MAM globale invece di N query per contatto

**Perché**:
- Una query vs N query (efficienza)
- Cache completa locale
- Apertura chat istantanea
- Funzionamento offline

Dettagli: [../architecture/mam-global-strategy-explained.md](../architecture/mam-global-strategy-explained.md)

### 4. HashRouter vs BrowserRouter
- **Status**: ✅ Accettata
- **Summary**: Usare HashRouter per GitHub Pages compatibility

**Perché**:
- GitHub Pages è hosting statico (no server-side routing)
- BrowserRouter richiede configurazione server per SPA
- HashRouter funziona out-of-the-box
- Nessun 404 su refresh

Dettagli: `PROJECT_MAP.md` (HashRouter in App.tsx), `README.md`

### 5. IndexedDB per Cache
- **Status**: ✅ Accettata  
- **Summary**: Usare IndexedDB invece di localStorage

**Perché**:
- Quota: 50MB+ vs 5-10MB
- Performance: Async vs sync blocking
- Tipi: Supporta binary (avatar) direttamente
- Scalabilità: Gestisce migliaia di messaggi

### 6. IndexedDB per account (v2.2)
- **Status**: ✅ Accettata (17 giugno 2026)
- **Summary**: Un database IndexedDB per JID utente (`conversations-db-{account}`)

**Perché**:
- Cambio account senza mescolare conversazioni/messaggi/token sync
- Storico locale conservato al logout (nessun wipe)
- Migrazione automatica dal DB legacy condiviso `conversations-db`
- Alternativa scartata: wipe al logout (inaccettabile con storico lungo)
- Alternativa futura possibile: `ownerJid` nello schema su DB unico

Dettagli: [../fixes/account-storage-isolation.md](../fixes/account-storage-isolation.md), `PROJECT_MAP.md` sezione Database

### 7. Stanza.js vs Alternative
- **Status**: ✅ Accettata
- **Summary**: Usare Stanza.js per XMPP

**Perché**:
- Manutenzione attiva
- Browser-focused (WebSocket/BOSH)
- TypeScript support
- Plugin ecosystem
- Documentazione completa

## Decisioni In Valutazione

- **Virtual Scrolling**: Liste > 100 elementi (react-window vs react-virtualized)
- **PWA**: Service Worker completo + install prompt
- **OMEMO**: XEP-0384 (complessità vs benefici in ricerca)
