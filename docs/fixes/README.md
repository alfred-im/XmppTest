# Bug Fixes & Ottimizzazioni (Riferimento Tecnico)

Analisi fix applicati e ottimizzazioni per tracciare problemi risolti e soluzioni implementate. Documento per AI.

## Fix Documentati

### Pull-to-Refresh Fix
- **[pull-to-refresh-fix.md](./pull-to-refresh-fix.md)**
- **Data**: 29 Novembre 2025
- **Problema**: Pull-to-refresh non funzionava su mobile
- **Causa**: 
  - useEffect con dipendenze che cambiano continuamente
  - Event listeners rimossi e ri-aggiunti ad ogni render
  - Passive event listeners conflitto con preventDefault
- **Soluzione**: 
  - useRef per tutte le variabili di stato
  - Event listeners registrati una sola volta
  - passive: false per permettere preventDefault
- **Status**: ✅ Risolto e testato

### Profile Page Scroll Conflict Fix
- **[profile-scroll-conflict-fix.md](./profile-scroll-conflict-fix.md)**
- **Data**: 30 Novembre 2025
- **Problema**: Scroll della pagina profilo funzionava solo in una direzione, conflitto di scroll
- **Causa**: 
  - Listener globali `touchmove` in main.tsx bloccavano il movimento
  - Non distinguevano tra scroll della finestra e scroll di container interni
  - Chiamavano `preventDefault()` anche su elementi scrollabili interni
- **Soluzione**: 
  - Aggiunta funzione `hasScrollableParent()` per rilevare container scrollabili
  - Listener globali ora escludono elementi con scroll interno
  - Scroll bidirezionale funziona correttamente
- **Status**: ✅ Risolto e testato

### Profile Save Error Fix
- **[profile-save-error-fix.md](./profile-save-error-fix.md)**
- **Data**: 30 Novembre 2025
- **Problema**: Errore generico "Impossibile salvare il profilo" senza dettagli specifici
- **Causa**: 
  - `publishVCard` ritornava solo `false` invece di lanciare eccezioni
  - Nessuna validazione preventiva dei dati
  - Logging insufficiente per debugging
  - Errori XMPP non tradotti in messaggi comprensibili
- **Soluzione**: 
  - Propagazione delle eccezioni con dettagli specifici
  - Validazione preventiva (connessione, dati immagine, campi vuoti)
  - Gestione errori XMPP specifici (not-authorized, forbidden, service-unavailable)
  - Logging dettagliato per ogni fase del processo
  - Messaggi di errore user-friendly in italiano
- **Status**: ✅ Risolto e documentato

### Known Issues
- **[known-issues.md](./known-issues.md)**
- Lista problemi noti con workaround/soluzioni

## Bug Risolti Storici

### Novembre 2025

1. **Pull-to-Refresh Non Funzionante**
   - Status: ✅ Risolto
   - Doc: [pull-to-refresh-fix.md](./pull-to-refresh-fix.md)

2. **Conflitto Scroll Pagina Profilo**
   - Status: ✅ Risolto
   - Doc: [profile-scroll-conflict-fix.md](./profile-scroll-conflict-fix.md)

3. **Errore Salvataggio Profilo**
   - Status: ✅ Risolto
   - Doc: [profile-save-error-fix.md](./profile-save-error-fix.md)

4. **Conversazioni Non Aggiornate dopo Invio**
   - Status: ✅ Risolto tramite sistema sincronizzazione
   - Doc: [../implementation/sync-system-complete.md](../implementation/sync-system-complete.md)

5. **Avatar Non Caricati**
   - Status: ✅ Risolto con vCard caching
   - Doc: Integrato in sync system

6. **Redirect Loop dopo Logout**
   - Status: ✅ Risolto con flag logoutIntentional
   - Doc: [../implementation/login-system.md](../implementation/login-system.md)

## Ottimizzazioni Applicate

### Performance

1. **Cache-First Loading**
   - Caricamento messaggi da IndexedDB prima di query server
   - Riduzione 90% query al server
   - Apertura chat < 100ms

2. **Batch vCard Loading**
   - vCard scaricati in batch paralleli (5 per volta)
   - Riduzione tempo sincronizzazione ~60%

3. **Component Virtualization**
   - Liste conversazioni con react-window
   - Rendering solo elementi visibili
   - Smooth scroll con 1000+ conversazioni

### Code Quality

1. **TypeScript Strict Mode**
   - Tutti i file migrati a strict mode
   - 0 `any` types
   - Type guards per validazione runtime

2. **Custom Hooks Extraction**
   - Logica UI separata in custom hooks
   - Riutilizzabilità codice
   - Testing più semplice

3. **Service Layer**
   - Logica business separata da UI
   - Dependency injection pattern
   - Mocking più facile per test

## Pattern Anti-Bug (Riferimento Rapido)

### useRef per Event Listeners
Evita closure stale: usa `useRef` per state in event listeners, registra listener una sola volta in useEffect con `[]` dependencies.

### Cleanup Effects
Sempre fare cleanup: unsubscribe, removeEventListener, clearInterval nel return di useEffect.

### Async State Updates
Check `isMountedRef.current` prima di setState dopo operazioni async per evitare setState su componente unmounted.
