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
| **Consegna** | Internal: insert diretto + `delivered`; federato: outbox | **Outbox sempre** (anche internal), poi materializzazione nell’archivio del destinatario — un solo tipo di pipeline |
| **Inbox** | Query live su `messages` (`list_inbox()`) | Lista derivata dal **mio** archivio |
| **Identità chat** | `(io, peer_profile_id)` | `(io, indirizzo peer)` — `username` o `username@server` |

Tutto il resto (UI, realtime, spunte, tipi messaggio, rubrica) si deduce dall’Alpha attuale salvo quanto sotto.

---

## Media (GIF, voice) — file condiviso

Il flusso client resta quello Alpha: **un upload** nel bucket `chat-media` → **un** `media_url` → metadati sul messaggio.

Con il modello caselle le **copie d’archivio** (mittente e destinatario) puntano allo **stesso blob** — il file **non** si duplica in storage.

| Aspetto | Conseguenza |
|---------|-------------|
| **Riferimento** | Più righe archivio possono condividere lo stesso `media_url` |
| **Garbage collection** | Prima di cancellare da `chat-media`: verificare se altre copie referenziano ancora l’URL |
| **Delete / retry** | Blob orfano se upload ok ma consegna fallita; link rotto se mittente cancella file mentre il peer ha ancora il messaggio |

Trattare i media come **risorsa condivisa con refcount logico** — strategia GC da definire prima di delete messaggi/casella (fuori scope Alpha).

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
5. **Outbox sempre** — anche internal passa da outbox; internal / xmpp / matrix differiscono solo nel driver di consegna in fondo. Un solo flusso invio → outbox → archivio destinatario.
6. **Spunte = segnali puntuali** — aggiornano solo la copia del mittente tramite id di correlazione; **non** sincronizzano né modificano l’archivio del peer (modello federato).

## Spunte — segnali, non sync archivi (vincolante)

Nel federato **non esiste** una riga condivisa tra mittente e destinatario. Ogni lato ha il proprio archivio; le spunte si risolvono con **messaggi/segnali separati** che **referenziano** il messaggio originale per id — non aggiornando la copia altrui.

Alfred caselle usa lo **stesso modello** anche tra due utenti sulla stessa istanza (internal).

### Correlazione

| Ruolo | Internal Alfred | Federato (riferimento protocollo) |
|-------|-----------------|-----------------------------------|
| Id che lega le due copie | `logical_message_id` | XMPP: `id` stanza · Matrix: `event_id` · Bridge: `external_id` |
| Copia mittente | Riga nel **mio** archivio (`author_id = io`) | Archivio uscita lato Alfred |
| Copia destinatario | Riga nel **suo** archivio (`author_id = mittente`) | Archivio ingresso / server esterno |

`client_message_id` resta per idempotenza **lato mittente** (retry client); è distinto da `logical_message_id`.

### Tre livelli (semantica [server-as-reception](../decisions/server-as-reception.md))

| Livello | UI | Significato | Internal | Federato |
|---------|-----|-------------|----------|----------|
| Inviato | ✓ | Accettato da piattaforma / in outbox | Copia mittente `sent` | Outbox `queued` |
| Consegnato | ✓✓ grigie | Nella fonte di verità del destinatario | Dopo materializzazione copia destinatario → **segnale** `delivered` sulla copia mittente | XEP-0184 `received@id` o ack bridge → stesso aggiornamento sulla copia mittente Alfred |
| Letto | ✓✓ blu | Destinatario ha visualizzato | `mark_peer_read` sul **proprio** archivio → **segnale** `read` sulla copia mittente (stesso `logical_message_id`) | XEP-0333 `displayed@id` o Matrix `m.receipt` → bridge aggiorna copia mittente |

**Non** significa «arrivato sul device» in senso P2P: significa «nella fonte di verità rilevante» (server / piattaforma).

### Regole

- Il segnale aggiorna **solo** `delivery_status` (o equivalente) sulla **copia del mittente** identificata da `logical_message_id` (+ `owner_id` mittente).
- **Mai** modificare l’archivio del peer per far vedere le spunte al mittente.
- **Mai** allineare preview, ordine o contenuto tra le due copie come effetto delle spunte.
- Realtime mittente: subscribe agli UPDATE sulla **propria** copia (`owner_id = io`).
- I marker non vanno «all’indietro» (segnale su id più vecchio dello stato locale → ignorare).

### Flusso internal (sintesi)

```
Invio → copia mittente (sent, λ) → outbox → copia destinatario (λ)
                              → segnale delivered su copia mittente

Paolo apre chat → mark_peer_read sul SUO archivio
               → segnale read sulla copia Mario WHERE logical_message_id = λ
```

### Flusso federato (sintesi)

```
Alfred → outbox → bridge → server esterno del peer
              → copia mittente su Alfred

Peer legge su client esterno → XEP-0333 / m.receipt
                            → bridge → UPDATE copia mittente Alfred (via external_id / λ)
```

Il bridge è **stateless** ([bridge-stateless.md](../decisions/bridge-stateless.md)): traduce il segnale protocollo in update piattaforma, non tiene stato spunte in RAM.

## Fuori scope (per ora)

- Delete chat locale
- Gruppi
- Preservazione dati in migrazione (solo DB dev; niente prod)

## Delegato all’implementazione

- Dettaglio schema (`marker_type` / `marker_for` vs solo `delivery_status`), nomi RPC e transazioni dei driver — al momento del codice.

---

## Migrazione

Quando si implementa: **migra e basta** — DB solo dev, niente produzione da preservare. Niente doppia scrittura obbligatoria.

---

## Storico

- 2026-06-26: idea da sessione design (cronologia per owner, omogeneità col federato).
- 2026-06-27: su `main` implementato message-centric (PR #130) — percorso diverso, temporaneo.
- 2026-06-28: direzione caselle confermata; Q&A identità, outbox sempre, media condivisi/GC, **spunte = segnali** (modello XMPP/Matrix) confermato.

---

## Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [address-based-messaging.md](../decisions/address-based-messaging.md) | Modello **attuale** su `main` (da sostituire) |
| [messages-only-inbox.md](../implementation/messages-only-inbox.md) | Implementazione attuale |
| [alpha-full-stack.md](./alpha-full-stack.md) | Flussi Alpha da riusare |
| [server-as-reception.md](../decisions/server-as-reception.md) | Spunte |
| [bridge-stateless.md](../decisions/bridge-stateless.md) | Outbox / bridge (se/un quando) |
