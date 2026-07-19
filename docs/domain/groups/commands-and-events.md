# Comandi ed eventi — contesto groups

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/groups/](../../model/uml/groups/)

---

## Comandi — home (`GroupHomeController`)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `LoadGroupHome` | Init / `reload()` | `fetchFullProfile` + `fetchOwnerMessages`; aggrega conteggi e autori attivi. |
| `BuildConversationTile` | Post-load | Deriva `ChatPeer` da ultimo messaggio storico (o profilo vuoto). |
| `BuildActiveAuthors` | Post-load | Conta messaggi per `contentAuthorId` / `authorId` escluso gruppo; ordina per count. |

---

## Comandi — conversazione (`GroupMessagesController`)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `LoadGroupMessages` | Init / `reload()` | RPC `list_owner_messages`; enrich autori e `timeLabel`. |
| `AttachOwnerRealtime` | Init | `subscribeToOwnerMessages` su `owner_id = gruppo`. |
| `BroadcastMessage` | ChatInputBar | Testo → `broadcastToAllowlist` + `clientMessageId`. |
| `BroadcastGif` | ChatInputBar | Upload GIF + `broadcastGifToAllowlist`. |
| `BroadcastVoice` | ChatInputBar | Upload voice + `broadcastVoiceToAllowlist`. |
| `BroadcastImage` | ChatInputBar | Upload image + `broadcastImageToAllowlist`. |
| `BroadcastVideo` | ChatInputBar | Upload video + `broadcastVideoToAllowlist`. |
| `BroadcastLocation` | ChatInputBar | `broadcastLocationToAllowlist` con coordinate arrotondate. |
| `DisposeGroupMessages` | Dispose screen | `disposeChannel` realtime. |

---

## Comandi — shell / navigazione

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `OpenGroupChat` | Tap tile home / mobile | `AccountViewState.groupChatOpen = true` — mostra `GroupConversationScreen`. |
| `BackToGroupHome` | Back header mobile | Ripristina home gruppo. |
| `RefreshGroupHome` | Callback post-broadcast | `GroupHomeController.reload()` dopo messaggio inviato. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `GroupHomeLoaded` | Conteggi, autori, tile pronti; `isLoading = false`. |
| `GroupHomeLoadFailed` | Errore fetch; `error` valorizzato. |
| `GroupMessagesLoaded` | Storico pronto. |
| `GroupMessagesLoadFailed` | Errore load storico. |
| `BroadcastStarted` | `isSending = true`. |
| `BroadcastAcknowledged` | RPC ok; `load()` + callback home. |
| `BroadcastFailed` | Eccezione RPC/upload; `error` valorizzato. |
| `OwnerRealtimeReceived` | INSERT/UPDATE su archivio gruppo — merge o append + sort. |
| `AuthorNamesEnriched` | `fetchSummariesByIds` completato per etichette autore. |

---

## Stati UI

### `GroupHomeController`

| Stato | Condizione |
|-------|------------|
| `Loading` | `isLoading == true` |
| `Ready` | `isLoading == false`, `error == null` |
| `Error` | `error != null` |

### `GroupMessagesController`

| Stato | Condizione |
|-------|------------|
| `Loading` | `isLoading == true` |
| `Ready` | `isLoading == false`, `isSending == false` |
| `Sending` | `isSending == true` (broadcast in corso) |
| `Error` | `error != null` |
| `RealtimeAttached` | `_channel != null` |

---

## Backend (riferimento worker)

| Comando RPC | Evento worker | Effetto |
|-------------|---------------|---------|
| `send_message_to_profile` (dest = gruppo) | `deliver` → `deliver_internal` | INSERT storico gruppo + `erogate_group_message` |
| `broadcast_message_to_allowlist` | `group_erogate` → `group_erogate` | Fan-out allow list da riga archivio gruppo |

Dettaglio sequenze: contesto **delivery** e [SYS-GROUP](../../specs/promises/system/SYS-GROUP.md).

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Account gruppo, allow list, erogazione | SYS-GROUP |
| Outbox `group_erogate`, worker | SYS-DELIVERY |
| Shell senza inbox, autore in bolla | SURF-GROUP-*, PROM-GROUP-AUTHOR-DISPLAY |
