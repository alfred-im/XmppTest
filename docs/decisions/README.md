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

### 2. MAM Global Strategy
- **Status**: ✅ Accettata  
- **Summary**: Usare query MAM globale invece di N query per contatto

**Perché**:
- Una query vs N query (efficienza)
- Cache completa locale
- Apertura chat istantanea
- Funzionamento offline

Dettagli: [../architecture/mam-global-strategy-explained.md](../architecture/mam-global-strategy-explained.md)

### 3. HashRouter vs BrowserRouter
- **Status**: ✅ Accettata
- **Summary**: Usare HashRouter per GitHub Pages compatibility

**Perché**:
- GitHub Pages è hosting statico (no server-side routing)
- BrowserRouter richiede configurazione server per SPA
- HashRouter funziona out-of-the-box
- Nessun 404 su refresh

Dettagli: [../guides/routing-system.md](../guides/routing-system.md)

### 4. IndexedDB per Cache
- **Status**: ✅ Accettata
- **Summary**: Usare IndexedDB invece di localStorage

**Perché**:
- Quota: 50MB+ vs 5-10MB
- Performance: Async vs sync blocking
- Tipi: Supporta binary (avatar) direttamente
- Scalabilità: Gestisce migliaia di messaggi

### 5. Stanza.js vs Alternative
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
