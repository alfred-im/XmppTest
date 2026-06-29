# Proposta — modello caselle (direzione)

**Ultima revisione**: 2026-06-28  
**Status**: 🟡 **Direzione confermata** — da implementare su dev; **non** ancora su `main`  
**Audience**: AI / implementazione

**Su `main` oggi** vale ancora [address-based-messaging.md](../decisions/address-based-messaging.md). Questo file descrive il **target** concordato; all’implementazione **sostituisce** quell’ADR.

---

## Delta rispetto a oggi

| | Oggi (`main`) | Target caselle |
|--|---------------|----------------|
| **Archivio** | 1 riga `messages` condivisa tra i due peer | Un archivio per owner: io ho i miei messaggi in/out, tu i tuoi |
| **Inbox** | Query live su `messages` (`list_inbox()`) | Lista derivata dal **mio** archivio |
| **Identità chat** | `(io, peer_profile_id)` | `(io, indirizzo peer)` — `username` o `username@server` |

Tutto il resto (UI, realtime, spunte, tipi messaggio, rubrica) si deduce dall’Alpha attuale salvo quanto sotto.

---

## Identità chat (vincolante)

**Non serve altro** oltre a:

1. **Il mio account** (`auth.uid()` / sessione corrente)
2. **L’altro account** come indirizzo: `username` (Alfred) oppure `username@server` (esterno)

Niente `thread_id` lato client. Niente entità «casella verso Paolo» esposta come id separato: è **ottimizzazione interna** al server (indici, cache, raggruppamento). Il client continua come oggi: indirizzo → chat.

«In/out» in UI = messaggi nel **mio** archivio dove `author_id` è me (uscita) o l’altro (entrata). Nessuna colonna `direction` nel DB.

---

## Principi confermati

1. **Nessuna conversazione condivisa** — due archivi indipendenti (analogia email).
2. **Nessun allineamento obbligatorio** tra il mio archivio e quello del peer.
3. **Solo `author_id`** — niente `direction` in schema.
4. **Il mio archivio alimenta la mia interfaccia** — casella = dove vivono i messaggi dell’owner, non cache su tabella condivisa.

## Fuori scope (per ora)

- Delete chat locale
- Gruppi
- Preservazione dati in migrazione (solo DB dev; niente prod)

## Delegato all’implementazione

- Correlazione tra le due copie dello stesso invio (es. `logical_message_id` + `client_message_id`) — scegliere al momento, non vincolare il design concettuale.

## Aperto

- **Outbox sempre anche per internal** (principio «un solo flusso» con XMPP/Matrix): **non confermato**. Motivazione originale: un solo percorso codice quando arrivano i bridge. Non è obbligatorio per avere due archivi per owner; si decide in implementazione se internal consegue direttamente o passa da outbox.

---

## Migrazione

Quando si implementa: **migra e basta** — DB solo dev, niente produzione da preservare. Niente doppia scrittura obbligatoria.

---

## Storico

- 2026-06-26: idea da sessione design (cronologia per owner, omogeneità col federato).
- 2026-06-27: su `main` implementato message-centric (PR #130) — percorso diverso, temporaneo.
- 2026-06-28: direzione caselle confermata; specifica lunga sostituita da questa nota; Q&A utente su identità e scope.

---

## Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [address-based-messaging.md](../decisions/address-based-messaging.md) | Modello **attuale** su `main` (da sostituire) |
| [messages-only-inbox.md](../implementation/messages-only-inbox.md) | Implementazione attuale |
| [alpha-full-stack.md](./alpha-full-stack.md) | Flussi Alpha da riusare |
| [server-as-reception.md](../decisions/server-as-reception.md) | Spunte |
| [bridge-stateless.md](../decisions/bridge-stateless.md) | Outbox / bridge (se/un quando) |
