# Chat Markers (XEP-0333) — Implementazione

**Data aggiornamento**: 2026-06-16  
**XEP**: [XEP-0333 v1.0 — Displayed Markers](https://xmpp.org/extensions/xep-0333.html)  
**Policy canonica**: [message-states.md](../architecture/message-states.md) — **leggere quella prima**

> Documento storico (dic 2025) aggiornato per riflettere architettura v4.0 (virtual UI + MAM-only DB + origin-id).

---

## Cosa implementiamo oggi

Due spunte, allineate a **XEP-0333 v1.0**:

| UI | Protocollo | Chi invia |
|----|------------|-----------|
| ✓ grigia | invio accettato dal server | mittente |
| ✓✓ blu | `<displayed id="origin-id"/>` | **client destinatario** quando apre la chat |

### Cosa NON implementiamo

- `received` e `acknowledged` — **rimossi** da XEP-0333 v1.0 (2024)
- **XEP-0184** delivery receipts — protocollo separato, fuori scope (vedi tabella in `message-states.md`)

---

## Architettura attuale (v4.0)

```
INVIO messaggio
  outbox → virtual UI → MAM → DB (messageId = origin-id)

RICEZIONE marker displayed (campanello)
  listener → overlay readingUi → schedule MAM → DB marker

RENDERING
  resolveCheckmarkLevel(): displayed o readingUi → ✓✓ blu
```

### File principali

| File | Ruolo |
|------|-------|
| `outbox-send.ts` | Invio con `<markable/>`, nessun save diretto nel DB messaggi |
| `MessagingContext.tsx` | Campanello: solo `marker:displayed` → `setReadingUi` + MAM |
| `ChatPage.tsx` | Destinatario invia `client.markDisplayed({ id: origin-id })` |
| `utils/message-id.ts` | `messageId` canonico = origin-id (non archive UID MAM) |
| `utils/checkmark.ts` | ✓ / ✓✓ blu da `displayed` |
| `mam-sync.ts` | Unico writer DB dopo campanello |

Il listener **non** salva marker nel DB. Solo MAM persiste `markerType: 'displayed'` con `markerFor` = origin-id del messaggio target.

---

## Flusso displayed (lettura)

### 1. Mittente invia

```typescript
client.sendMessage({
  to: contactJid,
  body: 'Ciao',
  marker: { type: 'markable' },
})
// origin-id generato da stanza.js → salvato come messageId dopo MAM
```

### 2. Destinatario visualizza

`ChatPage.tsx` — su messaggi DB da loro senza marker `displayed`:

```typescript
client.markDisplayed({
  id: msg.messageId,  // origin-id canonico
  from: jid,
  type: 'chat',
})
```

### 3. Mittente riceve

```typescript
client.on('marker:displayed', (message) => {
  setReadingUi(message.marker.id)      // overlay UI immediato
  scheduleConversationMamSync(...)   // MAM allinea DB
})
```

---

## Origin-id (fix 2026-06)

MAM assegna un **archive UID** diverso per ogni account. I marker referenziano l’**origin-id** dello stanza.

Priorità per `messageId` locale:

```
origin-id  →  id stanza  →  archive UID MAM (fallback)
```

Vedi `utils/message-id.ts` e `mamResultToMessage()` in `messages.ts`.

---

## XEP-0184 — serve metterlo in todo?

**No**, con la policy attuale.

| Se vuoi… | Cosa serve |
|----------|------------|
| ✓ + ✓✓ blu (inviato + letto) | Solo XEP-0333 `displayed` — **già fatto** |
| ✓ + ✓✓ grigio + ✓✓ blu (modello WhatsApp classico) | XEP-0184 **+** XEP-0333 — **due integrazioni separate** |

XEP-0184 e XEP-0333 usano namespace XML diversi, trigger diversi e significati diversi. Non si sostituiscono.

Stanza.js può già inviare receipt 0184 in automatico (`sendReceipts !== false`), ma **noi non li mostriamo in UI**.

---

## Riferimenti

- [message-states.md](../architecture/message-states.md) — policy completa
- [sync-system-complete.md](./sync-system-complete.md) — sync iniziale e handoff
