# Glossario — contesto groups

**Bounded context:** `groups`  
**Ultima revisione:** 2026-07-18  
**Promesse SDD:** [SYS-GROUP](../../specs/promises/system/SYS-GROUP.md), [SYS-DELIVERY](../../specs/promises/system/SYS-DELIVERY.md)

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **Group account** | Profilo Alfred con `profile_kind = group`; identità `@username` come qualsiasi account (`ProfileSummary.isGroup`). |
| **Participation** | Consenso bidirezionale su `reception_allowlist`: gruppo consente persona **e** persona consente gruppo — nessuna tabella membership. |
| **Group archive** | Storico unico: righe `messages` con `owner_id = gruppo`, ordinate per `created_at`. |
| **Group shell** | Layout client senza inbox: `GroupHomePanel` + singola `GroupConversationScreen` (no `InboxPanel`). |
| **Broadcast** | Invio dal gruppo verso tutti i partecipanti allow list via RPC `broadcast_message_to_allowlist`; una riga archivio gruppo + fan-out worker. |
| **Erogazione (erogate)** | Worker `alfred_delivery.erogate_group_message` inserisce copie proxy su archivi partecipanti dopo recapito al gruppo o broadcast. |
| **original_author_id** | Chi ha scritto il contenuto; valorizzato in tutti i flussi gruppo (umano o gruppo stesso in broadcast). |
| **author_id** | Mittente tecnico della riga: umano su storico gruppo; **gruppo** su copie erogate verso partecipanti. |
| **GroupActiveAuthor** | Riepilogo home: profilo + conteggio messaggi per autore umano nello storico (escluso il gruppo stesso). |
| **Conversation tile** | Unica voce «chat» in home gruppo: preview ultimo messaggio dello storico (`ChatPeer` derivato da archivio owner). |
| **Human → group** | Utente invia a gruppo con `send_message_to_profile`; stessa pipeline mailbox + outbox `deliver`. |
| **Group → allow list** | Broadcast o erogazione automatica post-recapito; outbox `group_erogate` o branch gruppo in `deliver_internal`. |
| **Author labels** | UI: `showAuthorLabels: true` in `AnchoredMessageList` — header autore da `original_author_id` / `author_display.dart`. |
| **fetchOwnerMessages** | RPC `list_owner_messages` — caricamento storico gruppo (non `list_inbox`). |
| **subscribeToOwnerMessages** | Realtime su `messages` filtrato `owner_id = gruppo` (insert + update). |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **messaging** | Chat umano→gruppo usa `MessagesController` con `peerIsGroup`; stesso RPC send, UI autore in bolla. |
| **delivery** | Recapito archivio gruppo, `delivered_at` mittente umano, erogazione fan-out — worker `alfred_delivery`. |
| **reception** | Gate bidirezionale allow list prima di INSERT storico gruppo o copia erogata. |
| **navigation** | `openGroupChat` / `backToGroupHome` in shell gruppo (`AccountViewState.groupChatOpen`). |
| **multi-account** | Account gruppo nel manifest con `profileKind: group`; focus come qualsiasi sessione. |
| **media** | Broadcast media: upload `MessageMediaService` poi RPC broadcast con `content_type` e `media_url`. |

---

## Invarianti

1. Account gruppo **non** espone inbox multi-peer — una sola conversazione (storico owner).
2. Broadcast richiede almeno un destinatario in allow list del gruppo (escluso il gruppo stesso).
3. `isSending` serializza broadcast nella stessa sessione gruppo (no coda outbound persistente come messaging 1:1).
4. Dopo broadcast riuscito: `load()` ricarica storico — nessuna bolla optimistic client-side.
5. Spunte messaggio originale umano→gruppo: solo fino a recapito al gruppo (`delivered_at`); erogazione verso terzi non le modifica.
6. Rimozione da allow list blocca solo recapiti **nuovi**; messaggi già in archivio restano.
