# Specifica tecnica — Modello caselle (inbox/outbox) e flusso unificato

**Data**: 2026-06-26  
**Status**: 📋 **Proposta** — non implementata; **schema attuale su `main`** (PR #130): solo `messages` + `profiles`, inbox = `list_inbox()` on-read — vedi [messages-only-inbox.md](../implementation/messages-only-inbox.md). §2.1 sotto descrive uno stato intermedio superato.
**Categoria**: Architettura messaggistica, schema dominio, pipeline consegna  
**Audience**: AI / implementazione futura  
**Correlata**: [server-as-reception.md](../decisions/server-as-reception.md), [bridge-stateless.md](../decisions/bridge-stateless.md), [alpha-full-stack.md](./alpha-full-stack.md), [project-revolution-discovery.md](../decisions/project-revolution-discovery.md)

---

## 1. Origine e contesto della decisione

Questa specifica deriva da una sessione di design (2026-06-26) sulla domanda iniziale: *conviene duplicare la cronologia chat tra account interni Alfred per omogeneità con il modello interno↔esterno?*

Nel corso della discussione sono emersi chiarimenti progressivi:

| Iterazione | Chiarimento |
|------------|-------------|
| 1 | L'analogia **non** è il client legacy XMPP di Alfred (IndexedDB per JID), ma il modello **federato con due account su due server**. |
| 2 | Avere **due tipi di conversazione** (interna vs federata) con pipeline diverse **complica il codice**; l'obiettivo è **un solo flusso**. |
| 3 | Il flusso unificato si ottiene con un **"bridge verso l'interno"**: anche i messaggi verso utenti Alfred sulla stessa istanza passano da **outbox → consegna**, come quelli verso l'esterno. |
| 4 | **Non** serve un'entità `conversation` / `dialogue` condivisa che leghi le due parti. Nella mia inbox ho messaggi che scambio con un account; se elimino la chat, la elimino **solo dal mio lato**. |
| 5 | I messaggi **non hanno `direction` (in/out)**. Hanno solo **chi li ha scritti** (`author_id`). Lo schema `in/out` non scala ai **gruppi**. |
| 6 | Alfred **non è un homeserver** (XMPP/Matrix). È una **piattaforma centralizzata** per istanza, con database e consegna propri. |
| 7 | Il modello inbox/outbox **non prevede allineamento tra le due caselle**. Analogia: **email**. È un fraintendimento duraturo da eliminare dalla progettazione. |
| 8 | Se il modello **non** fosse così, si finirebbe inevitabilmente per **dividere funzionalità** tra conversazioni federate e interne — esattamente ciò che si vuole evitare. |
| 9 | La chat Alpha **funziona oggi**; l'implementazione richiede migrazione incrementale e reversibile, non big bang. |

---

## 2. Problema da risolvere

### 2.1 Stato attuale (Alpha, `main`)

- Tabella `conversations` **condivisa** tra partecipanti, con campo `protocol` (`internal` | `xmpp` | `matrix`).
- Tabella `messages` **condivisa** per `conversation_id`; un messaggio = **una riga** visibile a tutti i partecipanti (filtrata da RLS).
- Trigger `on_message_inserted` **biforca**:
  - `internal` → promozione immediata a `delivered` sulla stessa riga;
  - `xmpp` / `matrix` → `pending` + insert in `outbox`.
- Client Flutter legge `messages` per `conversation_id`; subscribe Realtime su `messages-{conversationId}`.
- RPC `get_or_create_direct_conversation` **deduplica** una conversazione condivisa per coppia di profili interni.
- Federazione (bridge) **non implementata**; schema `outbox`, `sync_cursors`, `bridge_jobs` esiste per il percorso federato.

### 2.2 Perché il modello attuale non basta (obiettivo futuro)

1. **Biforcazione logica** `internal` vs federato in trigger, RPC e potenzialmente client.
2. **Conversazione condivisa** come entità centrale: non riflette il modello email/federato (elimina solo dal mio lato, peer esterno fuori piattaforma).
3. **Thread condiviso** non è il fondamento giusto per gruppi con N autori senza introdurre eccezioni.
4. Ogni feature futura (bridge, gruppi, delete locale) rischia di essere implementata **due volte**.

### 2.3 Vincolo non negoziabile

> **Un solo meccanismo di messaggistica per tutti i peer e tutti i protocolli.**  
> La differenza `internal` / `xmpp` / `matrix` è **solo routing del driver di consegna** in fondo alla pila — invisibile al client e alla maggior parte delle RPC applicative.

---

## 3. Principi di design

### 3.1 Analogia primaria: email

| Concetto email | Equivalente Alfred |
|----------------|-------------------|
| La mia casella verso `bob@example.com` | `mailbox_thread` (owner = io, peer = Bob) |
| Messaggio in posta inviata | Messaggio nella **mia** casella con `author_id = io` |
| Messaggio in inbox di Bob | Messaggio nella **casella di Bob** verso di me, con `author_id = io` |
| Bob non è sul mio server mail | Peer esterno: solo **la mia** casella esiste su Alfred |
| Elimino thread locale | Sparisce solo per me; Bob conserva il suo |
| Ordine messaggi nella mia casella | Ordinamento **locale** (`created_at` nella mia casella) |
| Ordine nella casella di Bob | **Indipendente**; non va allineato alla mia |
| Read receipt | **Segnale puntuale** sul messaggio, non sincronizzazione tra due caselle |

### 3.2 Cosa NON è questo modello

| Affermazione errata | Realtà |
|---------------------|--------|
| «Due conversazioni collegate» | **Uno scambio**, due caselle **indipendenti**. Nessun link obbligatorio tra metadati delle due caselle. |
| «Allineare le due inbox» | **Esplicitamente escluso.** Fraintendimento da non portare avanti. |
| «Duplicazione per fingere due server» | Duplicazione = **materializzazione nella casella del destinatario** al momento della consegna, non simulazione di infrastruttura. |
| «Alfred è un homeserver» | Alfred è **piattaforma per istanza** (Postgres + servizi). I bridge espongono facciata federata **verso l'esterno**. |
| «Campo `direction` in/out» | **Vietato.** Solo `author_id`. «Mio» vs «suo» = `author_id == auth.uid()` in UI. |
| «Conversazione come entità condivisa» | **Non prevista.** Solo caselle per `owner_id`. |
| «Ordine globale unico del thread» | **Non richiesto.** Ogni casella ordina i propri messaggi. |

### 3.3 Alfred è piattaforma, non homeserver

- Un'**istanza** Alfred = un dominio, un Supabase, daemon bridge **per istanza** (D-037).
- Gli utenti Alfred sulla **stessa istanza** condividono la stessa piattaforma ma **non** condividono la stessa casella messaggi.
- La duplicazione messaggi sulla stessa istanza è scelta di **modello caselle**, non replica di vincolo di rete tra server distinti.
- Per peer **esterni**, la cronologia dell'altro lato **non risiede** su Alfred: asimmetria strutturale già accettata (come email verso dominio esterno).

---

## 4. Modello concettuale

### 4.1 Entità fondamentali

```
┌─────────────────────────────────────────────────────────────┐
│  Utente Mario (profile_id = M)                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  mailbox_thread: owner=M, peer=Paolo                 │    │
│  │  ├─ message: author=M, body="Ciao", logical_id=λ1   │    │
│  │  └─ message: author=P, body="Ehi",  logical_id=λ2   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Utente Paolo (profile_id = P)                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  mailbox_thread: owner=P, peer=Mario                 │    │
│  │  ├─ message: author=M, body="Ciao", logical_id=λ1   │    │
│  │  └─ message: author=P, body="Ehi",  logical_id=λ2   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

        Nessun record "conversation" condiviso tra M e P.
        λ1 e λ2 correlano consegna/spunte; NON sincronizzano le caselle.
```

### 4.2 Flusso unico (tutti i protocolli)

```
Client mittente
    │
    ▼
RPC send_message
    │
    ├─► INSERT mailbox_message (owner=mittente, author=mittente, status=sent)
    │
    └─► INSERT outbox (from, to, protocol, logical_message_id, payload)
            │
            ▼
        deliver_outbox (driver selezionato da protocol)
            │
            ├─ internal  → handler piattaforma (stessa istanza, sincrono o job locale)
            ├─ xmpp      → bridge XMPP (futuro)
            ├─ matrix    → bridge Matrix (futuro)
            └─ alfred_remote (futuro) → federazione tra istanze Alfred
            │
            ▼
        Materializzazione nella casella del destinatario (se esiste su piattaforma)
            │
            ▼
        Aggiornamento stato sulla copia del mittente (es. delivered)
            │
            ▼
        Realtime → client mittente e destinatario (ciascuno sulla propria casella)
```

**Regola:** anche `protocol = internal` **passa sempre da outbox**. Nessun insert diretto nella casella altrui senza passare dal contratto outbox.

### 4.3 `logical_message_id`

- UUID generato al momento dell'invio; **stesso valore** sulla copia del mittente e sulla copia del destinatario (quando questa esiste).
- **Scopo ammesso:**
  - idempotenza della **consegna** (non inserire due volte nella casella destinatario per lo stesso invio);
  - correlazione **segnali** spunta/lettura (notifica puntuale al mittente);
  - riferimento per eventuali ack bridge.
- **Scopo esplicitamente NON ammesso:**
  - mantenere allineate preview, ordine, contenuto o lifecycle delle due caselle;
  - definire un'entità "conversazione condivisa";
  - propagare delete/edit automaticamente all'altra casella (salvo policy esplicita futura, fuori scope di questa spec).

---

## 5. Schema dati (target)

### 5.1 `mailbox_threads`

Casella dell'utente verso un peer (contatto diretto, profilo interno, o gruppo).

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | `uuid` PK | Identificatore **del thread nella mia casella** |
| `owner_id` | `uuid` FK `profiles` | Sempre `auth.uid()` per RPC utente |
| `peer_kind` | `enum` | `profile` \| `contact` \| `group` |
| `peer_profile_id` | `uuid` nullable | Se peer = utente Alfred noto |
| `peer_contact_id` | `uuid` nullable | Se peer = riga `contacts` (interno o esterno) |
| `peer_group_id` | `uuid` nullable | Futuro: gruppo |
| `protocol` | `contact_protocol` | `internal` \| `xmpp` \| `matrix` — **solo routing** |
| `last_message_at` | `timestamptz` | Derivato da messaggi **in questa casella** |
| `last_message_preview` | `text` | Derivato da messaggi **in questa casella** |
| `last_message_author_id` | `uuid` nullable | Autore dell'ultimo messaggio **in questa casella** |
| `unread_count` | `integer` | Conteggio **nella mia casella** |
| `archived_at` | `timestamptz` nullable | Archivio locale |
| `deleted_at` | `timestamptz` nullable | Eliminazione **solo mio lato** (soft delete) |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Vincoli:**

- Unicità: `(owner_id, peer_kind, coalesce(peer_profile_id, peer_contact_id, peer_group_id))` per thread attivo (con gestione delete).
- **Nessuna** FK verso il `mailbox_thread` dell'altro utente.
- `protocol` deriva dal contatto/peer al momento della creazione; non guida biforcazioni applicative.

### 5.2 `mailbox_messages`

Messaggi **nella casella di un utente**. Ogni riga appartiene a **un solo** `owner_id`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | `uuid` PK | Id riga **in questa casella** |
| `logical_message_id` | `uuid` NOT NULL | Id logico evento (stesso su copie diverse) |
| `thread_id` | `uuid` FK `mailbox_threads` | Casella di appartenenza |
| `owner_id` | `uuid` FK `profiles` | Ridondanza per RLS e query; = `mailbox_threads.owner_id` |
| `author_id` | `uuid` FK `profiles` | **Chi ha scritto** il messaggio |
| `body` | `text` | Può essere vuoto per GIF |
| `content_type` | `message_content_type` | `text` \| `gif` |
| `media_url` | `text` nullable | |
| `client_message_id` | `text` nullable | Idempotenza lato client (UUID v4) |
| `delivery_status` | `message_delivery_status` | Stato **su questa copia** |
| `marker_type` | `text` nullable | `receipt` \| `displayed` — futuro bridge |
| `marker_for` | `uuid` nullable | `logical_message_id` target |
| `external_id` | `text` nullable | Id su sistema esterno (bridge) |
| `created_at` | `timestamptz` | Timestamp **in questa casella** |
| `updated_at` | `timestamptz` | |

**Vincoli:**

- **NO** colonna `direction`.
- Unicità: `(owner_id, thread_id, client_message_id)` dove `client_message_id` non null.
- Unicità consegna: `(owner_id, thread_id, logical_message_id)` — il destinatario non riceve due copie per lo stesso invio.
- `author_id` può essere ≠ `owner_id` (messaggio ricevuto da altri nella mia casella).

**Semantica `delivery_status` per copia:**

| Copia | Stati tipici |
|-------|----------------|
| Mittente (`author_id = owner_id`) | `sent` → `delivered` (peer ha ricevuto nella sua casella o ack bridge) → `read` (peer ha letto) |
| Destinatario (`author_id ≠ owner_id`) | `delivered` all'insert → `read` quando io apro il thread |

Allineato a [server-as-reception.md](../decisions/server-as-reception.md): consegnato = nella fonte di verità rilevante, **non** sul device.

### 5.3 `outbox` (evoluzione tabella esistente)

Estensione del modello `outbox` attuale per essere **l'unico** punto di uscita.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | `uuid` PK | |
| `logical_message_id` | `uuid` | |
| `from_profile_id` | `uuid` | Mittente |
| `to_profile_id` | `uuid` nullable | Destinatario interno stessa istanza |
| `to_contact_id` | `uuid` nullable | Se destinazione via contatto esterno |
| `to_external_address` | `text` nullable | JID / Matrix ID se noto |
| `sender_mailbox_message_id` | `uuid` | FK copia mittente |
| `protocol` | `contact_protocol` | Driver |
| `payload` | `jsonb` | body, content_type, media_url, author_id, client_message_id, … |
| `status` | `queue_status` | `queued` \| `processing` \| `delivered` \| `failed` |
| `attempts` | `integer` | |
| `locked_by` | `text` nullable | |
| `locked_at` | `timestamptz` nullable | |
| `last_error` | `text` nullable | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Regola:** ogni `send_message` crea **sempre** una riga outbox, incluso `protocol = internal`.

### 5.4 Tabelle deprecate (dopo migrazione completa)

| Tabella attuale | Destino |
|-----------------|---------|
| `conversations` | Deprecata — sostituita da `mailbox_threads` per owner |
| `conversation_participants` | Deprecata — stato unread/last_read su `mailbox_threads` |
| `messages` (modello condiviso) | Deprecata — sostituita da `mailbox_messages` |

`contacts`, `profiles`, `message_read_receipts` (o equivalente), `sync_cursors`, `bridge_jobs` restano o vengono adattati.

---

## 6. Driver di consegna

### 6.1 Contratto comune `deliver_outbox(outbox_row)`

Ogni driver implementa:

1. Legge payload e destinatario.
2. **Idempotente:** se esiste già `mailbox_message` con `(owner_id=dest, logical_message_id)`, skip insert.
3. Materializza messaggio nella casella del destinatario (`author_id` = mittente originale).
4. Aggiorna `delivery_status` sulla copia del mittente.
5. Aggiorna `mailbox_threads` (preview, unread) **solo per le caselle toccate**.
6. Marca outbox `delivered` o `failed`.
7. Emette eventi Realtime appropriati.

### 6.2 Driver `internal` (bridge verso l'interno)

- Esecuzione: **funzione PL/pgSQL** o job in-process sulla piattaforma — **non** richiede demone Python separato.
- Può completare **nella stessa transazione** di `send_message` (latenza trascurabile).
- Azioni:
  - Trova o crea `mailbox_thread` del destinatario verso il mittente.
  - Insert `mailbox_message` nella casella destinatario.
  - Promuove copia mittente a `delivered`.
- **Non** crea link tra i due `mailbox_thread`.
- **Non** verifica né allinea ordine/preview tra le due caselle.

### 6.3 Driver `xmpp` / `matrix` (futuro)

- Bridge stateless (D-051) consuma outbox via `service_role`.
- Materializza **solo** la casella lato utente Alfred (mittente in uscita; eventuale risposta in ingresso quando il bridge riceve).
- Cronologia del peer esterno vive **fuori** da Alfred.
- Ack bridge aggiornano `delivery_status` sulla **copia del mittente** — segnale, non sync caselle.

### 6.4 Driver `alfred_remote` (futuro, fuori scope Alpha)

- Federazione tra **due istanze** Alfred.
- Ogni istanza materializza solo le caselle dei propri utenti.
- Stesso contratto outbox; transport HTTP/API tra piattaforme.

---

## 7. Operazioni applicative (RPC)

### 7.1 `get_or_create_mailbox_thread`

**Input:** `p_peer_contact_id uuid` oppure `p_peer_profile_id uuid`

**Comportamento:**

1. Risolve peer e `protocol` da `contacts` o profilo.
2. Cerca `mailbox_threads` con `owner_id = auth.uid()` e peer corrispondente.
3. Se assente, crea **solo** il thread del chiamante.
4. **Non** crea il thread del peer (nasce alla prima consegna verso di lui).
5. Ritorna `thread_id`.

### 7.2 `list_mailbox_threads`

Sostituisce `list_conversations`.

**Output per riga:** `thread_id`, `display_name`, `last_message_preview`, `last_message_at`, `unread_count`, `peer_*` — **tutti derivati dalla casella del chiamante**.

**Nessun join** con la casella del peer.

### 7.3 `list_mailbox_messages`

**Input:** `p_thread_id uuid`, `p_limit`, `p_before` (paginazione)

**Filtro:** `owner_id = auth.uid()` AND `thread_id = p_thread_id` AND `deleted_at IS NULL`

**Ordine:** `created_at ASC` (o `DESC` con reverse in client)

### 7.4 `send_message`

**Input:** `p_thread_id`, `p_body`, `p_client_message_id`, `p_content_type`, `p_media_url`

**Comportamento:**

1. Valida thread appartiene a `auth.uid()`.
2. Genera `logical_message_id = gen_random_uuid()`.
3. Insert copia mittente in `mailbox_messages` (`author_id = auth.uid()`, `delivery_status = sent`).
4. Insert `outbox`.
5. Chiama `deliver_outbox` (sync se internal).
6. Aggiorna preview/unread sul thread mittente.
7. Ritorna la **copia mittente** aggiornata.

**Idempotenza client:** stesso `(thread_id, client_message_id)` → ritorna messaggio esistente senza doppio outbox.

### 7.5 `mark_thread_read`

**Input:** `p_thread_id`

**Comportamento:**

1. Azzera `unread_count` sul **mio** thread.
2. Marca messaggi **in questa casella** con `author_id <> auth.uid()` come letti localmente.
3. Emette **segnale** verso la copia del mittente (update `delivery_status = read` sulla **sua** riga con stesso `logical_message_id`) — **non** modifica altri campi della casella mittente.

### 7.6 `delete_mailbox_thread` / `archive_mailbox_thread`

**Solo lato chiamante:**

- Soft delete: `deleted_at` sul thread; opzionalmente nasconde messaggi associati **nella mia casella**.
- **Nessuna** operazione sulla casella del peer.
- Se il peer scrive di nuovo, si può creare un **nuovo** thread o riattivare policy esplicita (da definire in implementazione).

### 7.7 `search_profiles`, gestione contatti

Invariata rispetto ad Alpha; `get_or_create_conversation_from_contact` diventa wrapper verso `get_or_create_mailbox_thread`.

---

## 8. Gruppi (futuro)

- `peer_kind = group`; `peer_group_id` punta a entità gruppo (tabella futura).
- **Una casella per membro** verso il gruppo: ogni membro ha la propria cronologia.
- Messaggi con `author_id` tra N partecipanti; **nessun** `direction`.
- Invio al gruppo:
  1. Insert nella **mia** casella gruppo (`author_id = io`).
  2. Outbox con destinatari = tutti i membri (o outbox singola con fan-out nel driver).
  3. Driver materializza nella casella di ciascun membro **senza** allineamento tra caselle.
- Costo storage: **O(membri × messaggi)** — accettato per design (non ottimizzare in questa spec).

---

## 9. Realtime

### 9.1 Canali

| Canale | Evento | Scopo |
|--------|--------|-------|
| `mailbox-threads-{userId}` | INSERT/UPDATE su `mailbox_threads` dove `owner_id = userId` | Inbox |
| `mailbox-messages-{userId}` | INSERT/UPDATE su `mailbox_messages` dove `owner_id = userId` | Chat attiva + aggiornamento spunte su copia mittente |

**Non** esiste canale condiviso per "conversation_id".

### 9.2 Client Flutter

- Subscribe per `auth.uid()` corrente (cambia su switch account).
- `MessageService.fetchMessages` → `list_mailbox_messages`.
- Optimistic UI: insert locale con `client_message_id`; reconcile con risposta `send_message`.
- **Nessun** branch `protocol == internal` in UI o invio.

---

## 10. RLS (linee guida)

- `mailbox_threads`: `owner_id = auth.uid()` per SELECT/UPDATE/DELETE.
- `mailbox_messages`: `owner_id = auth.uid()` per SELECT; INSERT solo tramite RPC `SECURITY DEFINER`.
- `outbox`: deny totale a `authenticated` (come oggi); bridge con `service_role`.
- Driver internal: `SECURITY DEFINER` con validazione partecipazione.

---

## 11. Multi-account (Thunderbird)

- Ogni account Alfred = sessione Supabase distinta (`setSession`).
- Caselle **sempre** filtrate per `auth.uid()` della sessione attiva.
- Stesso codice client; cambia solo utente autenticato.
- Refresh token in `SharedPreferences` (Alpha attuale; encryption post-Alpha).

---

## 12. Mappatura dal modello attuale

| Concetto attuale | Nuovo modello | Note |
|------------------|---------------|------|
| `conversations` | `mailbox_threads` per owner | Da condiviso a per-utente |
| `conversation_participants` | Campi su `mailbox_threads` | unread, last_read |
| `messages` | `mailbox_messages` | Da 1 riga condivisa a 1+ righe per evento |
| `messages.sender_id` | `mailbox_messages.author_id` | Già concettualmente allineato |
| `send_message` → insert `messages` | `send_message` → copia mittente + outbox | |
| `on_message_inserted` biforcato | `deliver_outbox` unico | |
| outbox solo xmpp/matrix | outbox **sempre** | Estensione, non rottura del contratto federato |
| `list_conversations` | `list_mailbox_threads` | |
| Realtime `messages-{conversationId}` | `mailbox-messages-{userId}` + filtro thread | |
| `get_or_create_direct_conversation` dedup coppia | `get_or_create_mailbox_thread` solo per me | |

### 12.1 Cosa è già vero oggi (riuso)

- `outbox` con `status`, `attempts`, `locked_by` — **già: federato**
- `sync_cursors`, `bridge_jobs` — **già: federato**
- `messages.sender_id` (autore, non direction) — **già: modello attuale**
- `delivery_status` enum — **già: parziale** (percorsi diversi internal/federato)
- Asimmetria peer esterno (solo casella Alfred) — **già: federato**
- Multi-account switch sessione — **già: parziale** (non caselle)
- Concept [server-as-reception](../decisions/server-as-reception.md) — **già: parziale**

---

## 13. Strategia di migrazione (senza rompere chat Alpha)

### 13.1 Principi

- Il flusso attuale resta **produzione** finché il nuovo non è validato.
- Fasi **piccole e reversibili**.
- Branch dedicato; merge solo dopo prova esplicita.
- Test: `schema_smoke.sql`, `flutter test`, e2e inbox.

### 13.2 Fasi

| Fase | Azione | Rischio |
|------|--------|---------|
| A | Creare `mailbox_threads`, `mailbox_messages` vuote + RPC lettura | Zero |
| B | **Doppia scrittura** su send: vecchio `messages` + nuovo modello | Basso |
| C | Job backfill storico → caselle | Medio |
| D | Flag dev: UI legge nuovo modello, confronto shadow | Zero prod |
| E | Switch lettura client al nuovo modello | Medio, rollback facile |
| F | Switch invio solo nuovo modello | Medio |
| G | Deprecare `conversations` / `messages` condivisi | Solo quando stabile |

### 13.3 Criteri di accettazione migrazione

- Invio testo e GIF 1:1 interno.
- Ricezione Realtime destinatario.
- Spunte sent / delivered / read su copia mittente.
- Switch multi-account senza bleed tra caselle.
- `list_mailbox_threads` equivalente a inbox attuale.
- Delete thread solo lato chiamante verificato.
- Outbox internal processata in transazione; nessun messaggio duplicato su retry (idempotenza `logical_message_id`).

---

## 14. Vantaggi e svantaggi (da analisi comparativa)

### 14.1 Vantaggi

*Architettura / codice*

- Un solo flusso invio → outbox → consegna
- Niente biforcazione `internal` / federato nel client
- Niente biforcazione `internal` / federato nelle RPC principali
- Outbox come contratto unico per tutti i driver — **già: federato**
- Base pronta per bridge — **già: federato**

*Funzionalità*

- Caselle indipendenti (modello email)
- Nessun allineamento obbligatorio tra caselle
- Eliminazione solo dal proprio lato — **già: federato** (lato esterno fuori piattaforma)
- Modello 1:1, gruppi, federazione con stessa forma messaggio (`author_id`) — **già: parziale**
- Nessuna entità conversazione condivisa
- Multi-account = logica casella per sessione — **già: parziale**
- Spunte come segnali puntuali, non sync caselle — **già: parziale**
- Coerenza peer non su piattaforma — **già: federato**

### 14.2 Svantaggi

*Costo di refactoring*

- Migrazione dal modello attuale
- Rischio regressione chat funzionante
- Query e RPC da riscrivere — **già: modello attuale**
- Periodo doppia scrittura / convivenza schemi
- Inbox da rifare — **già: modello attuale**
- Test da estendere — **già: modello attuale**

*Funzionalità*

- Idempotenza e retry sulla **consegna** outbox — **già: federato**
- Realtime per casella — **già: modello attuale** (da adattare)
- Esterni asimmetrici — **già: federato**
- Spunte/lettura come notifiche puntuali — **già: parziale**

*Costi piattaforma*

- Più righe DB per evento (copia mittente + copia destinatario su stessa istanza)
- Storage moltiplicato nei gruppi
- Thread condiviso sostituito da N caselle — **già: modello attuale** (una riga condivisa oggi)

---

## 15. Contropunti registrati (per decisioni future)

### 15.1 Contro il rinvio del refactor

Rimandare può cementare il biforcamento `internal`/esterno mentre si aggiungono bridge e gruppi; il refactor costa di più con più dati e codice. **Nota:** l'orizzonte temporale integrazione bridge **non è noto**; il peso del refactor va calibrato sul calendario reale, non su assunzioni.

### 15.2 Contro il refactor stesso

Complessità nuova (N copie, migrazione fragile); si può unificare il **percorso logico** (interno in outbox) mantenendo thread condiviso finché il bridge non impone il contrario.

### 15.3 Contro la soluzione caselle (rivista, senza homeserver)

Duplicazione su stesso Postgres senza vincolo di rete; si perde query semplice su stanza unica. Un flusso unico **senza** N archivi materializzati resta alternativa per piattaforma centralizzata.

**Risposta del design:** la materializzazione per casella è **deliberata** per evitare due tipi di conversazione e allineare gruppi/federazione/email — non per replicare un homeserver.

---

## 16. ADR e vincoli esistenti rispettati

| ADR | Come si applica |
|-----|-----------------|
| D-008 | Client parla solo con Supabase |
| D-031 | Web online-only; caselle su piattaforma, no IndexedDB |
| D-034 | Protocollo invisibile in UI |
| D-051 | Stato in piattaforma; bridge stateless |
| server-as-reception | `delivery_status` su **copia**; consegnato = nella fonte di verità |
| D-036 | Account Alfred ≠ contatti |
| D-037 | Daemon per istanza |

---

## 17. Fuori scope (esplicito)

- Implementazione bridge XMPP/Matrix
- Federazione tra istanze Alfred
- Gruppi (schema `groups` non definito qui)
- Edit messaggio, delete globale, reazioni
- Cache offline nativa
- Encryption at rest refresh token multi-account
- Allineamento ordine/contenuto/preview tra caselle di utenti diversi

---

## 18. Glossario

| Termine | Significato |
|---------|-------------|
| **Casella** | Insieme di messaggi di un utente verso un peer, `owner_id` fisso |
| **Thread** | Sinonomo di riga `mailbox_threads` |
| **Peer** | Contatto, profilo o gruppo con cui scambio messaggi |
| **Copia** | Riga `mailbox_messages` appartenente a un `owner_id` |
| **Consegna** | Transizione outbox → materializzazione in casella destinatario (se esiste) |
| **Segnale** | Aggiornamento puntuale (es. `read` sul mittente); non sync casella |
| **Driver** | Implementazione consegna per `protocol` |
| **Bridge interno** | Driver `internal` sulla piattaforma, non demone Python |

---

## 19. Stato implementazione

| Componente | Stato |
|------------|-------|
| Schema `mailbox_*` | ❌ Non implementato |
| `send_message` unificato | ❌ |
| Driver internal | ❌ |
| Migrazione dati | ❌ |
| Client Flutter | ❌ Usa ancora `conversations` + `messages` |
| Bridge federato | ❌ Stub |

**Chat Alpha interna attuale: funzionante — non modificare senza piano migrazione §13.**

---

*Documento generato da sessione design 2026-06-26. Aggiornare questo file e `PROJECT_MAP.md` al momento dell'implementazione.*
