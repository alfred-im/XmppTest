# MSG-SEND — Invio messaggi

| Campo | Valore |
|-------|--------|
| **Spec ID** | `MSG-SEND` |
| **Layer** | capability |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-03 |
| **ADR** | [address-based-messaging.md](../../decisions/address-based-messaging.md), [server-as-reception.md](../../decisions/server-as-reception.md) |
| **PR** | #115 (GIF), #126 (voice), #153 (location), #122 (delivered) |
| **Supersedes** | `implementation/voice-notes.md`, `implementation/location-sharing.md` (evidenza) |

Documento per AI — contratto invio unificato: un solo RPC, tipi contenuto, coda retry client.

---

## 1. Problema / obiettivo

L’utente invia messaggi a un account Alfred per `recipient_profile_id` (risolto da indirizzo). Il server è l’unico punto di invio; il client gestisce UI optimistic, upload media e retry.

---

## 2. Requisiti

### MUST

| ID | Requisito |
|----|-----------|
| **MSG-SEND-REQ-001** | Unico punto invio server: RPC `send_message_to_profile` — [contracts/rpc.md](../contracts/rpc.md) |
| **MSG-SEND-REQ-002** | Idempotenza client: `client_message_id` (UUID v4) su ogni invio |
| **MSG-SEND-REQ-003** | Tipi `content_type` su `main`: `text`, `gif`, `voice`, `location` |
| **MSG-SEND-REQ-004** | Upload media (GIF, voice) in bucket `chat-media` sotto `{auth.uid()}/{uuid}.*` prima dell’RPC |
| **MSG-SEND-REQ-005** | Coda retry `OutboundMessageQueue` per testo, GIF, voice, location |
| **MSG-SEND-REQ-006** | Stati post-invio: vedi [MSG-READ](./MSG-READ.spec.md) (`sent` → `delivered` → `read`) |

### SHOULD

| ID | Requisito |
|----|-----------|
| **MSG-SEND-REQ-007** | UI optimistic: merge bolle su `client_message_id` |
| **MSG-SEND-REQ-008** | Preview inbox coerente con tipo (`format_*_preview` / trigger) |

### MUST NOT

| ID | Requisito |
|----|-----------|
| **MSG-SEND-REQ-009** | RPC `send_message` legacy o overload ambigui PostgREST |
| **MSG-SEND-REQ-010** | Invio a sé stessi (`recipient_profile_id = auth.uid()`) |
| **MSG-SEND-REQ-011** | Testo vuoto con `content_type=text` |
| **MSG-SEND-REQ-012** | GIF/voice senza `media_url`; voice senza `duration_seconds` + `media_mime` |
| **MSG-SEND-REQ-013** | Location senza coordinate in range valido |
| **MSG-SEND-REQ-014** | Indirizzo esterno `username@server` senza errore utente chiaro (Alpha) |

---

## 3. Fuori scope

- Federazione / outbox consumer (bridge stub).
- Signed URL media (Alpha: URL pubblico bucket).
- Posizione live, reverse geocoding.
- Eliminazione messaggi.

---

## 4. Contratto

### 4.1 Tipi contenuto

| `content_type` | Campi obbligatori | Storage | Preview inbox |
|----------------|-------------------|---------|---------------|
| `text` | `body` non vuoto | — | testo troncato |
| `gif` | `media_url` | `chat-media`, max 10 MB | `[GIF]` |
| `voice` | `media_url`, `duration_seconds` > 0, `media_mime` | `{userId}/{uuid}.webm`, max 15 MB | `🎤 m:ss` |
| `location` | `latitude` [-90,90], `longitude` [-180,180] | Postgres only | `📍 Posizione` |

Schema colonne: [contracts/schema.md](../contracts/schema.md) § `messages`.

### 4.2 Client

| Area | File / componente |
|------|-------------------|
| Invio testo | `MessagesController.sendText` |
| GIF | `MessageMediaService.uploadGif` |
| Voice | `VoiceRecordingService`, `uploadVoice` |
| Location | `LocationService` → `sendLocation` |
| Coda | `OutboundMessageQueue`, `OutboundMediaCache` (web) |

### 4.3 UX invio (voice / location)

**Voice**: microfono se campo vuoto; hold-to-record; rilascio invia (≥1s).  
**Location**: anteprima obbligatoria prima dell’invio.

---

## 5. Tracciabilità

| REQ-ID | Verifica |
|--------|----------|
| MSG-SEND-REQ-001 | `supabase/tests/send_message_to_profile_smoke.sql`, `schema_smoke.sql` (overload unico) |
| MSG-SEND-REQ-002 | `messages_controller_multi_account_test.dart` (coda per `userId\|peer`) |
| MSG-SEND-REQ-003 | `models_and_utils_test.dart` — parse `gif` / `voice` / `location` |
| MSG-SEND-REQ-005 | `messages_controller_multi_account_test.dart` (`OutboundMessageQueue`) |
| MSG-SEND-REQ-006 | `MSG-READ.spec.md`; `message_bubble_test.dart` (checkmarks) |
| MSG-SEND-REQ-009 | `schema_smoke.sql` — assenza overload ambigui |
| MSG-SEND-REQ-011–013 | validazione RPC in `20260702120100_message_location_support.sql` |
| MSG-SEND-REQ-014 | `ComposeService.resolveAddress` → `StateError` esterno |
| MSG-SEND-REQ-003 (UI) | `message_bubble_test.dart` — gif, voice, location render |

Gate: `cd client && bash scripts/verify.sh` · Integrazione: `bash scripts/test.sh integration`

---

## 6. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [voice-notes.md](../../implementation/voice-notes.md) | Evidenza voice |
| [location-sharing.md](../../implementation/location-sharing.md) | Evidenza location |
| [MSG-INBOX](./MSG-INBOX.spec.md) | Inbox dopo invio |

**Codice**: `client/lib/providers/messages_controller.dart`, `services/message_service.dart`, `services/outbound_message_queue.dart`
