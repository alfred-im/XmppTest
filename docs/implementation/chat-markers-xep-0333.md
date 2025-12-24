# Chat Markers (XEP-0333) - Implementazione e Strategia

**Data**: 2025-12-24  
**Versione**: v3.1  
**XEP Reference**: [XEP-0333: Chat Markers](https://xmpp.org/extensions/xep-0333.html)

---

## Panoramica

Implementazione delle spunte di lettura stile WhatsApp/Telegram per indicare quando un messaggio è stato visualizzato o riconosciuto dall'interlocutore.

### Stati Supportati

| Stato | Icona | Colore | Significato |
|-------|-------|--------|-------------|
| `sent` | ✓ | Grigio | Messaggio inviato al server |
| `displayed` | ✓✓ | Grigio | Messaggio visualizzato dall'interlocutore |
| `acknowledged` | ✓✓ | Blu | Messaggio letto/riconosciuto |

---

## Architettura Strategica

### Principio Fondamentale: "Rendering Fa Le Scelte"

**NON modificare il database locale**. I marker vengono salvati esattamente come arrivano dal server XMPP, e la logica di combinazione/applicazione avviene durante il rendering.

### Flusso Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INVIO MESSAGGIO                                          │
└─────────────────────────────────────────────────────────────┘
  User scrive "Ciao"
       ↓
  messages.ts: sendMessage()
       ↓
  client.sendMessage({ 
    to: contactJid,
    body: "Ciao",
    marker: { type: 'markable' }  ← Dice al server che è marcabile
  })
       ↓
  Salva in DB: {
    messageId: "abc123",
    body: "Ciao",
    status: "sent",
    markerType: undefined
  }

┌─────────────────────────────────────────────────────────────┐
│ 2. INTERLOCUTORE VISUALIZZA                                 │
└─────────────────────────────────────────────────────────────┘
  ChatPage aperta
       ↓
  ChatPage.tsx: useEffect rileva messaggi non marcati
       ↓
  client.markDisplayed({ id: "abc123", ... })
       ↓
  Server XMPP riceve marker
       ↓
  Server salva marker nell'archivio MAM
       ↓
  Server invia evento marker al mittente originale

┌─────────────────────────────────────────────────────────────┐
│ 3. MARKER TORNA AL MITTENTE                                 │
└─────────────────────────────────────────────────────────────┘
  
  VIA REAL-TIME (se connesso):
    client.on('marker:displayed', handler)
         ↓
    MessagingContext salva in DB: {
      messageId: "marker_xyz789",
      body: "",                    ← Vuoto!
      markerType: "displayed",     ← Tipo marker
      markerFor: "abc123",         ← Referenzia messaggio originale
      from: "them",
      timestamp: Date.now()
    }
  
  VIA MAM (sync successiva):
    MAM query ritorna messaggi E marker insieme
         ↓
    messages.ts: loadMessagesForContact()
         ↓
    Salva tutti (messaggi + marker) in DB

┌─────────────────────────────────────────────────────────────┐
│ 4. RENDERING                                                │
└─────────────────────────────────────────────────────────────┘
  MessageItem.tsx riceve: allMessages = [
    { messageId: "abc123", body: "Ciao", status: "sent" },
    { messageId: "marker_xyz", body: "", markerType: "displayed", markerFor: "abc123" }
  ]
       ↓
  Per ogni messaggio:
    1. HA body?
       → SÌ: findLatestMarker("abc123", allMessages)
          → Trova: { markerType: "displayed", markerFor: "abc123" }
          → effectiveStatus = "displayed"
          → Renderizza: "Ciao" con ✓✓ grigie
    
    2. È marker (body vuoto + markerType)?
       → SÌ: return null (non renderizzare)
```

---

## Strategia Rendering (Dettaglio)

### File: `MessageItem.tsx`

#### Funzione: `findLatestMarker()`

```typescript
function findLatestMarker(messageId: string, allMessages: Message[]) {
  return allMessages
    .filter((m) => m.markerFor === messageId)  // Trova marker per questo messaggio
    .sort((a, b) => b.timestamp - a.timestamp) // Più recente prima
    [0]                                         // Prendi il primo (più recente)
}
```

**Logica**:
- Cerca tutti i messaggi con `markerFor === messageId`
- Se ci sono multipli marker (es. prima "displayed", poi "acknowledged"), usa il più recente
- Ritorna `undefined` se nessun marker trovato

#### Ciclo Rendering

```typescript
// 1. Messaggio con body (testo normale)
if (message.body && message.body.trim().length > 0) {
  const marker = findLatestMarker(message.messageId, allMessages)
  const effectiveStatus = marker?.markerType || message.status || 'sent'
  
  return (
    <div className="message">
      {message.body}
      {renderCheckmarks(effectiveStatus)}
    </div>
  )
}

// 2. Marker (no body, ha markerType)
if (message.markerType) {
  return null  // Non renderizzare, solo applicato visivamente
}

// 3. Messaggio vuoto sconosciuto (debug)
return <div>[Messaggio vuoto - ID: {message.messageId}]</div>
```

**Priorità Status**:
1. `marker?.markerType` (se marker trovato)
2. `message.status` (status base)
3. `'sent'` (default)

---

## Storage Database

### Schema Message

```typescript
interface Message {
  messageId: string       // ID dal server o generato
  conversationJid: string // JID contatto
  body: string            // Testo (vuoto per marker)
  timestamp: Date
  from: 'me' | 'them'
  status: MessageStatus
  
  // XEP-0333
  markerType?: 'received' | 'displayed' | 'acknowledged'
  markerFor?: string      // messageId referenziato
}
```

### Esempi Dati nel DB

**Messaggio testuale**:
```json
{
  "messageId": "abc123",
  "conversationJid": "alice@example.com",
  "body": "Ciao come stai?",
  "timestamp": "2025-12-24T10:30:00Z",
  "from": "me",
  "status": "sent"
}
```

**Marker displayed**:
```json
{
  "messageId": "marker_xyz789",
  "conversationJid": "alice@example.com",
  "body": "",
  "timestamp": "2025-12-24T10:30:05Z",
  "from": "them",
  "status": "sent",
  "markerType": "displayed",
  "markerFor": "abc123"
}
```

**Marker acknowledged**:
```json
{
  "messageId": "marker_def456",
  "conversationJid": "alice@example.com",
  "body": "",
  "timestamp": "2025-12-24T10:30:10Z",
  "from": "them",
  "status": "sent",
  "markerType": "acknowledged",
  "markerFor": "abc123"
}
```

---

## Invio Marker Real-Time

### File: `ChatPage.tsx`

```typescript
// XEP-0333: Invia marker 'displayed' per messaggi non marcati
useEffect(() => {
  if (!client || !isConnected || !jid || messages.length === 0) return

  // 1. Trova messaggi da loro senza marker
  const unmarkedMessages = messages.filter((msg) => {
    // Solo messaggi da loro
    if (msg.from !== 'them') return false
    
    // Solo messaggi con body (non marker)
    if (!msg.body || msg.markerType) return false
    
    // Verifica se esiste già marker per questo messaggio
    const hasMarker = messages.some(
      (m) => m.markerType === 'displayed' && m.markerFor === msg.messageId
    )
    return !hasMarker
  })

  // 2. Invia marker per ogni messaggio non marcato
  unmarkedMessages.forEach((msg) => {
    client.markDisplayed({
      id: msg.messageId,
      from: jid,
      type: 'chat',
    })
  })
}, [client, isConnected, jid, messages])
```

**Logica**:
- Triggera quando cambiano `messages` (nuovo messaggio arrivato)
- Cerca messaggi da loro (`from: 'them'`) che NON hanno ancora marker
- Invia `client.markDisplayed()` per ciascuno
- Stanza.js invia automaticamente il marker XMPP al server

---

## Ricezione Marker Real-Time

### File: `MessagingContext.tsx`

```typescript
// Listener per marker 'displayed'
const handleDisplayedMarker = async (message: ReceivedMessage) => {
  if (!message.marker?.id) return
  
  const contactJid = normalizeJID(message.from || '')
  
  // Salva marker come messaggio speciale
  const markerMessage: Message = {
    messageId: `marker_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    conversationJid: contactJid,
    body: '',
    timestamp: new Date(),
    from: 'them',
    status: 'sent',
    markerType: 'displayed',
    markerFor: message.marker.id,  // ID messaggio originale
  }
  
  await messageRepository.saveAll([markerMessage])
}

// Listener per marker 'acknowledged'
const handleAcknowledgedMarker = async (message: ReceivedMessage) => {
  // Stessa logica, markerType: 'acknowledged'
}

// Registrazione listeners
client.on('marker:displayed', handleDisplayedMarker)
client.on('marker:acknowledged', handleAcknowledgedMarker)
```

**Logica**:
- `client.on('marker:displayed', ...)` intercetta eventi marker real-time
- Salva come nuovo messaggio con `body: ''` e `markerType` + `markerFor`
- MessageRepository triggera Observer pattern → UI aggiorna automaticamente

---

## Sincronizzazione MAM

I marker sono parte dell'archivio MAM standard. Durante la sync:

```typescript
// messages.ts: loadMessagesForContact()
const result = await client.searchHistory(contactJid, {
  paging: { max: 50, after: token }
})

// result.results contiene:
// - Messaggi testuali normali
// - Marker (messaggi con markerType)

const messages = result.results.map(msg => ({
  messageId: msg.id || `mam_${Date.now()}`,
  body: msg.item.message?.body || '',
  markerType: msg.marker?.type,       // 'displayed', 'acknowledged', undefined
  markerFor: msg.marker?.for,         // ID messaggio referenziato
  // ...
}))

await messageRepository.saveAll(messages)  // Salva tutto insieme
```

**Importante**: MAM ritorna messaggi E marker insieme nella stessa query. Non serve fare query separate.

---

## CSS Styling

### File: `ChatPage.css`

```css
/* Spunta singola (sent) */
.chat-page__checkmark-single {
  font-size: 14px;
  color: #999;
}

/* Spunte doppie (displayed) */
.chat-page__checkmark-double {
  font-size: 14px;
  color: #999;
  letter-spacing: -4px;  /* Sovrappone le due ✓✓ */
  position: relative;
}

/* Spunte doppie blu (acknowledged) */
.chat-page__checkmark-double-blue {
  font-size: 14px;
  color: #34B7F1;        /* Blu WhatsApp */
  letter-spacing: -4px;
  position: relative;
}
```

**Tecnica**: `letter-spacing: -4px` sovrappone i caratteri ✓✓ per creare l'effetto "doppia spunta" visivo.

---

## Vantaggi Strategia Attuale

### 1. Coerenza con "Server as Source of Truth"
- Marker salvati esattamente come arrivano dal server
- NO modifica/trasformazione dati nel DB locale
- DB locale è cache fedele del server XMPP

### 2. Separazione Logica/Presentazione
- Dati (DB): grezzi, immutabili
- Logica (Rendering): combina, applica, mostra
- Facilita debug (puoi vedere marker separati nel DB)

### 3. Multi-Device Sync
- Marker sono nell'archivio MAM server
- Ogni device sincronizza marker automaticamente
- Nessuna logica client-side speciale per sync

### 4. Storico Completo
- Puoi vedere quando un messaggio è stato marcato
- Multipli marker (displayed → acknowledged) tracciabili
- Utile per analytics/debug

---

## Limitazioni Note

### 1. Performance Rendering
- `findLatestMarker()` è O(n) per ogni messaggio
- Con migliaia di messaggi può diventare lento
- **Possibile ottimizzazione**: index/Map per lookup O(1)

### 2. ID Mismatch Potenziale
- Se server XMPP e client usano ID diversi, marker non funzionano
- Dipende da implementazione server e network
- **Mitigazione**: usare sempre `msg.id` dal server se disponibile

### 3. Marker Solo per Chat 1-to-1
- XEP-0333 non è standard per MUC (group chat)
- Implementazione attuale supporta solo chat dirette
- **Futuro**: estendere per group chat se server supporta

---

## Testing

### Scenario Test Base

1. **Account 1** invia messaggio a **Account 2**
2. **Account 2** apre chat → marker `displayed` inviato automaticamente
3. **Account 1** dovrebbe vedere ✓✓ grigie
4. **Account 2** legge e chiude chat → marker `acknowledged` (opzionale)
5. **Account 1** dovrebbe vedere ✓✓ blu

### Verifica Database

**Chrome DevTools** → Application → IndexedDB → `conversations-db` → `messages`

Cerca:
- Messaggi con `body !== ''` e `markerType === undefined`
- Marker con `body === ''`, `markerType !== undefined`, `markerFor` referenziato

### Log Console

```
📤 Marker displayed inviato per messaggio: abc123
✓✓ Marker displayed ricevuto per messaggio: abc123
   ✅ Marker displayed salvato nel DB
```

---

## Riferimenti

- **XEP-0333**: https://xmpp.org/extensions/xep-0333.html
- **Stanza.js Docs**: https://stanzajs.org/
- **PROJECT_MAP.md**: Sezione "Strategia Chat Markers"
- **Code Files**:
  - `MessageItem.tsx` - Rendering logic
  - `MessagingContext.tsx` - Real-time marker reception
  - `ChatPage.tsx` - Marker sending
  - `conversations-db.ts` - Schema e storage

---

**Ultimo aggiornamento**: 2025-12-24
