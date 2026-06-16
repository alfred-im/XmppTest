# Stati del messaggio — Policy di sviluppo

**Versione**: 2.1  
**Data**: 2026-06-16  
**Stato**: Policy attiva

---

## Principio fondamentale

Ogni flusso ha **due fasi**:

1. **`ui`** — aggiornamento grafico immediato (campanello / azione utente)
2. **`synced`** — dato autoritativo da MAM nel database locale

Il listener real-time **non scrive il corpo dei messaggi nel DB**.  
Solo **MAM** persiste messaggi e acknowledgement nel database messaggi.

---

## Spunte WhatsApp — 3 livelli

| Livello | UI | Significato | Meccanismo |
|---------|-----|-------------|------------|
| **1 — Inviato** | ✓ grigia | Il server XMPP ha accettato il messaggio | Invio riuscito (`sendMessage` / outbox) |
| **2 — Consegnato** | ✓✓ grigie | Arrivato sul device del destinatario | **XEP-0184** delivery receipt |
| **3 — Lettura** | ✓✓ blu | Il destinatario ha visualizzato in chat | **XEP-0333** `displayed` |

Priorità UI: `reading` > `delivered` > `sent`.

### Tre meccanismi distinti (non un solo XEP)

| Livello | Standard | Namespace / azione |
|---------|----------|-------------------|
| 1 | XMPP core | Invio stanza; ✓ grigia al successo di `client.sendMessage()` (accettazione server) |
| 2 | [XEP-0184](https://xmpp.org/extensions/xep-0184.html) | `urn:xmpp:receipts` — `<request/>` in invio, `<received id="origin-id"/>` in risposta |
| 3 | [XEP-0333 v1.0](https://xmpp.org/extensions/xep-0333.html) | `urn:xmpp:chat-markers:0` — `<markable/>` + `<displayed id="origin-id"/>` |

> Il livello 1 **non è un XEP** e **non dipende da MAM**: la ✓ grigia appare quando il server XMPP accetta la stanza (transmit OK / outbox). MAM è la fase `synced` separata — persiste il messaggio nel DB locale ma non determina la spunta livello 1. I livelli 2 e 3 sono **due estensioni separate** con trigger e XML diversi.

---

## Flussi invio e ricezione

### Mittente (messaggi nostri)

```
INVIO
  outbox → virtual UI → sendMessage (markable + receipt request)
  ✓ grigia quando transmit OK

CONSEGNA (XEP-0184)
  destinatario risponde <received/>
  campanello receipt → deliveredUi overlay → MAM → markerType: 'receipt'

LETTURA (XEP-0333)
  destinatario invia <displayed/>
  campanello marker:displayed → readingUi overlay → MAM → markerType: 'displayed'
```

### Destinatario (messaggi in arrivo)

```
RICEZIONE
  campanello → virtual UI → MAM

CONSEGNA (XEP-0184) — nostra risposta automatica
  stanza.js invia <received id="origin-id"/> se il messaggio ha <request/>
  (sendReceipts: true in xmpp.ts)

LETTURA (XEP-0333) — nostra risposta esplicita
  ChatPage invia markDisplayed() all'apertura chat
```

---

## Tre flussi paralleli (ui → synced)

| Flusso | `ui` | `synced` (MAM → DB) |
|--------|------|---------------------|
| **Invio** | Virtual + outbox → ✓ grigia su transmit OK | MAM persiste messaggio (sostituisce virtual) |
| **Ricezione** | Campanello messaggio | MAM scarica messaggio |
| **Consegna** | Campanello receipt → `deliveredUi` | MAM salva `markerType: 'receipt'` |
| **Lettura** | Campanello displayed → `readingUi` | MAM salva `markerType: 'displayed'` |

---

## Identificatori

- **`messageId`** = `origin-id` (XEP-0359), non archive UID MAM
- **`markerFor` / `receipt.id` / `displayed id`** = stesso origin-id del messaggio target
- Vedi `utils/message-id.ts`

---

## Dove vive ogni dato

| Layer | Contenuto |
|-------|-----------|
| **Outbox** | Messaggi in uscita; `stanzaId` = origin-id |
| **UI virtuale** | Messaggi virtuali + overlay `deliveredUi` / `readingUi` |
| **DB messaggi** | Solo dati `synced` da MAM |
| **Ack nel DB** | `markerType: 'receipt' \| 'displayed'`, `markerFor: origin-id` |

---

## File implementazione

| File | Ruolo |
|------|-------|
| `outbox-send.ts` | Invio con `markable` + `receipt: request` |
| `xmpp.ts` | `sendReceipts: true`, `chatMarkers: true` |
| `MessagingContext.tsx` | Campanello `receipt` + `marker:displayed` |
| `ChatPage.tsx` | `markDisplayed()` per messaggi da loro |
| `utils/checkmark.ts` | Risoluzione 3 livelli |
| `messages.ts` | Parse receipt/displayed da MAM |

---

## `Message.status` vs `CheckmarkLevel` (non confondere)

| Campo | Tipo | Uso attuale |
|-------|------|-------------|
| `Message.status` | `'pending' \| 'sent' \| 'delivered' \| 'failed'` | Stato trasmissione messaggio nel DB. `'delivered'` è **legacy/non usato** nel codice attuale |
| `CheckmarkLevel` | `'pending' \| 'sent' \| 'delivered' \| 'reading' \| 'failed'` | Livello spunta UI risolto da `resolveCheckmarkLevel()` |

Il **livello 2 spunta** (✓✓ grigie) deriva da `markerType: 'receipt'` o overlay `deliveredUi`, **non** da `Message.status === 'delivered'`.

---

## Riferimenti

- [delivery-receipts-xep-0184.md](../implementation/delivery-receipts-xep-0184.md)
- [chat-markers-xep-0333.md](../implementation/chat-markers-xep-0333.md)
- [sync-system-complete.md](../implementation/sync-system-complete.md)
