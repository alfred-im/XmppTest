# Voice notes (WebM/Opus)

**Stato**: implementato client Flutter + migrazione Supabase `20260627120000_message_voice_support.sql`

## Contratto canonico

| Campo | Valore |
|-------|--------|
| `content_type` | `voice` |
| `media_mime` | `audio/webm` (Opus) |
| `media_url` | public URL bucket `chat-media` |
| `duration_seconds` | intero > 0 |
| `media_size_bytes` | opzionale, tetto 15 MB lato bucket |

Estensione file storage: `.webm` sotto `{userId}/{uuid}.webm`.

## Client Flutter

- Registrazione: `VoiceRecordingService` (`record`)
- Web: output WebM/Opus nativo (MediaRecorder)
- IO (Android/iOS/desktop): registrazione AAC temporanea → transcode FFmpeg → WebM/Opus (`voice_encoding_io.dart`)
- Invio: `MessagesController.sendVoice` → upload → RPC `send_message` (8 argomenti)
- UI input: `ChatInputBar` — tieni premuto invia; ↑ blocca; ↓ annulla; bloccato → stop → anteprima → invia/cestino
- UI bolla: `VoiceMessageContent` — play/pausa, waveform, durata (`just_audio`)
- Preview inbox: trigger `format_voice_preview` → `🎤 m:ss`
- Coda retry: `OutboundMessageQueue` (SharedPreferences + file/cache media) per testo, GIF e voice; retry periodico + tap «Riprova invio»

## Supabase

- Enum `message_content_type` + valore `voice`
- `send_message` overload 8 parametri; overload 5 arg delega
- `on_message_inserted`: preview voice + outbox payload con `duration_seconds`, `media_mime`, `media_size_bytes`
- `mark_conversation_read`: include `content_type = voice`
- Bucket `chat-media`: MIME `image/gif`, `audio/webm`; limite 15 MB

## Bridge (futuro)

Outbox payload già include metadati voice. Il bridge scarica il blob WebM e adatta a Matrix/XMPP senza cambiare schema messaggi.
