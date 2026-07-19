# Comandi ed eventi — contesto media

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/media/](../../model/uml/media/)  
**Guida:** [docs/guides/media.md](../../guides/media.md)

---

## Comandi (UI → MessagesController)

| Comando | Emesso da | Pipeline |
|---------|-----------|----------|
| `RecordVoiceStart` | Long-press mic | `VoiceRecordingService.start` |
| `RecordVoiceStop` | Release mic (≥1 s) | Stop → bytes → `sendVoice` |
| `RecordVoiceLock` | Swipe ↑ | Fase locked — mani libere |
| `RecordVoiceCancel` | Swipe ← / discard | Annulla senza send |
| `SendVoice` | Stop / conferma preview | persist → optimistic → upload → RPC |
| `PickImage` | Menu allegati | Galleria o fotocamera → `sendImage` |
| `SendImage` | Conferma caption | cache preview → normalize → upload → RPC |
| `PickVideo` | Menu allegati | File picker → `sendVideoFromPicker` |
| `SendVideo` | Dopo lettura byte | probe durata → upload → RPC |
| `SendGif` | Picker GIF | upload → RPC (via `_sendOptimistic`) |
| `PickLocation` | Tap pin | `LocationService` → anteprima mappa |
| `RefineLocation` | GPS in preview | Aggiorna coordinate fino a soglia accuratezza |
| `SendLocation` | Conferma invio | RPC senza upload |
| `UploadMedia` | Interno retry/send | `MessageMediaService.upload*` → public URL |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `VoiceRecordingStarted` | `_VoicePhase.recording` |
| `VoiceRecordingLocked` | `_VoicePhase.locked` |
| `VoicePreviewReady` | Bytes e durata disponibili in preview |
| `VoiceRecordingCancelled` | Ritorno a idle senza messaggio |
| `ImageFormatRejected` | Magic bytes non JPEG/PNG/WebP/HEIC |
| `ImageNormalized` | HEIC convertito; path coda aggiornato |
| `MediaCached` | `OutboundMediaCache.put(clientId, bytes)` |
| `MediaPersisted` | File disco o web base64 sotto soglia |
| `MediaUploaded` | URL pubblico da `chat-media` bucket |
| `MediaUploadFailed` | Eccezione size/MIME/rete — bolla `failed` |
| `LocationPreviewShown` | Coordinate arrotondate in anteprima OSM |
| `LocationSent` | RPC `content_type=location` ack |

---

## Servizi

| Servizio | Metodi |
|----------|--------|
| `MessageMediaService` | `uploadGif`, `uploadImage`, `uploadVoice`, `uploadVideo` |
| `VoiceRecordingService` | Registrazione WebM/Opus (web nativo; IO FFmpeg) |
| `LocationService` | Permessi + posizione corrente |
| `OutboundMessageQueue` | `persistMediaBytes`, `readMediaBytes`, `deleteMediaFile` |

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Foto/video limiti e HEIC | PROM-CHAT-MEDIA-001, 001b |
| Coda image/video | PROM-CHAT-MEDIA-007, PROM-OUTBOUND-SEND |
| Voice hold-to-send | SURF-CHAT (UX documentata in media.md) |
