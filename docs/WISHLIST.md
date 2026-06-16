# Wishlist Funzionalità

**Ultimo aggiornamento**: 2026-06-16

Questo documento elenca le funzionalità desiderate per lo sviluppo futuro di Alfred, con riferimenti tecnici alle XEP (XMPP Extension Protocol) rilevanti.

---

## 🎯 Priorità Alta

### XEP-0280: Message Carbons
**Riferimento**: [XEP-0280](https://xmpp.org/extensions/xep-0280.html)

**Descrizione**: Sincronizzazione messaggi tra dispositivi multipli dello stesso account. Quando un utente invia un messaggio da un dispositivo, tutti gli altri dispositivi connessi ricevono una copia (carbon copy).

**Benefici**:
- Conversazioni sincronizzate su tutti i device
- Esperienza multi-device fluida
- Storia messaggi consistente

**Note implementazione**:
- Richiede supporto server (conversations.im supporta)
- Da integrare nel servizio XMPP esistente
- Sincronizzazione automatica con IndexedDB

---

### XEP-0333: Chat Markers (displayed)
**Riferimento**: [XEP-0333 v1.0](https://xmpp.org/extensions/xep-0333.html)  
**Stato**: ✅ Parzialmente implementato (✓ grigia + ✓✓ blu lettura)

**Descrizione**: Indicatore “visualizzato” quando l'interlocutore apre la chat. Unico marker in XEP-0333 v1.0 stabile.

**Implementato**:
- Invio con `<markable/>`
- `markDisplayed()` all'apertura chat
- ✓✓ blu su marker `displayed` (origin-id canonico)

**Non in scope** (rimossi da spec 2024):
- `received`, `acknowledged` in XEP-0333

**Policy**: [message-states.md](./architecture/message-states.md)

---

### XEP-0184: Message Delivery Receipts (opzionale, non pianificato)
**Riferimento**: [XEP-0184](https://xmpp.org/extensions/xep-0184.html)  
**Stato**: ❌ Non in roadmap

**Descrizione**: Conferma che il messaggio è **arrivato sul device** del destinatario (`<received/>` in namespace `urn:xmpp:receipts`). Protocollo **separato** da XEP-0333.

**Perché non è in todo**: la policy attuale usa solo due spunte (inviato + letto). Il passo intermedio “consegnato” (✓✓ grigie stile WhatsApp) richiederebbe XEP-0184 come **seconda integrazione** distinta da `displayed`. Deciso di non implementarlo.

**Nota**: stanza.js può inviare receipt 0184 in automatico; noi non li mostriamo in UI.

---

## 🚀 Funzionalità in Roadmap

### XEP-0045: Multi-User Chat (MUC)
**Riferimento**: [XEP-0045](https://xmpp.org/extensions/xep-0045.html)

**Descrizione**: Chat di gruppo con più partecipanti, ruoli e moderazione.

**Benefici**:
- Supporto gruppi completi
- Gestione ruoli (admin, moderator, member)
- Stanze permanenti e temporanee

---

### XEP-0363: HTTP File Upload
**Riferimento**: [XEP-0363](https://xmpp.org/extensions/xep-0363.html)

**Descrizione**: Upload file tramite HTTP al server XMPP per condivisione in chat.

**Benefici**:
- Condivisione immagini, documenti, video
- Upload tramite HTTP (più semplice di in-band)
- Link permanenti ai file

**Note implementazione**:
- Richiede supporto server con storage
- Gestione thumbnail immagini
- Limite dimensioni file (configurabile server)

---

### XEP-0308: Last Message Correction
**Riferimento**: [XEP-0308](https://xmpp.org/extensions/xep-0308.html)

**Descrizione**: Modifica dell'ultimo messaggio inviato (come "Edit" su Telegram).

**Benefici**:
- Correzione typo senza eliminare
- UX migliorata
- Storia modifiche

---

### XEP-0092: Software Version
**Riferimento**: [XEP-0092](https://xmpp.org/extensions/xep-0092.html)

**Descrizione**: Query informazioni su versione software client/server.

**Benefici**:
- Debugging interoperabilità
- Statistiche utilizzo
- Feature detection

---

## 🎨 Feature UI/UX

### Emoji Picker
**Descrizione**: Selettore emoji nativo nell'input messaggi.

**Benefici**:
- UX messaggistica moderna
- Supporto completo Unicode emoji
- Categorie e ricerca

---

### Voice/Video Calls
**Riferimenti**: [XEP-0166 (Jingle)](https://xmpp.org/extensions/xep-0166.html), [XEP-0167 (Jingle RTP)](https://xmpp.org/extensions/xep-0167.html)

**Descrizione**: Chiamate vocali e videochiamate peer-to-peer.

**Benefici**:
- Comunicazione real-time completa
- Alternative a chat testuale
- WebRTC integration

**Note implementazione**:
- Complessità alta
- Richiede WebRTC
- Gestione NAT/STUN/TURN
- Segnalazione tramite Jingle

---

## 📊 Metriche e Priorità

| Funzionalità | Priorità | Complessità | Impatto UX | Supporto Server |
|--------------|----------|-------------|------------|-----------------|
| XEP-0280 Carbons | ⭐⭐⭐ Alta | Media | Alto | ✅ Ampio |
| XEP-0333 Chat Markers | ⭐⭐⭐ Alta | Bassa | Alto | ✅ Ampio |
| XEP-0308 Message Correction | ⭐⭐ Media | Bassa | Medio | ✅ Buono |
| XEP-0363 File Upload | ⭐⭐⭐ Alta | Media | Alto | ✅ Buono |
| XEP-0045 MUC | ⭐⭐ Media | Alta | Alto | ✅ Ampio |
| Emoji Picker | ⭐ Bassa | Bassa | Basso | N/A |
| Voice/Video | ⭐⭐ Media | Molto Alta | Alto | ⚠️ Limitato |

---

## 📝 Note Generali

### Compatibilità Server
La maggior parte delle XEP richiede supporto server. Prima di implementare una feature, verificare:
- `conversations.im` supporto (server test principale)
- Alternatives server XMPP pubblici
- Feature detection runtime (XEP-0030 Service Discovery)

### Testing
Ogni nuova XEP deve includere:
- Unit tests servizio XMPP
- Integration tests con server reale
- UI tests con Playwright
- Documentazione in `docs/implementation/`

### Riferimenti Utili
- **XEP Index**: https://xmpp.org/extensions/
- **Stanza.js Plugins**: https://stanzajs.org/docs/
- **Compliance Suites**: https://xmpp.org/extensions/xep-0459.html (2024)

---

**Prossimi Passi**:
1. Implementare XEP-0280 (Carbons) per sync multi-device
2. Implementare XEP-0333 (Chat Markers) per spunte lettura
3. Aggiungere XEP-0308 (Message Correction) per edit messaggi
4. Valutare XEP-0363 (File Upload) dopo testing server
