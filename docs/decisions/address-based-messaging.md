# Messaggistica per indirizzo (username / username@server)

**Data**: 2026-06-27  
**Status**: ✅ Accettata — **regola vincolante**  
**Categoria**: Chat, inbox, rubrica, client, piattaforma  
**Correlata**: [no-internal-external-chat-distinction.md](./no-internal-external-chat-distinction.md), [server-as-reception.md](./server-as-reception.md)

---

## Regola

**Si scrive a un indirizzo. La rubrica non abilita né blocca la messaggistica.**

| Concetto | Ruolo |
|----------|--------|
| **Indirizzo** | Destinatario del messaggio: `username` (Alfred) o `username@server` (esterno) |
| **Messaggi** | Unica fonte di verità; inviati e ricevuti con `sender_id` + destinatario |
| **Inbox** | Vista sullo storico raggruppato per controparte (`inbox_threads`); **solo se esiste almeno un messaggio** |
| **Rubrica (`contacts`)** | Strumento personale opzionale; **isolata** dalle dinamiche di chat |

### Indirizzamento

| Tipo | Formato | Esempio | Stato Alpha |
|------|---------|---------|-------------|
| Alfred interno | `username` | `mario_rossi` | ✅ Supportato |
| Esterno federato | `username@server` | `mario@dominio.it` | ⏸ `unsupported` fino ai bridge |
| Matrix | `@user:server` o normalizzato | — | Da definire (doppio formato o sanitizzazione) |

Validazione stretta dei formati: **non urgente**. Fase attuale: username Alfred + forma email-like per esterni.

---

## Cosa significa

### ✅ Corretto

- FAB / nuova chat: inserisci indirizzo → **bozza** (nessuna riga inbox, nessun contatto obbligatorio)
- Primo messaggio inviato → thread inbox creato sul server → compare in inbox
- Messaggio ricevuto da chiunque → thread in inbox **senza** essere in rubrica
- «Non in rubrica» **≠** «sconosciuto» (dinamica legacy XMPP da non replicare)
- Rubrica: scorciatoie personali; si rifinisce in futuro, non nel flusso di invio

### ❌ Vietato

- Passare da `contact_id` / rubrica come prerequisito per scrivere (account interni)
- Creare record conversazione / partecipanti **prima** del primo messaggio
- Esporre al client RPC tipo `get_or_create_*_conversation`
- Mostrare in inbox thread senza messaggi
- Trattare la rubrica come gate di autorizzazione o classificazione «sconosciuti»

---

## Modello tecnico (implementazione)

### Nessuna «conversazione»

Le tabelle `conversations` e `conversation_participants` **non esistono**.  
Il dominio è:

| Entità | Ruolo |
|--------|--------|
| `messages` | Fonte di verità: `sender_id`, `recipient_profile_id` (interno) o `recipient_external_address` (federato) |
| `inbox_threads` | Metadati inbox per utente (preview, unread, last_message_at) — **nasce col primo messaggio** via trigger |

### Inbox (`list_inbox`)

Solo thread con `last_message_at IS NOT NULL`.

### Apertura chat (bozza)

1. Client risolve indirizzo interno → `profile_id` + nome visualizzato
2. Indirizzo esterno → errore `unsupported` (fase attuale)
3. UI chat senza `thread_id` finché l’utente non invia

### Invio

1. RPC `send_message_to_profile(recipient_profile_id, …)` — **unico punto di invio** (testo, GIF, voice)
2. Trigger `on_message_inserted` crea/aggiorna `inbox_threads` per mittente e destinatario
3. Inbox si aggiorna via realtime su `inbox_threads`

### Lettura thread

- `list_thread_messages(thread_id)` — storico messaggi con la controparte
- `mark_thread_read(thread_id)` — unread + spunte lettura

### Rubrica

Modulo separato. Il pulsante «Scrivi» da contatti apre una **bozza** per indirizzo/profile, non crea thread né richiede contatto per messaggi interni futuri.

---

## Ambito escluso (fase corrente)

- Chat di gruppo (in arrivo)
- Federazione attiva (`username@server` oltre al parsing)
- Validazione domini / Matrix canonico

---

## Riferimenti codice

- ADR: questo file
- Migrazioni: `20260627200000_address_based_messaging.sql`, `20260627210000_message_centric_messaging.sql`
- Client: `ComposeTarget`, `InboxThread`, `InboxController`, `MessagesController` (bozza + `send_message_to_profile`)
- Architettura: `docs/architecture/alpha-full-stack.md` § messaggistica
