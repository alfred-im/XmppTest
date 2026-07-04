# Contratto schema — dominio Alpha (message-centric)

**Ultima revisione**: 2026-07-03  
**Status**: `implemented` (allineato a `main`, migrazioni fino a `20260702120100`)  
**Fonte di verità**: `supabase/migrations/`

Contratto **tabelle ed enum** usati dalle capability spec. Per RPC: [rpc.md](./rpc.md). Per capability: [index.md](../index.md).

---

## Diagramma relazioni (su `main`)

```
auth.users 1──1 profiles
profiles 1──* contacts (owner_id)
profiles *──* messages (sender_id / recipient_profile_id)
messages 1──* message_read_receipts
messages 0..1 outbox (federato)
profiles 1──* sync_cursors (peer_profile_id)
bridge_jobs (coda bridge)
storage: chat-media, avatars
```

**Inbox**: nessuna tabella dedicata — derivata da `messages` via `list_inbox()`.

---

## Enum

| Tipo | Valori | Uso |
|------|--------|-----|
| `contact_protocol` | `internal`, `xmpp`, `matrix` | Routing backend; invisibile in UI inbox |
| `message_content_type` | `text`, `gif`, `voice`, `location` | Tipo contenuto messaggio |
| `message_delivery_status` | `pending`, `sent`, `delivered`, `read`, `failed` | Spunte + stati outbox |
| `queue_status` | `queued`, … `failed` | `outbox`, `bridge_jobs` |

---

## `profiles`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | uuid PK | = `auth.users.id` |
| `username` | text | `^[a-z0-9_]{3,32}$`, unique lower |
| `display_name` | text | Obbligatorio |
| `bio` | text | Opzionale |
| `avatar_url` | text | URL bucket `avatars` |
| `pronouns` | text | Opzionale (#134) |
| `created_at`, `updated_at` | timestamptz | |

**RLS**: SELECT authenticated; UPDATE solo `id = auth.uid()`.

**Spec**: [PROFILE.spec.md](../capabilities/PROFILE.spec.md).

---

## `contacts`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | uuid PK | |
| `owner_id` | uuid FK → profiles | |
| `protocol` | contact_protocol | |
| `linked_profile_id` | uuid FK nullable | Obbligatorio se `internal` |
| `external_address` | text nullable | Obbligatorio se xmpp/matrix |
| `display_name` | text | |
| `avatar_url` | text nullable | Snapshot opzionale |

**CHECK**: internal ↔ profile; federato ↔ external_address.

**RLS**: CRUD `owner_id = auth.uid()`.

**Spec**: [CONTACTS.spec.md](../capabilities/CONTACTS.spec.md).

---

## `messages`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | uuid PK | |
| `sender_id` | uuid FK → profiles | |
| `recipient_profile_id` | uuid FK nullable | Peer Alfred interno |
| `recipient_external_address` | text nullable | Federato futuro |
| `protocol` | contact_protocol | Default `internal` |
| `body` | text | Può essere vuoto per media |
| `delivery_status` | message_delivery_status | |
| `client_message_id` | text nullable | Idempotenza client |
| `content_type` | message_content_type | Default `text` |
| `media_url` | text nullable | GIF, voice |
| `duration_seconds` | integer nullable | voice |
| `media_mime` | text nullable | voice |
| `media_size_bytes` | bigint nullable | voice |
| `latitude`, `longitude` | double nullable | location |
| `external_id` | text nullable | Bridge federato |
| `marker_type`, `marker_for` | text/uuid nullable | Receipt federato futuro |
| `created_at` | timestamptz | |

**Indici**: `(sender_id, recipient_profile_id, created_at)`, `(recipient_profile_id, sender_id, created_at)`.

**RLS**: SELECT/INSERT se mittente o destinatario = `auth.uid()`.

**Spec**: [MSG-SEND](../capabilities/MSG-SEND.spec.md), [MSG-INBOX](../capabilities/MSG-INBOX.spec.md), [MSG-READ](../capabilities/MSG-READ.spec.md).

---

## `message_read_receipts`

| Colonna | Tipo | Note |
|---------|------|------|
| `message_id` | uuid FK | |
| `profile_id` | uuid FK | Lettore |
| `status` | message_delivery_status | `delivered` o `read` |

**Spec**: [MSG-READ.spec.md](../capabilities/MSG-READ.spec.md).

---

## `outbox`

Coda invio federato — bridge consumer futuro. Popolata da trigger `on_message_inserted` per `protocol` xmpp/matrix.

**RLS**: DENY per `authenticated`.

---

## `sync_cursors`, `bridge_jobs`

Stato piattaforma bridge (ADR D-051). `sync_cursors.peer_profile_id` sostituisce `inbox_thread_id` storico.

**RLS**: DENY per `authenticated`.

---

## Storage buckets

| Bucket | Uso | Limite | Path pattern |
|--------|-----|--------|--------------|
| `chat-media` | GIF, voice | 10 MB gif / 15 MB webm | `{auth.uid()}/{uuid}.*` |
| `avatars` | Foto profilo | 2 MB | `{auth.uid()}/avatar.{ext}` |

Pubblici in Alpha (URL diretti in Realtime).

---

## Oggetti rimossi (non devono esistere)

| Oggetto | Rimosso in |
|---------|------------|
| `inbox_threads` | `20260627230000_messages_only_inbox.sql` |
| `conversations`, `conversation_participants` | message-centric refactor |

Verifica: `supabase/tests/schema_smoke.sql`.

---

## Migrazioni

Elenco completo: [alpha-pr-registry.md](../../architecture/alpha-pr-registry.md) § migrazioni.

---

## Target mailbox (`approved` — non su `main`)

**Spec**: [MAILBOX-CORE](../capabilities/MAILBOX-CORE.spec.md), [MAILBOX-SEND](../capabilities/MAILBOX-SEND.spec.md), [MAILBOX-INBOX](../capabilities/MAILBOX-INBOX.spec.md), [MAILBOX-READ](../capabilities/MAILBOX-READ.spec.md)  
**Status contratto**: `approved` — sostituisce sezione `messages` message-centric al merge.

### Diagramma (target)

```
auth.users 1──1 profiles
profiles 1──* messages (owner_id = archivio; author_id = autore contenuto)
messages *── peer profiles (peer_profile_id denormalizzato)
messages 0..1 outbox (sempre, anche internal)
profiles 1──* sync_cursors
bridge_jobs
storage: chat-media, avatars
```

**Rimosso**: `message_read_receipts`, enum `message_delivery_status` su `messages`.

### `messages` (ricreato)

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | uuid PK | Per owner |
| `owner_id` | uuid FK → profiles | Archivio (`auth.uid()` in RLS) |
| `author_id` | uuid FK → profiles | Autore originale |
| `peer_profile_id` | uuid FK nullable | Controparte internal |
| `peer_external_address` | text nullable | Federato futuro |
| `logical_message_id` | uuid NOT NULL | λ — correlazione copie |
| `client_message_id` | text nullable | Solo copia mittente |
| `protocol` | contact_protocol | Routing recapito |
| `body` | text | |
| `content_type` | message_content_type | |
| `media_url` | text nullable | Condiviso tra copie |
| `duration_seconds`, `media_mime`, `media_size_bytes` | | voice |
| `latitude`, `longitude` | double nullable | location |
| `delivered_at` | timestamptz nullable | Solo righe uscita (author = owner) |
| `read_at` | timestamptz nullable | Uscita: spunta lettura; entrata: lettura locale |
| `failed_at` | timestamptz nullable | Invio/outbox fallito (mittente) |
| `external_id` | text nullable | Bridge fase B |
| `created_at` | timestamptz | |

**UNIQUE**: `(owner_id, client_message_id)` WHERE `client_message_id IS NOT NULL`; `(owner_id, logical_message_id)`.

**RLS**: `owner_id = auth.uid()` per SELECT/INSERT/UPDATE.

### `outbox` (esteso)

Popolata per **ogni** invio (internal + federato). FK `message_id` → copia **mittente**. Consumer internal: transazione RPC; federato: fase B bridge.

### Migrazione prototipo

Drop message-centric → ricrea → purge `chat-media` orfani (non referenziati da `messages.media_url`).
