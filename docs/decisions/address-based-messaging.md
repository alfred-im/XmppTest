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
| **Messaggi** | Unica fonte di verità; inviati e ricevuti |
| **Inbox** | Vista sullo storico raggruppato per controparte; **solo se esiste almeno un messaggio** |
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
- Primo messaggio inviato → thread creato sul server → compare in inbox
- Messaggio ricevuto da chiunque → thread in inbox **senza** essere in rubrica
- «Non in rubrica» **≠** «sconosciuto» (dinamica legacy XMPP da non replicare)
- Rubrica: scorciatoie personali; si rifinisce in futuro, non nel flusso di invio

### ❌ Vietato

- Passare da `contact_id` / rubrica come prerequisito per scrivere (account interni)
- Creare record conversazione / partecipanti **prima** del primo messaggio
- Mostrare in inbox thread senza messaggi
- Trattare la rubrica come gate di autorizzazione o classificazione «sconosciuti»

---

## Modello tecnico (implementazione)

### Inbox (`list_conversations`)

Restituisce solo conversazioni con `last_message_at IS NOT NULL` (storico messaggi reale).

### Apertura chat (bozza)

1. Client risolve indirizzo interno → `profile_id` + nome visualizzato
2. Indirizzo esterno → errore `unsupported` (fase attuale)
3. UI chat senza `conversation_id` finché l’utente non invia

### Primo invio

1. RPC `get_or_create_direct_conversation(profile_id)` — **solo al primo messaggio**
2. RPC `send_message` — inserisce il messaggio
3. Trigger aggiorna preview / unread; inbox si aggiorna via realtime

### Thread DB (`conversations`)

Resta tabella di raggruppamento **tecnico** (partecipanti, realtime, unread, protocollo recapito).  
**Non** è un oggetto utente da «aprire» prima dei messaggi; nasce con il primo messaggio.

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
- Migrazione: `supabase/migrations/20260627200000_address_based_messaging.sql`
- Client: `ComposeTarget`, `ComposeAddress`, `MessagesController` (bozza + primo invio)
- Architettura: `docs/architecture/alpha-full-stack.md` § messaggistica
