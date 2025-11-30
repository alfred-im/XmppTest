# Guida al Test Browser - Alfred XMPP Client

## 🚀 Avvio Rapido

### Opzione 1: Development Server (Consigliato per test)

```bash
cd /workspace/web-client
npm run dev
```

Poi apri il browser su: **http://localhost:5173/XmppTest/**

### Opzione 2: Preview Build Production

```bash
cd /workspace/web-client
npm run preview
```

Poi apri il browser su: **http://localhost:4173/XmppTest/**

---

## 🔐 Credenziali di Test

### Account Principale
- **JID**: `testardo@conversations.im`
- **Password**: `FyqnD2YpGScNsuC`
- **Server**: conversations.im
- **WebSocket**: wss://xmpp.conversations.im:443/websocket

### Account Secondario (per test chat)
- **JID**: `testarda@conversations.im`
- **Password**: `FyqnD2YpGScNsuC`
- **Server**: conversations.im

---

## ✅ Checklist Test

### 1. Test Login
- [ ] Apri l'applicazione
- [ ] Inserisci JID: `testardo@conversations.im`
- [ ] Inserisci password: `FyqnD2YpGScNsuC`
- [ ] Clicca "Accedi" o "Connetti"
- [ ] Verifica che la connessione sia riuscita
- [ ] Verifica che il popup di login si chiuda
- [ ] Verifica che appaia la lista conversazioni

### 2. Test Conversazioni
- [ ] Verifica che la lista conversazioni si carichi
- [ ] Verifica che gli avatar siano visibili
- [ ] Testa la ricerca conversazioni
- [ ] Testa il pull-to-refresh (trascina verso il basso)

### 3. Test Chat
- [ ] Apri una conversazione esistente
- [ ] Verifica che i messaggi si carichino velocemente (< 100ms)
- [ ] Invia un messaggio di test
- [ ] Verifica che il messaggio venga inviato
- [ ] Testa lo scroll dei messaggi
- [ ] Testa il caricamento messaggi più vecchi (scroll up)

### 4. Test Profilo
- [ ] Apri il profilo utente
- [ ] Verifica che avatar e informazioni siano corrette
- [ ] Testa la modifica del profilo (se implementato)

### 5. Test Multi-Account
- [ ] Apri una seconda finestra/tab in incognito
- [ ] Login con il secondo account (`testarda@conversations.im`)
- [ ] Invia un messaggio dal primo account al secondo
- [ ] Verifica che il messaggio arrivi in real-time

---

## 🐛 Debug

### Console Browser (F12)
Controlla la console per:
- Errori di connessione WebSocket
- Log di debug XMPP
- Errori IndexedDB
- Messaggi di servizio

### Network Tab
Verifica:
- Richiesta a `/.well-known/host-meta` (service discovery)
- Connessione WebSocket a `wss://xmpp.conversations.im:443/websocket`
- Status code 101 (Switching Protocols) per WebSocket

### Application/Storage
Verifica IndexedDB:
- Database: `alfred-xmpp`
- Stores: `conversations`, `messages`, `vcards`, `metadata`

---

## 📝 Note

- **WebSocket URL corretto**: `wss://xmpp.conversations.im:443/websocket`
- **NON usare**: `wss://conversations.im/xmpp-websocket` (404)
- Gli account hanno avatar WebP configurati
- Il server supporta MAM (Message Archive Management - XEP-0313)
- La cache locale (IndexedDB) mantiene tutti i dati offline

---

## 🎯 Scenario di Test Completo

1. **Primo Login** (Account testardo)
   - Login → Verifica lista conversazioni → Apri chat → Invia messaggio

2. **Secondo Login** (Account testarda in incognito)
   - Login → Verifica che appaia conversazione con testardo
   - Rispondi al messaggio → Verifica ricezione real-time

3. **Test Offline**
   - Disattiva rete
   - Verifica che conversazioni e messaggi siano ancora accessibili
   - Riattiva rete → Verifica sincronizzazione

4. **Test Pull-to-Refresh**
   - Nella lista conversazioni, trascina verso il basso
   - Verifica che appaia indicatore di refresh
   - Verifica che i dati si sincronizzino

---

## 🔗 Link Utili

- Documentazione completa: [/workspace/docs](/workspace/docs)
- Credenziali complete: [/workspace/TEST_CREDENTIALS.md](/workspace/TEST_CREDENTIALS.md)
- Issue tracker: controllare console browser per errori

---

**Data creazione**: 2025-11-30
**Ultimo aggiornamento**: 2025-11-30
