# Sistema di Sincronizzazione — Virtual UI + MAM-only DB

## Indice

1. [Overview](#overview)
2. [Architettura v4.0](#architettura-v40)
3. [Flussi](#flussi)
4. [Componenti](#componenti)
5. [Comportamento](#comportamento)
6. [Testing](#testing)
7. [Evoluzione da v3.0](#evoluzione-da-v30)

---

## Overview

**Data implementazione v4.0**: 16 Giugno 2026  
**Status**: ✅ Attivo

### Obiettivo

Architettura **Virtual UI + MAM-only DB** sopra il pattern **Sync-Once + Listen** (v3.0):

- **Sync-Once all'avvio**: full o incremental MAM fino al boundary T
- **Listener = campanello**: aggiorna UI virtuale, **non** scrive messaggi nel DB
- **MAM = unico writer** dello store `messages` (testi + acknowledgement)
- **Outbox**: coda invio persistente, separata dal DB messaggi

### Problema risolto (v4.0)

Nella v3.0 il listener salvava direttamente nel DB locale. Questo causava:

- Duplicati al reload (listener + MAM)
- Stati spunte incoerenti (save locale vs archivio server)
- Difficoltà a correlare origin-id, receipt e displayed

### Soluzione v4.0

```
Evento real-time (messaggio / receipt / displayed)
    → campanello: virtual UI + overlay
    → scheduleConversationMamSync()
    → MAM scarica e persiste nel DB
    → overlay rimosso quando MAM conferma
```

---

## Architettura v4.0

### Diagramma

```
┌─────────────────────────────────────────────┐
│          APP STARTUP (connesso)             │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────────────┐
        │ AppInitializer    │
        │ 1. Salva momento T│
        │ 2. Attiva listener│  ← campanello (no write messages DB)
        └───────────────────┘
                    ↓
        ┌───────────────────┐
        │  Check DB Empty?  │
        └───────────────────┘
                    ↓
    FULL SYNC (MAM end=T)  /  INCREMENTAL SYNC (MAM end=T)
                    ↓
        ┌───────────────────┐
        │ LISTENER ATTIVO   │
        │ (da T in poi)     │
        │ → virtual UI      │
        │ → schedule MAM    │
        └───────────────────┘
```

**Regola handoff**: sync = passato (MAM fino a T + overlap 5s); listener = futuro (da T). De-duplicazione per `messageId` (origin-id).

### Cosa scrive dove

| Store / layer | Chi scrive | Contenuto |
|---------------|------------|-----------|
| **Outbox** (`outbox` store) | `outbox-send.ts` | Messaggi in uscita in coda |
| **Virtual UI** | `VirtualMessagesContext` | Messaggi ottimistici + overlay `deliveredUi` / `readingUi` |
| **DB messaggi** | **solo `mam-sync.ts`** | Testi + ack (`markerType: receipt \| displayed`) |
| **DB conversazioni** | listener + MAM | Preview, unread, timestamp |
| **Metadata sync** | `sync-initializer.ts` | RSM token, flag sync completata |

> Il listener **può** aggiornare conversazioni (preview/unread) ma **non** il corpo dei messaggi nello store `messages`.

---

## Flussi

### 1. Invio messaggio

```typescript
// outbox-send.ts
await outboxRepository.save({ tempId, body, status: 'queued' })
addOutgoingVirtual(...)  // UI immediata

const messageId = await client.sendMessage({
  to, body, type: 'chat',
  marker: { type: 'markable' },
  receipt: { type: 'request' },
})
// ✓ grigia quando transmit OK (livello 1 — NON attende MAM)

scheduleConversationMamSync(client, contactJid, 'send')
// MAM persiste messaggio nel DB → virtual sostituito da record synced
```

### 2. Messaggio in arrivo

```typescript
// MessagingContext.tsx — campanello
const handleMessage = async (message) => {
  if (!syncBoundaryService.isActive()) return
  if (!message.body) return

  addIncomingVirtual(contactJid, body, timestamp)
  await conversationRepository.update(...)  // preview
  scheduleConversationMamSync(client, contactJid, 'message-bell')
  // NO messageRepository.saveAll()
}
```

### 3. Delivery receipt (XEP-0184)

```typescript
// Mittente riceve receipt dal destinatario
const handleReceipt = (message) => {
  setDeliveredUi(message.receipt.id)  // overlay ✓✓ grigie
  scheduleConversationMamSync(client, contactJid, 'receipt')
}
```

### 4. Displayed marker (XEP-0333)

```typescript
// Destinatario: ChatPage invia markDisplayed() per messaggi DB non ancora marcati
// Mittente riceve:
const handleDisplayedMarker = (message) => {
  setReadingUi(message.marker.id)  // overlay ✓✓ blu
  scheduleConversationMamSync(client, contactJid, 'marker-displayed')
}
```

### 5. Merge UI in chat

`useMessages.ts` combina:

1. Outbox (in coda / invio)
2. Virtual incoming/outgoing
3. DB messaggi (MAM)
4. Overlay spunte (`deliveredUi`, `readingUi`)

---

## Componenti

| File | Ruolo |
|------|-------|
| `AppInitializer.tsx` | Sync all'avvio, splash screen |
| `sync-initializer.ts` | Full / incremental MAM fino a boundary T |
| `sync-boundary.ts` | Momento T, gate listener |
| `sync-status.ts` | Observer stato sync globale |
| `mam-sync.ts` | **Unico writer** store `messages` |
| `outbox-send.ts` | Coda invio + transmit XMPP |
| `VirtualMessagesContext.tsx` | UI virtuale + overlay spunte |
| `MessagingContext.tsx` | Campanello: message, receipt, marker:displayed |
| `messages.ts` | Parse MAM → Message (inclusi receipt/displayed) |
| `OutboxRepository.ts` | CRUD outbox IndexedDB |

---

## Comportamento

### Scenario: messaggio real-time

```
XMPP message (da T in poi)
    ↓
MessagingContext.handleMessage()
    ├─→ addIncomingVirtual()           (~0ms UI)
    ├─→ conversationRepository.update() (preview)
    └─→ scheduleConversationMamSync()
            ↓
        mam-sync.ts → messageRepository.saveAll()
            ↓
        useMessages merge → UI aggiornata con record DB
```

**Tempo UI**: ~0ms (virtual) + latenza MAM per persistenza

### Scenario: invio messaggio

```
User invia
    ↓
outbox-send.sendMessage()
    ├─→ outbox save + virtual UI (pending → sent)
    ├─→ client.sendMessage() → ✓ grigia
    └─→ scheduleConversationMamSync()
            ↓
        MAM conferma → DB → virtual rimosso
```

### Sync durante utilizzo

A differenza della v3.0 “save diretto senza sync”:

| Evento | MAM incrementale |
|--------|------------------|
| Messaggio in arrivo | ✅ `message-bell` |
| Invio completato | ✅ `send` |
| Receipt ricevuto | ✅ `receipt` |
| Displayed ricevuto | ✅ `marker-displayed` |

Non è una “full sync”: è MAM **per conversazione** schedulato dal campanello.

---

## Testing

### Build

```bash
cd web-client && npm run build
```

### Checklist

1. Primo avvio: full sync, DB popolato
2. Messaggio in arrivo: appare subito (virtual), poi confermato da MAM senza duplicato
3. Invio: ✓ grigia subito; dopo receipt → ✓✓ grigie; dopo displayed → ✓✓ blu
4. Reload chat: nessun duplicato, spunte corrette da DB
5. Network tab: MAM query dopo eventi campanello, non save diretto listener

**Account test**: `testardo@conversations.im` ↔ `testarda@conversations.im`

---

## Evoluzione da v3.0

| Aspetto | v3.0 (dic 2025) | v4.0 (giu 2026) |
|---------|-----------------|-----------------|
| Listener messaggi | `messageRepository.saveAll()` diretto | Campanello → virtual UI → MAM |
| Invio | save diretto DB | Outbox + virtual UI → MAM |
| Sync dopo evento | Nessuna | MAM incrementale per conversazione |
| Spunte | Solo XEP-0333 (2 livelli) | XEP-0184 + XEP-0333 (3 livelli WhatsApp) |
| messageId canonico | Stanza id / archive UID | origin-id (XEP-0359) |

### Cosa resta dalla v3.0

- Sync **solo all'avvio** come full/incremental (non pull-to-refresh)
- Sync Boundary Handoff (momento T)
- Cache-first per apertura chat
- Observer pattern su MessageRepository

---

**Ultimo aggiornamento**: 2026-06-16  
**Versione**: 4.0 (Virtual UI + MAM-only DB)  
**Policy spunte**: [message-states.md](../architecture/message-states.md)
