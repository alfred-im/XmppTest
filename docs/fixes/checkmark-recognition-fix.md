# Fix: Problemi con Riconoscimento Spunte (Checkmarks)

**Data**: 2025-12-24  
**Branch**: `cursor/checkmark-recognition-issues-23b1`  
**Problemi risolti**: Spunte duplicate, mancanti e non riconosciute

## Problemi Identificati

### 1. Manca Gerarchia Marker in `findLatestMarker`
**File**: `MessageItem.tsx`  
**Problema**: La funzione prendeva sempre il marker più recente per timestamp, senza considerare la priorità dei tipi di marker.

**Soluzione**: Implementata gerarchia marker secondo XEP-0333:
- `acknowledged` (priorità 3) > `displayed` (priorità 2) > `received` (priorità 1)
- Ordinamento prima per priorità, poi per timestamp

### 2. Nessuna Dedupicazione Marker in `MessagingContext`
**File**: `MessagingContext.tsx`  
**Problema**: I marker ricevuti venivano salvati senza verificare se esistevano già duplicati dello stesso tipo per lo stesso messaggio.

**Soluzione**: Aggiunta verifica duplicati prima del salvataggio:
- Controlla se esiste già un marker dello stesso tipo per il messaggio
- Skip se marker già presente
- Riduce marker duplicati nel database

### 3. Invio Ripetuto Marker in `ChatPage`
**File**: `ChatPage.tsx`  
**Problema**: L'useEffect si attivava ad ogni cambio di `messages`, causando invio ripetuto di marker per gli stessi messaggi.

**Soluzione**: Implementato tracking messaggi già marcati:
- Aggiunto `markedMessagesRef` per tracciare messaggi già marcati
- Skip invio marker se già inviato
- Pulizia cache quando si cambia conversazione

### 4. Marker Non Estratti da MAM Sync
**File**: `messages.ts`  
**Problema**: Durante la sincronizzazione MAM dei messaggi storici, i campi marker non venivano estratti dal messaggio XMPP.

**Soluzione**: Estrazione marker dai messaggi MAM:
- Estrae `markerType` e `markerFor` da `msg.item.message?.marker`
- I marker storici ora vengono salvati correttamente nel database
- Fix spunte "mancanti" per messaggi storici

## Modifiche ai File

### `web-client/src/components/MessageItem.tsx`
```typescript
// PRIMA
function findLatestMarker(messageId: string, allMessages: Message[]): Message | undefined {
  return allMessages
    .filter((m) => m.markerFor === messageId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
}

// DOPO
function findLatestMarker(messageId: string, allMessages: Message[]): Message | undefined {
  const markers = allMessages.filter((m) => m.markerFor === messageId)
  
  if (markers.length === 0) return undefined
  
  // Definisci priorità marker: acknowledged (3) > displayed (2) > received (1)
  const priority = (marker: Message): number => {
    if (marker.markerType === 'acknowledged') return 3
    if (marker.markerType === 'displayed') return 2
    if (marker.markerType === 'received') return 1
    return 0
  }
  
  // Ordina per priorità (più alta prima), poi per timestamp (più recente prima)
  return markers.sort((a, b) => {
    const priorityDiff = priority(b) - priority(a)
    if (priorityDiff !== 0) return priorityDiff
    return b.timestamp.getTime() - a.timestamp.getTime()
  })[0]
}
```

### `web-client/src/contexts/MessagingContext.tsx`
```typescript
// Aggiunta verifica duplicati in handleDisplayedMarker e handleAcknowledgedMarker

// Verifica se esiste già un marker dello stesso tipo per questo messaggio
const existingMessages = await messageRepository.getByConversation(contactJid, { limit: 1000 })
const existingMarker = existingMessages.find(
  (m) => m.markerType === 'displayed' && m.markerFor === message.marker.id
)

if (existingMarker) {
  console.log('   ⚠️ Marker displayed già esistente per questo messaggio, skip')
  return
}
```

### `web-client/src/pages/ChatPage.tsx`
```typescript
// Aggiunto tracking messaggi marcati
const markedMessagesRef = useRef<Set<string>>(new Set())

// In useEffect per marker
// Skip se già abbiamo inviato un marker per questo messaggio
if (markedMessagesRef.current.has(msg.messageId)) return false

// Dopo invio marker
markedMessagesRef.current.add(msg.messageId)

// Pulizia cache quando cambia conversazione
useEffect(() => {
  markedMessagesRef.current.clear()
}, [jid])
```

### `web-client/src/services/messages.ts`
```typescript
// Aggiunta estrazione marker da MAM
function mamResultToMessage(msg: MAMResult, conversationJid: string, myJid: string): Message {
  // ... codice esistente ...
  
  // Estrai marker info se presente (XEP-0333)
  const marker = msg.item.message?.marker
  const markerType = marker?.type as 'received' | 'displayed' | 'acknowledged' | undefined
  const markerFor = marker?.id

  return {
    // ... campi esistenti ...
    // XEP-0333: Chat Markers
    markerType,
    markerFor,
  }
}
```

## Testing

### Scenari di Test
1. **Invio messaggio**: Verificare che la spunta appaia correttamente (✓ sent inizialmente)
2. **Ricezione marker displayed**: Verificare che la spunta diventi ✓✓ grigia
3. **Ricezione marker acknowledged**: Verificare che la spunta diventi ✓✓ blu
4. **Conversazione storica**: Aprire conversazione con messaggi passati e verificare che le spunte siano corrette
5. **Marker duplicati**: Verificare che non ci siano marker duplicati nel database
6. **Cambio conversazione**: Verificare che i marker vengano inviati correttamente anche dopo cambio conversazione

### Test Manuale
```bash
# Avvia dev server
cd web-client
npm run dev

# Login con account testarda@conversations.im
# Apri conversazione con testardo@conversations.im
# Invia messaggi e verifica spunte
```

## Note Implementative

### XEP-0333: Chat Markers
Riferimento: https://xmpp.org/extensions/xep-0333.html

**Tipi di marker supportati**:
- `received`: Messaggio ricevuto dal server (non implementato lato client)
- `displayed`: Messaggio visualizzato dall'utente (✓✓ grigio)
- `acknowledged`: Messaggio confermato/letto attivamente (✓✓ blu)

**Priorità marker**:
1. `acknowledged` - massima priorità, indica lettura attiva
2. `displayed` - media priorità, indica visualizzazione
3. `received` - minima priorità, indica ricezione server

### Limitazioni Note
1. **Performance dedupicazione**: La verifica duplicati carica fino a 1000 messaggi in memoria. Per conversazioni molto lunghe potrebbe essere lenta.
2. **Race conditions**: Se arrivano marker duplicati contemporaneamente, potrebbero essere salvati entrambi prima della verifica.
3. **ID messaggi MAM**: I marker per messaggi MAM dipendono dalla corrispondenza esatta degli ID. Server diversi potrebbero usare ID diversi.

## Benefici
- ✅ Riduzione marker duplicati nel database
- ✅ Visualizzazione corretta gerarchia spunte
- ✅ Riduzione chiamate XMPP (no invii ripetuti)
- ✅ Supporto completo marker per messaggi storici MAM
- ✅ UX migliorata con feedback visivo corretto

## Miglioramenti Futuri
1. **Performance**: Indicizzare `markerFor` nel database per query più veloci
2. **Race conditions**: Implementare lock/transaction per dedupicazione atomica
3. **Marker `received`**: Implementare supporto completo per marker `received`
4. **Privacy**: Aggiungere opzione per disabilitare invio marker

---

**Status**: ✅ Completato  
**Testing**: ⏳ Da testare manualmente con account di test  
**Deploy**: ⏳ Da deployare dopo testing
