# Comandi ed eventi — contesto messaging

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/messaging/](../../model/uml/messaging/)

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `LoadMessages` | Init / `reload()` | RPC `list_peer_messages`; dedupe + enrich autori gruppo. |
| `MarkRead` | Init chat | RPC `mark_peer_read` sul peer aperto. |
| `AttachRealtime` | Init chat | `MessageService.subscribeToPeerMessages` — canale `owner_id` + filtro peer. |
| `SendMessage` | ChatInputBar | Testo: optimistic + coda + `send_message_to_profile`. |
| `SendGif` | ChatInputBar | Upload GIF + RPC `content_type=gif`. |
| `SendVoice` | ChatInputBar (hold) | Upload voice + RPC `content_type=voice` — vedi contesto **media**. |
| `SendLocation` | ChatInputBar (pin) | RPC `content_type=location` — coordinate arrotondate. |
| `SendImage` | ChatInputBar | Upload image + RPC — flusso dedicato (no `_sendOptimistic`). |
| `SendVideo` | ChatInputBar | Upload video + RPC — flusso dedicato con probe durata. |
| `RetryMessage` | Tap bolla failed | Ricarica item da coda e `_dispatchQueueItem`. |
| `QueueRetry` | Timer 15 s | `_processRetries` — backoff esponenziale per item in coda. |
| `RestoreFailedQueue` | Init post-load | Reidrata bolle `failed` da `OutboundMessageQueue`. |
| `DisposeMessaging` | Chiudi chat | Cancel timer, `disposeChannel`, `outboundQueue.dispose`. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `MessagesLoaded` | Lista pronta; `isLoading = false`. |
| `LoadFailed` | Errore fetch; `error` valorizzato. |
| `OptimisticInserted` | Bolla `pending` aggiunta alla lista. |
| `SendAcknowledged` | RPC ok — merge bolla con riga server; rimozione da coda. |
| `SendFailed` | Eccezione — `status: failed`, item aggiornato in coda. |
| `RealtimeReceived` | INSERT/UPDATE peer-relevant — merge in lista. |
| `DeliveryTickReceived` | UPDATE con sole date spunte su bolla `isMine`. |
| `RetryDispatched` | `_dispatchQueueItem` completato o fallito. |
| `SessionExpired` | `hasValidSession()` false — blocca load/send. |
| `InboxRefreshRequested` | Callback `onMessagesChanged` dopo invio riuscito. |

---

## Stati UI (MessagesController)

| Stato | Campo / condizione |
|-------|-------------------|
| `Loading` | `isLoading == true` |
| `Ready` | `isLoading == false`, `isSending == false` |
| `Sending` | `isSending == true` |
| `Error` | `error != null` (coesiste con Ready) |
| `RealtimeAttached` | `_channel != null` |

---

## Merge e deduplica

| Regola | Implementazione |
|--------|-----------------|
| Chiave merge | `id`, `clientMessageId`, incrocio id ↔ clientMessageId |
| Tick-only | `mergeChatMessage` preserva media se incoming senza contenuto renderizzabile |
| Dedupe load | `_dedupeMessages` su batch RPC |

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Coda + optimistic | PROM-OUTBOUND-SEND |
| Spunte post-ACK | PROM-MESSAGE-STATUS |
| Realtime owner + peer | PROM-REALTIME-OWNER |
| Media upload | PROM-CHAT-MEDIA (sotto-contesto media) |
