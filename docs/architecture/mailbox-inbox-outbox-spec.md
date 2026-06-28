# Specifica tecnica — Modello caselle (inbox/outbox) e flusso unificato

**Data originale**: 2026-06-26  
**Ultima revisione**: 2026-06-28  
**Status**: 📋 **Proposta futura** — non implementata; **non** è il modello su `main`  
**Categoria**: Architettura messaggistica, schema dominio, pipeline consegna  
**Audience**: AI / implementazione futura  

**Modello attuale su `main`**: message-centric — `messages` + `profiles`, inbox = `list_inbox()` on-read. Vedi [address-based-messaging.md](../decisions/address-based-messaging.md) (ADR vincolante) e [messages-only-inbox.md](../implementation/messages-only-inbox.md) (PR #130).

**Correlata**: [server-as-reception.md](../decisions/server-as-reception.md), [bridge-stateless.md](../decisions/bridge-stateless.md), [alpha-full-stack.md](./alpha-full-stack.md), [project-revolution-discovery.md](../decisions/project-revolution-discovery.md)

> Se questa proposta venisse adottata, **sostituirebbe** l'ADR [address-based-messaging.md](../decisions/address-based-messaging.md) — non lo estende. Sono due paradigmi di archiviazione diversi.

---

## 1. Origine e contesto della decisione

Questa specifica deriva da una sessione di design (2026-06-26) sulla domanda iniziale: *conviene duplicare la cronologia chat tra account interni Alfred per omogeneità con il modello interno↔esterno?*

Nel corso della discussione sono emersi chiarimenti progressivi:

| Iterazione | Chiarimento |
|------------|-------------|
| 1 | L'analogia è il modello **federato con due account su due server**, non un client offline locale. |
| 2 | Avere **due tipi di conversazione** (interna vs federata) con pipeline diverse **complica il codice**; l'obiettivo è **un solo flusso**. |
| 3 | Il flusso unificato si ottiene con un **"bridge verso l'interno"**: anche i messaggi verso utenti Alfred sulla stessa istanza passano da **outbox → consegna**, come quelli verso l'esterno. |
| 4 | **Non** serve un'entità `conversation` / `dialogue` condivisa che leghi le due parti. Nella mia inbox ho messaggi che scambio con un account; se elimino la chat, la elimino **solo dal mio lato**. |
| 5 | I messaggi **non hanno `direction` (in/out)**. Hanno solo **chi li ha scritti** (`author_id`). Lo schema `in/out` non scala ai **gruppi**. |
| 6 | Alfred **non è un homeserver** (XMPP/Matrix). È una **piattaforma centralizzata** per istanza, con database e consegna propri. |
| 7 | Il modello inbox/outbox **non prevede allineamento tra le due caselle**. Analogia: **email**. È un fraintendimento duraturo da eliminare dalla progettazione. |
| 8 | Se il modello **non** fosse così, si finirebbe inevitabilmente per **dividere funzionalità** tra conversazioni federate e interne — esattamente ciò che si vuole evitare. |
| 9 | La chat Alpha **funziona oggi**; l'implementazione richiede migrazione incrementale e reversibile, non big bang. |

**Nota cronologica**: il giorno dopo (2026-06-27) è stato implementato su `main` il modello message-centric (PR #130), diverso da questa proposta. Il documento resta valido come **evoluzione opzionale futura**, non come piano attivo.

---

## 2. Problema da risolvere

### 2.1 Stato attuale su `main` (baseline migrazione)

Schema **message-centric** — una riga `messages` per evento, condivisa tra mittente e destinatario:

| Area | Implementazione |
|------|-----------------|
| **Messaggi** | `messages`: `sender_id` + `recipient_profile_id`; testo, GIF, voice (`content_type`, `media_url`, …) |
| **Profili** | `profiles`: `username`, display name, avatar, pronomi |
| **Inbox** | RPC `list_inbox()` — aggregazione **on-read** su `messages` (preview, unread, ordine per `peer_profile_id`) |
| **Chat** | `list_peer_messages(peer_profile_id)`, `send_message_to_profile`, `mark_peer_read` |
| **Assenti** | `conversations`, `inbox_threads`, `conversation_participants` — già eliminate |
| **Federazione** | `outbox` + `sync_cursors` + `bridge_jobs`; bridge stub (solo health) |
| **Consegna** | Trigger `on_message_inserted`: internal → `delivered` diretto; xmpp/matrix → outbox |
| **Client** | `InboxController`, `ChatPeer` (`profileId`), `MessagesController`; realtime su `messages` |
| **UX inbox** | Ricerca on-demand (PR #132); avatar/pronomi peer in `list_inbox()` |

Riferimenti: [messages-only-inbox.md](../implementation/messages-only-inbox.md), [address-based-messaging.md](../decisions/address-based-messaging.md), [alpha-full-stack.md](./alpha-full-stack.md) §2.5, §3.5.

### 2.2 Perché il modello attuale potrebbe non bastare (obiettivo futuro)

1. **Biforcazione logica** `internal` vs federato in trigger, RPC e potenzialmente client.
2. **Riga messaggio condivisa** tra i due peer: non permette delete locale, ordini indipendenti, né il modello email/federato completo.
3. **Aggregazione on-read** per inbox: sufficiente per Alpha; può non scalare per delete locale, archivio, gruppi.
4. Ogni feature futura (bridge, gruppi, delete solo dal proprio lato) rischia codice **duplicato** o eccezioni se il flusso resta biforcato.

### 2.3 Vincolo non negoziabile (della proposta)

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

### 3.2 Archiviazione per casella (non «metadati duplicati»)

In questo modello **`mailbox_messages` è dove vivono i messaggi** — archivio per utente.  
**`mailbox_threads` è la struttura dell'archivio** verso un peer (contenitore + header denormalizzato per performance: preview, unread).

Non è il pattern dell'ex `inbox_threads` (cache di aggregati sopra un `messages` condiviso). Qui la fonte di verità **è la casella**, non una tabella centralizzata con derivati accanto.

| Affermazione errata | Realtà |
|---------------------|--------|
| «Sono metadati inbox duplicati da `messages`» | Sono **archivi distinti per owner**; ogni casella è autonoma |
| «Due conversazioni collegate» | **Uno scambio**, due caselle **indipendenti**. Nessun link obbligatorio tra le due |
| «Allineare le due inbox» | **Esplicitamente escluso** |
| «Duplicazione per fingere due server» | Materializzazione nella casella del destinatario al momento della consegna |
| «Alfred è un homeserver» | Alfred è **piattaforma per istanza** (Postgres + servizi) |
| «Campo `direction` in/out» | **Vietato.** Solo `author_id` |
| «Conversazione come entità condivisa» | **Non prevista.** Solo caselle per `owner_id` |
| «Ordine globale unico del thread» | **Non richiesto.** Ogni casella ordina i propri messaggi |

### 3.3 Alfred è piattaforma, non homeserver

- Un'**istanza** Alfred = un dominio, un Supabase, daemon bridge **per istanza** (D-037).
- Gli utenti Alfred sulla **stessa istanza** condividono la piattaforma ma **non** la stessa casella messaggi.
- La duplicazione sulla stessa istanza è scelta di **modello di archiviazione**, non replica di vincolo di rete.
- Per peer **esterni**, la cronologia dell'altro lato **non risiede** su Alfred.

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

- UUID generato al momento dell'invio; **stesso valore** sulla copia del mittente e sulla copia del destinatario (quando esiste).
- **Scopo ammesso:** idempotenza consegna; correlazione segnali spunta/lettura; ack bridge.
- **Scopo escluso:** allineare preview, ordine, contenuto o lifecycle tra caselle; conversazione condivisa; delete/edit automatici sull'altra casella.

---

## 5. Schema dati (target)

### 5.1 `mailbox_threads`

**Struttura dell'archivio** dell'utente verso un peer (contatto, profilo interno, o gruppo). I campi preview/unread sono denormalizzazione sull'header del thread, aggiornati dagli insert in `mailbox_messages` della stessa casella.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | `uuid` PK | Identificatore del thread **nella mia casella** |
| `owner_id` | `uuid` FK `profiles` | Sempre `auth.uid()` per RPC utente |
| `peer_kind` | `enum` | `profile` \| `contact` \| `group` |
| `peer_profile_id` | `uuid` nullable | Se peer = utente Alfred noto |
| `peer_contact_id` | `uuid` nullable | Se peer = riga `contacts` |
| `peer_group_id` | `uuid` nullable | Futuro: gruppo |
| `protocol` | `contact_protocol` | `internal` \| `xmpp` \| `matrix` — **solo routing** |
| `last_message_at` | `timestamptz` | Ultimo messaggio **in questa casella** |
| `last_message_preview` | `text` | Preview ultimo messaggio **in questa casella** |
| `last_message_author_id` | `uuid` nullable | Autore ultimo messaggio **in questa casella** |
| `unread_count` | `integer` | Non letti **nella mia casella** |
| `archived_at` | `timestamptz` nullable | Archivio locale |
| `deleted_at` | `timestamptz` nullable | Eliminazione **solo mio lato** (soft delete) |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Vincoli:**

- Unicità: `(owner_id, peer_kind, coalesce(peer_profile_id, peer_contact_id, peer_group_id))` per thread attivo.
- **Nessuna** FK verso il `mailbox_thread` dell'altro utente.
- `protocol` deriva dal peer; non guida biforcazioni applicative.

### 5.2 `mailbox_messages`

Messaggi **nell'archivio di un utente**. Ogni riga appartiene a un solo `owner_id`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | `uuid` PK | Id riga **in questa casella** |
| `logical_message_id` | `uuid` NOT NULL | Id logico evento (stesso su copie diverse) |
| `thread_id` | `uuid` FK `mailbox_threads` | Thread di appartenenza |
| `owner_id` | `uuid` FK `profiles` | = `mailbox_threads.owner_id` (RLS) |
| `author_id` | `uuid` FK `profiles` | **Chi ha scritto** il messaggio |
| `body` | `text` | Può essere vuoto per GIF/voice |
| `content_type` | `message_content_type` | `text` \| `gif` \| `voice` |
| `media_url` | `text` nullable | |
| `media_mime` | `text` nullable | Es. `audio/webm` per voice |
| `media_size_bytes` | `bigint` nullable | |
| `duration_seconds` | `integer` nullable | Voice |
| `client_message_id` | `text` nullable | Idempotenza client (UUID v4) |
| `delivery_status` | `message_delivery_status` | Stato **su questa copia** |
| `marker_type` | `text` nullable | `receipt` \| `displayed` — futuro bridge |
| `marker_for` | `uuid` nullable | `logical_message_id` target |
| `external_id` | `text` nullable | Id su sistema esterno |
| `created_at` | `timestamptz` | Timestamp **in questa casella** |
| `updated_at` | `timestamptz` | |

**Vincoli:**

- **NO** colonna `direction`.
- Unicità: `(owner_id, thread_id, client_message_id)` dove `client_message_id` non null.
- Unicità consegna: `(owner_id, thread_id, logical_message_id)`.
- `author_id` può essere ≠ `owner_id` (messaggio ricevuto nella mia casella).

**Semantica `delivery_status` per copia:**

| Copia | Stati tipici |
|-------|----------------|
| Mittente (`author_id = owner_id`) | `sent` → `delivered` → `read` |
| Destinatario (`author_id ≠ owner_id`) | `delivered` all'insert → `read` quando apro il thread |

Allineato a [server-as-reception.md](../decisions/server-as-reception.md).

### 5.3 `outbox` (evoluzione tabella esistente)

Estensione del modello `outbox` attuale per essere **l'unico** punto di uscita.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | `uuid` PK | |
| `logical_message_id` | `uuid` | |
| `from_profile_id` | `uuid` | Mittente |
| `to_profile_id` | `uuid` nullable | Destinatario interno stessa istanza |
| `to_contact_id` | `uuid` nullable | Destinazione via contatto esterno |
| `to_external_address` | `text` nullable | JID / Matrix ID |
| `sender_mailbox_message_id` | `uuid` | FK copia mittente |
| `protocol` | `contact_protocol` | Driver |
| `payload` | `jsonb` | body, content_type, media_*, author_id, client_message_id, … |
| `status` | `queue_status` | `queued` \| `processing` \| `delivered` \| `failed` |
| `attempts` | `integer` | |
| `locked_by` | `text` nullable | |
| `locked_at` | `timestamptz` nullable | |
| `last_error` | `text` nullable | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Regola:** ogni `send_message` crea **sempre** una riga outbox, incluso `protocol = internal`.

### 5.4 Tabelle sostituite (dopo migrazione completa)

| Tabella attuale (`main`) | Destino |
|--------------------------|---------|
| `messages` (riga condivisa mittente↔destinatario) | `mailbox_messages` (copie per owner) |
| Inbox on-read (`list_inbox()` su `messages`) | `list_mailbox_threads()` su `mailbox_threads` |
| `send_message_to_profile` | `send_message` (thread-based) + outbox |
| `list_peer_messages` / `mark_peer_read` | `list_mailbox_messages` / `mark_thread_read` |

**Già eliminate** (non tornano): `conversations`, `conversation_participants`, `inbox_threads`.

`contacts`, `profiles`, `message_read_receipts`, `sync_cursors`, `bridge_jobs` restano o vengono adattati.

---

## 6. Driver di consegna

### 6.1 Contratto comune `deliver_outbox(outbox_row)`

1. Legge payload e destinatario.
2. **Idempotente:** se esiste già `mailbox_message` con `(owner_id=dest, logical_message_id)`, skip insert.
3. Materializza messaggio nella casella del destinatario (`author_id` = mittente originale).
4. Aggiorna `delivery_status` sulla copia del mittente.
5. Aggiorna header `mailbox_threads` (preview, unread) **solo per le caselle toccate**.
6. Marca outbox `delivered` o `failed`.
7. Emette eventi Realtime appropriati.

### 6.2 Driver `internal` (bridge verso l'interno)

- Esecuzione: funzione PL/pgSQL o job in-process — **non** richiede demone Python.
- Può completare **nella stessa transazione** di `send_message`.
- Trova o crea `mailbox_thread` del destinatario; insert `mailbox_message`; promuove copia mittente a `delivered`.
- **Non** crea link tra i due `mailbox_thread`; **non** allinea ordine/preview tra caselle.

### 6.3 Driver `xmpp` / `matrix` (futuro)

- Bridge stateless (D-051) consuma outbox via `service_role`.
- Materializza solo la casella lato utente Alfred.
- Ack bridge aggiornano `delivery_status` sulla copia del mittente — segnale, non sync caselle.

### 6.4 Driver `alfred_remote` (futuro, fuori scope Alpha)

- Federazione tra due istanze Alfred; stesso contratto outbox.

---

## 7. Operazioni applicative (RPC)

### 7.1 `get_or_create_mailbox_thread`

**Input:** `p_peer_contact_id` oppure `p_peer_profile_id`

1. Risolve peer e `protocol`.
2. Cerca `mailbox_threads` con `owner_id = auth.uid()`.
3. Se assente, crea **solo** il thread del chiamante.
4. **Non** crea il thread del peer (nasce alla prima consegna).
5. Ritorna `thread_id`.

### 7.2 `list_mailbox_threads`

Sostituisce `list_inbox()` del modello attuale.

**Output:** `thread_id`, `display_name`, `last_message_preview`, `last_message_at`, `unread_count`, `peer_*` — tutti dalla **casella del chiamante**. Nessun join con la casella del peer.

### 7.3 `list_mailbox_messages`

**Input:** `p_thread_id`, `p_limit`, `p_before`

**Filtro:** `owner_id = auth.uid()` AND `thread_id = p_thread_id` AND messaggi non eliminati.

### 7.4 `send_message`

1. Valida thread appartiene a `auth.uid()`.
2. Genera `logical_message_id`.
3. Insert copia mittente (`author_id = auth.uid()`, `delivery_status = sent`).
4. Insert `outbox`.
5. Chiama `deliver_outbox` (sync se internal).
6. Aggiorna header thread mittente.
7. Ritorna copia mittente aggiornata.

**Idempotenza:** stesso `(thread_id, client_message_id)` → messaggio esistente, niente doppio outbox.

### 7.5 `mark_thread_read`

1. Azzera `unread_count` sul mio thread.
2. Marca messaggi ricevuti come letti **nella mia casella**.
3. Emette segnale `read` sulla copia del mittente (stesso `logical_message_id`).

### 7.6 `delete_mailbox_thread` / `archive_mailbox_thread`

Solo lato chiamante: soft delete su thread e messaggi associati **nella mia casella**. Nessuna operazione sulla casella del peer.

### 7.7 Contatti e risoluzione indirizzo

Invariata rispetto ad Alpha (`find_profile_by_username`, rubrica). Il client apre chat via `get_or_create_mailbox_thread` invece di `ChatPeer` + `peer_profile_id` diretto.

---

## 8. Gruppi (futuro)

- `peer_kind = group`; una casella per membro verso il gruppo.
- Messaggi con `author_id` tra N partecipanti; nessun `direction`.
- Invio: insert nella mia casella gruppo → outbox → fan-out driver.
- Costo storage O(membri × messaggi) — accettato per design.

---

## 9. Realtime

| Canale | Evento | Scopo |
|--------|--------|-------|
| `mailbox-threads-{userId}` | INSERT/UPDATE su `mailbox_threads` (`owner_id = userId`) | Inbox |
| `mailbox-messages-{userId}` | INSERT/UPDATE su `mailbox_messages` (`owner_id = userId`) | Chat + spunte |

**Client:** subscribe per `auth.uid()`; `list_mailbox_messages`; optimistic UI con `client_message_id`; nessun branch `protocol == internal` in UI.

---

## 10. RLS (linee guida)

- `mailbox_threads`: `owner_id = auth.uid()` per SELECT/UPDATE/DELETE.
- `mailbox_messages`: `owner_id = auth.uid()` per SELECT; INSERT solo via RPC `SECURITY DEFINER`.
- `outbox`: deny a `authenticated`; bridge con `service_role`.

---

## 11. Multi-account

- Ogni account = sessione Supabase (`setSession`); caselle filtrate per `auth.uid()`.
- Refresh token in `SharedPreferences` (Alpha attuale).

---

## 12. Mappatura dal modello attuale (`main`, PR #130)

| Concetto attuale | Modello caselle (proposta) | Note |
|------------------|---------------------------|------|
| `messages` (1 riga condivisa) | `mailbox_messages` (1+ copie per evento) | Cambio paradigma archiviazione |
| `messages.sender_id` | `mailbox_messages.author_id` | Già allineato concettualmente |
| `list_inbox()` on-read | `list_mailbox_threads()` | Da aggregazione live a archivio strutturato |
| `list_peer_messages(peer)` | `list_mailbox_messages(thread_id)` | Chat per thread nella mia casella |
| `mark_peer_read(peer)` | `mark_thread_read(thread_id)` | |
| `send_message_to_profile` | `send_message` + outbox | |
| `on_message_inserted` biforcato | `deliver_outbox` unico | Internal passa da outbox |
| Outbox solo xmpp/matrix | Outbox **sempre** | |
| `ChatPeer.profileId` | `thread_id` (+ peer nel thread) | Client identifica chat per thread |
| Realtime `inbox-messages-{userId}` su `messages` | `mailbox-threads/messages-{userId}` | |
| Inbox UX (ricerca on-demand, avatar) | Stessa UX; dati da `list_mailbox_threads` | Comportamento client invariato |

### 12.1 Cosa si riusa dal modello attuale

- `outbox`, `sync_cursors`, `bridge_jobs` (struttura coda federata)
- `sender_id` / autore senza `direction`
- `delivery_status`, `message_read_receipts`
- Asimmetria peer esterno
- Multi-account, `ComposeService` / risoluzione username
- Concetti [server-as-reception](../decisions/server-as-reception.md), [bridge-stateless](../decisions/bridge-stateless.md)

---

## 13. Strategia di migrazione (senza rompere chat Alpha)

### 13.1 Principi

- Il flusso attuale (`messages` + `list_inbox`) resta produzione finché il nuovo non è validato.
- Fasi piccole e reversibili; branch dedicato; merge solo dopo prova esplicita.
- Test: `schema_smoke.sql`, `flutter test`, e2e inbox.

### 13.2 Fasi

| Fase | Azione | Rischio |
|------|--------|---------|
| A | Creare `mailbox_threads`, `mailbox_messages` + RPC lettura | Zero |
| B | Doppia scrittura su send: `messages` attuale + modello caselle | Basso |
| C | Backfill storico `messages` → caselle | Medio |
| D | Flag dev: UI legge nuovo modello, confronto shadow | Zero prod |
| E | Switch lettura client a `list_mailbox_threads` | Medio, rollback facile |
| F | Switch invio solo nuovo modello | Medio |
| G | Deprecare `messages` condiviso e RPC peer-based | Solo quando stabile |

**Nota:** `conversations` e `inbox_threads` sono già state eliminate; la migrazione parte dal modello message-centric, non da entità conversazione.

### 13.3 Criteri di accettazione

- Invio testo, GIF e voice 1:1 interno.
- Realtime destinatario.
- Spunte sent / delivered / read su copia mittente.
- Multi-account senza bleed tra caselle.
- `list_mailbox_threads` equivalente a `list_inbox()` attuale.
- Delete thread solo lato chiamante.
- Outbox internal in transazione; idempotenza `logical_message_id`.

---

## 14. Vantaggi e svantaggi

### 14.1 Vantaggi

*Architettura*

- Un solo flusso invio → outbox → consegna
- Niente biforcazione internal/federato in client e RPC principali
- Outbox come contratto unico per tutti i driver

*Funzionalità*

- Caselle indipendenti (modello email)
- Delete/archivio solo dal proprio lato
- Stessa forma messaggio per 1:1, gruppi, federazione (`author_id`)
- Spunte come segnali puntuali, non sync caselle

### 14.2 Svantaggi

*Refactoring*

- Migrazione dal modello message-centric funzionante
- Rischio regressione chat Alpha
- Periodo doppia scrittura / convivenza schemi
- RPC e client da riscrivere

*Piattaforma*

- Più righe DB per evento (copia mittente + destinatario su stessa istanza)
- Storage moltiplicato nei gruppi
- Perdita della query semplice su riga messaggio unica

---

## 15. Contropunti registrati

### 15.1 Contro il rinvio

Rimandare può cementare il biforcamento internal/esterno mentre si aggiungono bridge e gruppi. L'orizzonte bridge **non è noto**; calibrare il peso del refactor sul calendario reale.

### 15.2 Contro il refactor

Complessità nuova (N copie, migrazione fragile). Alternativa: unificare solo il **percorso logico** (internal in outbox) mantenendo riga `messages` condivisa.

**Stato attuale:** con PR #130 è stata scelta la strada opposta — message-centric con inbox on-read, senza caselle. Questa alternativa resta valida se si rimanda o si rifiuta il modello caselle.

### 15.3 Contro le caselle su piattaforma centralizzata

Duplicazione su stesso Postgres senza vincolo di rete; si perde query su stanza unica.

**Risposta del design:** archiviazione per casella è **deliberata** per unificare 1:1, gruppi e federazione sul modello email — non per replicare un homeserver.

---

## 16. ADR e relazione con il modello attuale

| Documento | Rapporto con questa proposta |
|-----------|------------------------------|
| [address-based-messaging.md](../decisions/address-based-messaging.md) | **Incompatibile** se adottata la proposta — va sostituito |
| [server-as-reception.md](../decisions/server-as-reception.md) | Compatibile (`delivery_status` su copia) |
| [bridge-stateless.md](../decisions/bridge-stateless.md) | Compatibile |
| D-008, D-031, D-034, D-036, D-037 | Compatibili |

---

## 17. Fuori scope

- Bridge XMPP/Matrix (implementazione)
- Federazione tra istanze Alfred
- Gruppi (schema `groups`)
- Edit messaggio, delete globale, reazioni
- Cache offline nativa
- Allineamento ordine/contenuto/preview tra caselle di utenti diversi

---

## 18. Glossario

| Termine | Significato |
|---------|-------------|
| **Casella** | Archivio messaggi di un utente verso un peer, `owner_id` fisso |
| **Thread** | Riga `mailbox_threads` — contenitore/struttura dell'archivio verso un peer |
| **Peer** | Contatto, profilo o gruppo con cui scambio messaggi |
| **Copia** | Riga `mailbox_messages` appartenente a un `owner_id` |
| **Consegna** | Outbox → materializzazione in casella destinatario (se esiste) |
| **Segnale** | Aggiornamento puntuale (es. `read` sul mittente); non sync casella |
| **Driver** | Implementazione consegna per `protocol` |
| **Bridge interno** | Driver `internal` sulla piattaforma, non demone Python |

---

## 19. Stato implementazione

| Componente | Stato su `main` |
|------------|-----------------|
| Schema `mailbox_*` | ❌ Non implementato |
| `send_message` unificato (outbox sempre) | ❌ Oggi: `send_message_to_profile` → insert diretto `messages` |
| Driver `internal` via outbox | ❌ Oggi: trigger `delivered` su internal |
| Migrazione dati verso caselle | ❌ |
| Client Flutter | ✅ Funzionante con modello **attuale**: `InboxController`, `ChatPeer`, `list_inbox()`, `list_peer_messages` |
| Bridge federato | ❌ Stub health only |
| ADR message-centric (PR #130) | ✅ Implementato e vincolante |

**Chat Alpha interna: funzionante.** Non modificare senza piano migrazione §13 e decisione esplicita di adottare questa proposta al posto di [address-based-messaging.md](../decisions/address-based-messaging.md).

---

*Originale: sessione design 2026-06-26. Revisione documentale 2026-06-28. Aggiornare questo file e `PROJECT_MAP.md` al momento dell'implementazione.*
