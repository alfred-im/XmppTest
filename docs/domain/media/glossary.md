# Glossario — contesto media

**Bounded context:** `media` (sotto-contesto di messaging per allegati chat)  
**Ultima revisione:** 2026-07-18  
**Promesse SDD:** [PROM-CHAT-MEDIA](../../specs/promises/product/PROM-CHAT-MEDIA.md), [PROM-OUTBOUND-SEND](../../specs/promises/product/PROM-OUTBOUND-SEND.md)

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **chat-media bucket** | Storage Supabase; path `{userId}/{uuid}.{ext}`; URL pubblico post-upload. |
| **MessageMediaService** | Upload binario con limiti byte e MIME canonici. |
| **OutboundMediaCache** | Cache RAM `clientId → bytes` per preview `pending://` prima dell'upload. |
| **prepareImageForUpload** | Normalizza HEIC/HEIF → JPEG; sniff magic bytes. |
| **VoiceConfig** | `audio/webm`, max 600 s, max 15 MB, estensione `.webm`. |
| **ChatMediaConfig** | Image max 10 MB; video max 50 MB; web persist ≤ 4 MB. |
| **LocationConfig** | Coordinate a 5 decimali; tile OSM; nessun bucket. |
| **VoicePhase** | UI `ChatInputBar`: idle → recording → locked → preview. |
| **LocationPhase** | UI pin: idle → refining → preview conferma. |
| **localMediaPath** | Path disco o `memory://clientId` (web) per retry coda. |
| **media_url pending** | Placeholder `pending://{clientId}` fino a URL pubblico server. |

---

## Tipi contenuto

| `content_type` | Upload | Campi obbligatori RPC |
|----------------|--------|------------------------|
| `gif` | Sì | `media_url` |
| `image` | Sì | `media_url`, `media_mime`, `media_size_bytes`; `body` opzionale |
| `video` | Sì | `media_url`, `media_mime`, `duration_seconds`, `media_size_bytes` |
| `voice` | Sì | `media_url`, `media_mime`, `duration_seconds`, `media_size_bytes` |
| `location` | No | `latitude`, `longitude` |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **messaging** | Dopo upload, `MessageService.send*ToProfile` persiste riga mailbox. |
| **messaging** | Coda retry legge `localMediaPath` e ri-invoca upload + send. |

---

## Invarianti

1. Upload sempre prima di RPC send (tranne location).
2. Dimensione verificata client-side prima di `storage.uploadBinary`.
3. Web: blob > 4 MB non in SharedPreferences — solo `OutboundMediaCache` + `memory://`.
4. Voice: durata minima 1 s; registrazione < 1 s annullata in UI.
5. Image: formato sconosciuto → errore UI senza enqueue.
