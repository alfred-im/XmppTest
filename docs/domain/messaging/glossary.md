# Glossario — contesto messaging

**Bounded context:** `messaging`  
**Ultima revisione:** 2026-07-18  
**Promesse SDD:** [PROM-OUTBOUND-SEND](../../specs/promises/product/PROM-OUTBOUND-SEND.md), [PROM-MESSAGE-STATUS](../../specs/promises/product/PROM-MESSAGE-STATUS.md), [PROM-REALTIME-OWNER](../../specs/promises/product/PROM-REALTIME-OWNER.md)

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **Mailbox archive** | Riga in `messages` con `owner_id` = utente corrente; ogni utente vede solo la propria copia. |
| **Peer conversation** | Scambio 1:1 (o gruppo) tra `owner_id` e `peer_profile_id`; lista caricata via RPC `list_peer_messages`. |
| **ChatMessage** | Modello UI (`message.dart`): corpo, media, coordinate, stato spunte, `clientMessageId`. |
| **Optimistic bubble** | Bolla inserita client-side con `status: pending` e `id == clientMessageId` prima dell'ACK RPC. |
| **client_message_id** | UUID client per idempotenza; chiave di merge tra bolla optimistic e riga server. |
| **OutboundMessageQueue** | Coda persistente (`SharedPreferences` + file media) per retry dopo fallimento rete/upload. |
| **queueKey** | `userId\|peerProfileId` — scope coda per account e peer ([PROM-OUTBOUND-SEND-002]). |
| **mergeChatMessage** | Unisce riga realtime/RPC in bolla esistente senza perdere media né `retryPayloadPath`. |
| **Tick-only update** | UPDATE Realtime con sole date `delivered_at`/`read_at` — merge preserva `content_type` e `media_url`. |
| **isMine** | `author_id == currentUserId` — abilita spunte mittente ([PROM-MESSAGE-STATUS-010]). |
| **MessageStatus** | `pending`/`failed` solo pre-ACK client; post-ACK da `messageStatusFromMailbox`. |
| **Realtime owner filter** | Subscribe Postgres su `messages` con `owner_id = io`; peer filtrato in callback. |
| **Delivery tick** | UPDATE su riga mittente quando worker valorizza `delivered_at` o `read_at`. |
| **Retry backoff** | `retryDelayForAttempts`: `2^attempts` secondi (cap 64 s), timer ogni 15 s. |
| **pending://** | URL fittizio in bolla media pre-upload; preview da `OutboundMediaCache`. |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **media** | Upload blob (`MessageMediaService`) prima di `send*ToProfile` per tipi con `media_url`. |
| **delivery** | Worker server valorizza `delivered_at`/`read_at` sulla copia mittente. |
| **reception** | `delivered_at` null permanente se blocco allow list — non errore invio. |
| **multi-account** | Controller e coda scoped a `userId`; realtime solo account in focus. |
| **navigation** | Apertura chat crea `MessagesController` per `(userId, peerProfileId)`. |

---

## Invarianti

1. Una sola bolla per `client_message_id` — merge su `id`, `clientMessageId` incrociati.
2. `isSending` serializza invii e retry automatici nella stessa chat.
3. All'init: `load` → `restoreFailedFromQueue` → `markRead` → `attachRealtime` → timer retry.
4. Realtime non duplica: `_replaceOrInsertMessage` + `mergeChatMessage`.
5. Sessione scaduta: nessun load/send; `error = sessionExpiredMessage`.
