# Alfred - Mappa Completa del Progetto

**Ultimo aggiornamento**: 2026-06-27 (gate `scripts/verify.sh` — flutter analyze)  
**Versione repository**: 3.1.0-alpha (client Flutter live con piattaforma; bridge esclusi)

---

## 📋 Indice

1. [Panoramica Progetto](#panoramica-progetto)
2. [Architettura](#architettura)
3. [Struttura File e Responsabilità](#struttura-file-e-responsabilità)
4. [Dipendenze](#dipendenze)
5. [Entrypoint](#entrypoint)
6. [Servizi Esterni](#servizi-esterni)
7. [Build e Testing](#build-e-testing)
8. [Database e Storage](#database-e-storage)
9. [Stato Corrente](#stato-corrente)
10. [Client legacy React](#client-legacy-react-web-client--rimosso-da-main)

---

## ⚠️ Stato repository (2026-06-24)

| Elemento | Dettaglio |
|----------|-----------|
| **Client attivo** | `client/` — Flutter, collegato a Supabase (auth, chat, contatti, profilo) |
| **URL live** | https://alfred-im.github.io/XmppTest/ |
| **Deploy** | `.github/workflows/deploy-pages.yml` — test + build Flutter web |
| **Piattaforma** | Supabase `tvwpoxxcqwphryvuyqzu` — schema dominio + RLS + RPC |
| **Bridge** | `bridge-xmpp/` · `bridge-matrix/` — **stub** (health Fly.io only, non implementati) |
| **Client legacy** | `web-client/` rimosso da `main` — tag `legacy/web-client-final` @ `6e792eb` |
| **Recupero legacy** | `git checkout legacy/web-client-final -- web-client/` |
| **Branch** | `main` — PR Alpha #108–#115 mergiate (registro: `docs/architecture/alpha-pr-registry.md`) |

**Stack su `main`**: `client/` · `supabase/` · `bridge-xmpp/` · `bridge-matrix/`

La documentazione sotto che cita `web-client/` descrive il **client React storico** — riferimento per tradurre feature nel Flutter.

---

## 📌 Panoramica Progetto

**Alfred** è una piattaforma di messaggistica in migrazione verso **Flutter + Supabase + bridge Python**. Su `main` il **client Flutter** è collegato a Supabase (auth, contatti, chat realtime, profilo, multi-account).

### Caratteristiche attuali (client Flutter + piattaforma)

- **Auth Alfred**: login/registrazione con **email + password** (GoTrue); **username** obbligatorio in registrazione come identità IM pubblica — email **non** in profilo/rubrica/ricerca
- **Multi-account**: switch Thunderbird via `SharedPreferences` + `setSession`
- **Contatti unificati**: interni Alfred + esterni XMPP/Matrix (protocollo solo routing)
- **Conversazioni + chat realtime**: Supabase Postgres + Realtime; inbox via RPC `list_conversations` (un round-trip)
- **GIF in chat**: upload su bucket Supabase `chat-media` → `messages.content_type=gif` + `media_url`; preview inbox `[GIF]`
- **Messaggistica interna**: utente↔utente stessa istanza — completa (testo + GIF)
- **Messaggistica federata**: outbox `queued` — attende bridge (non implementato)
- **Profilo Alfred**: display name, bio, username
- **Spunte lettura**: `on_message_inserted` → `delivered` (internal) · `mark_conversation_read` → `read` — concept: ricezione = server — `docs/decisions/server-as-reception.md`
- **Brand Alfred**: `#2D2926`, bolle WhatsApp, layout responsive
- **Deploy web**: GitHub Pages automatico su push a `main`

### Tecnologie attive su `main`

| Categoria | Tecnologia | Note |
|-----------|------------|------|
| Client | Flutter 3.44.x / Dart 3.12 | `client/` |
| Piattaforma | Supabase (Postgres, Auth, Realtime, Storage) | Schema dominio + RLS + RPC implementati |
| Bridge | Python 3.12 + aiohttp | Fly.io — health OK, federazione non implementata |
| CI | GitHub Actions | Deploy Pages da `client/` |

### Riferimento legacy (tag `legacy/web-client-final`)

Il client React aveva: offline-first IndexedDB per account, XMPP diretto (Stanza.js), MAM, spunte XEP-0184/0333, PWA. Vedi sezione [Client legacy](#client-legacy-react-web-client--rimosso-da-main) e `docs/`.

---

## 🏗️ Architettura

### Target (Alpha — da completare)

```
┌─────────────────────────────┐
│   Flutter (client/)         │  ← UI; parla solo con piattaforma
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│   Supabase (piattaforma)    │  ← Auth, Postgres, Realtime
└──────┬──────────────┬───────┘
       │              │
┌──────▼──────┐ ┌─────▼──────┐
│ bridge XMPP │ │bridge Matrix│  ← Fly.io, worker stateless (stato in Supabase)
└─────────────┘ └────────────┘
```

**Regola vincolante**: i bridge **non** tengono stato di business — vedi `docs/decisions/bridge-stateless.md`.

**Stato implementazione**: client Flutter + schema Supabase dominio **implementati**. Bridge restano stub health.

**Chat unificate (vincolante, 2026-06-27)**: la distinzione chat interna/esterna **non esiste** a **nessun livello** (client, Supabase, bridge, test, documentazione). Una sola chat end-to-end per ogni conversazione. Il campo `protocol` indica solo il **percorso di recapito uscente**, non una tipologia di chat. ADR: `docs/decisions/no-internal-external-chat-distinction.md`.

### Documentazione architettura Alpha

Vedi `docs/architecture/alpha-full-stack.md` — scelte a tutti i livelli (client, RPC, RLS, outbox, test).

### Legacy — client React (tag `legacy/web-client-final`)

> Diagramma e layer sotto descrivono l’architettura del client rimosso — utile per MAM, spunte, sync.

### Layer Architecture (legacy React)

```
┌─────────────────────────────────────┐
│         UI Layer (Pages)            │
│  ChatPage, ConversationsPage,       │
│  ProfilePage                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Components Layer               │
│  LoginPopup, ConversationsList,     │
│  PushNotificationSettings           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Context Layer (State)          │
│  ConnectionContext, AuthContext,    │
│  VirtualMessagesContext,            │
│  ConversationsContext,              │
│  MessagingContext                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Services Layer                │
│  xmpp.ts, outbox-send.ts,           │
│  mam-sync.ts, messages.ts,          │
│  sync-initializer.ts, conversations.ts │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼──────┐ ┌─────▼──────┐
│ Repositories│ │  Utils     │
│ (Data Layer)│ │  (Helper)  │
└─────────────┘ └────────────┘
       │               │
       └───────┬───────┘
               │
    ┌──────────▼────────────┐
    │  XMPP Server + IndexedDB  │
    └───────────────────────────┘
```

### Principi Architetturali
1. **Separation of Concerns**: UI, State, Business Logic, Data Access separati
2. **Cache-First**: Mostra sempre prima i dati locali (IndexedDB)
3. **Minimal Server Queries**: Massimizza cache, minimizza query XMPP
4. **Unidirectional Data Flow**: Props down, Events up
5. **Server as Source of Truth**: Il server XMPP è l'unica fonte di verità per i **messaggi**
   - Store `messages`: scritto **solo** da MAM (`mam-sync.ts`)
   - Listener = campanello: virtual UI + schedula MAM (no write diretto messaggi)
   - Outbox e conversazioni: eccezioni locali (coda invio, preview/unread)
   - Direzione sync messaggi: DAL server AL database locale (mai il contrario)
6. **Un account = un database locale**: IndexedDB partizionato per JID utente (`conversations-db-{account}`)
   - `account-session.ts` + `setAccountContext()` in `conversations-db.ts`
   - Logout: reset memoria React, **non** wipe dello storico
   - Migrazione automatica dal vecchio DB condiviso `conversations-db` (legacy)
7. **Rendering Fa Le Scelte**: La UI decide cosa e come mostrare basandosi sui dati grezzi
   - Dati salvati esattamente come arrivano dal server (no trasformazioni in DB)
   - Logica di presentazione (filtri, combinazioni, calcoli) avviene durante rendering
   - Esempio: ack XEP-0184 (`markerType: 'receipt'`) e XEP-0333 (`markerType: 'displayed'`) salvati come messaggi separati, combinati in `resolveCheckmarkLevel()`

### Stati messaggi e spunte (XEP-0184 + XEP-0333)

**Implementazione spunte stile WhatsApp — 3 livelli**

| Livello | UI | Meccanismo |
|---------|-----|------------|
| 1 Inviato | ✓ grigia | Conferma server XMPP (`sendMessage` / outbox) |
| 2 Consegnato | ✓✓ grigie | **XEP-0184** `<received id="origin-id"/>` |
| 3 Lettura | ✓✓ blu | **XEP-0333** `<displayed id="origin-id"/>` |

Priorità UI: `reading` > `delivered` > `sent`.

#### Architettura Dati

**Messaggi nel DB**:
- Messaggi testuali: `body: "testo"`, `markerType: undefined`
- Acknowledgement: `body: ""`, `markerType: 'receipt'|'displayed'`, `markerFor: origin-id`

**Fonte dati**:
- Sincronizzazione MAM: scarica messaggi testuali E acknowledgement insieme
- Eventi real-time (campanello): `receipt` (0184) e `marker:displayed` (0333) → overlay UI
- Invio: `markable` + `receipt request` in uscita; `markDisplayed()` all'apertura chat in ricezione

**Storage**:
- Solo MAM scrive nel DB messaggi (listener = campanello)
- Overlay `deliveredUi` / `readingUi` in VirtualMessagesContext per feedback immediato
- Ack salvati come messaggi speciali con `markerType` e `markerFor`

#### Strategia Rendering

**Ciclo rendering messaggi** (`MessageItem.tsx`):

```
Per ogni messaggio nell'array:

1. HA body con testo?
   → SÌ: Messaggio normale
      - resolveCheckmarkLevel() con ack MAM + overlay deliveredUi/readingUi
      - Renderizza messaggio CON spunta appropriata
   
2. È un ack (body vuoto + markerType)?
   → SÌ: return null (nascosto, applicato solo visivamente)
```

**Logica spunte** (`utils/checkmark.ts`):
- `status: 'sent'` (o overlay assente) → ✓ singola grigia
- `markerType: 'receipt'` o `deliveredUi` → ✓✓ doppie grigie
- `markerType: 'displayed'` o `readingUi` → ✓✓ doppie blu

**Vantaggi strategia**:
- DB contiene dati grezzi esattamente come dal server (MAM-only)
- Overlay UI per latenza zero su receipt e displayed
- Logica presentazione separata dai dati
- Coerenza con principio "Rendering Fa Le Scelte"

**Documentazione**: `docs/architecture/message-states.md`, `docs/implementation/delivery-receipts-xep-0184.md`, `docs/implementation/chat-markers-xep-0333.md`

---

## 📂 Struttura File e Responsabilità

### Root Directory (`/workspace`)

```
/workspace/
├── .cursor-rules.md          # Regole di sviluppo per AI assistant
├── .cursor/rules/            # Regole Cursor (main.mdc → punta a .cursor-rules.md)
│   └── main.mdc
├── deploy/                    # Manifest deploy (fly-bridges.json, supabase.json)
├── fly.toml                   # Un’app Fly, due demoni bridge
├── Dockerfile                 # Build XMPP + Matrix
├── scripts/start-bridges.sh   # Avvio entrambi i demoni
├── docs/                      # Documentazione tecnica per AI (riferimento legacy + nuova architettura)
│   ├── architecture/          # Analisi architetturali
│   ├── implementation/        # Dettagli implementativi
│   ├── design/                # Principi design e brand identity
│   ├── decisions/             # Architecture Decision Records
│   ├── fixes/                 # Analisi bug fix
│   └── archive/               # Ricerca XMPP e documenti storici
├── bridge-matrix/             # Bridge Python Matrix (demone, no fly.toml locale)
├── bridge-xmpp/               # Bridge Python XMPP (demone, no fly.toml locale)
├── client/                    # Flutter (web + desktop/mobile scaffold) — client produzione Alpha
├── .github/workflows/
│   └── deploy-pages.yml       # Deploy Flutter web su GitHub Pages (/XmppTest/)
├── supabase/                  # Config + migrazioni piattaforma Alfred
├── README.md                  # Documentazione principale
├── CHANGELOG.md               # Change log del progetto
├── LICENSE                    # Licenza MIT
├── TEST_CREDENTIALS.md        # Credenziali di test
└── PROCEDURA_REVISIONE_GENERALE.md  # Procedura di revisione
```

### Client Flutter (`/workspace/client`)

**Stato**: client produzione Alpha collegato a Supabase — **non più mock**.

| Elemento | Dettaglio |
|----------|-----------|
| **Entry** | `lib/main.dart` → `AppShell` (auth gate) → `HomeScreen` |
| **State** | Provider (`AuthController`, `ConversationsController`, `ContactsController`, `MessagesController`) |
| **Backend** | `supabase_flutter` — REST + Realtime + RPC |
| **Dipendenze** | `provider`, `intl`, `uuid`, `shared_preferences`, `file_picker`, `supabase_flutter` |
| **Config** | `lib/config/app_config.dart` — override `--dart-define=SUPABASE_URL` |
| **Test** | `test/unit/`, `test/widget/` — CI esegue `flutter test` |
| **Build web** | `flutter build web --release --base-href "/XmppTest/"` |

```
client/lib/
├── config/          # AppConfig (Supabase URL/key)
├── models/          # Conversation, ChatMessage, Contact, UserProfile, SavedAccount
├── services/        # auth, contact, conversation, message, message_media, profile, account storage
├── providers/       # ChangeNotifier controllers
├── screens/         # AppShell, Auth, Home, Contacts, Profile
├── theme/           # AlfredColors, AlfredTheme
├── utils/           # date_format, avatar_color, auth_identity, conversation_scroll_anchor
└── widgets/         # ConversationsPanel, ChatPanel, AnchoredMessageList, AccountSidebar, MessageBubble, …
```

**Layout inbox (non deducibile)**: `HomeScreen` — mobile: drawer sinistro (hamburger solo nella lista conversazioni) con `AccountSidebar` (profilo attivo, modifica, altri account, aggiungi, esci); chat mobile con solo back. Desktop (≥720px): colonna sinistra fissa = `AccountSidebar` + lista conversazioni (senza barra Alfred duplicata); area destra sempre chat/placeholder. Menu account bottom sheet rimosso.

**Aggancio al fondo (non deducibile)**: `AnchoredMessageList` in `chat_panel.dart` — `ListView` `reverse: true`, soglia 48 px, pulsante freccia + badge se staccato. Identico per tutte le conversazioni. Spec: `docs/design/conversation-bottom-anchor.md`.

### Client legacy React (`web-client/`) — RIMOSSO DA MAIN

> **Nota**: il codice non è più nel repository. Percorsi e responsabilità sotto descrivono l'ultima versione taggata `legacy/web-client-final` — utile per tradurre logica nel client Flutter.

#### Percorso storico (`/workspace/web-client` al tag `legacy/web-client-final`)

#### **Configurazione e Setup**
```
web-client/
├── package.json               # Dipendenze e script npm
├── vite.config.ts             # Configurazione build Vite
├── tsconfig.json              # Configurazione TypeScript
├── tsconfig.app.json          # TypeScript per app
├── tsconfig.node.json         # TypeScript per Node
├── eslint.config.js           # Configurazione ESLint
├── index.html                 # HTML entry point
└── public/                    # Asset statici
    ├── manifest.json          # PWA manifest
    └── sw.js                  # Service Worker per offline support
```

#### **Source Code (`src/`)**

##### **Entrypoint**
- `main.tsx` - **ENTRYPOINT PRINCIPALE**
  - Inizializzazione React
  - Inizializzazione Debug Logger (intercetta console.log)
  - Registrazione Service Worker
  - Gestione touch events (blocco overscroll nativo, pinch-zoom)
  - Gestione orientamento schermo

##### **App Core**
- `App.tsx` - **ROOT COMPONENT**
  - Setup Context Providers
  - Router principale (HashRouter)

##### **Pages (`pages/`)**
Pagine principali dell'applicazione (route)

| File | Responsabilità | Route |
|------|----------------|-------|
| `ConversationsPage.tsx` | Lista conversazioni con ricerca | `#/` |
| `ChatPage.tsx` | Vista chat 1-to-1 con messaggi e invio | `#/chat/:jid` |
| `ProfilePage.tsx` | Profilo utente e modifica vCard | `#/profile` |

##### **Components (`components/`)**
Componenti riutilizzabili

| File | Responsabilità |
|------|----------------|
| `AppInitializer.tsx` | Sync iniziale post-connessione (full/incremental MAM fino a boundary T) |
| `LoginPopup.tsx` | Popup di login con glassmorphism |
| `ConversationsList.tsx` | Lista conversazioni con avatar e preview |
| `NewConversationPopup.tsx` | Popup per nuova conversazione |
| `PushNotificationsSettings.tsx` | Configurazione push notifications |
| `PushNotificationStatus.tsx` | Status indicator push notifications |
| `SplashScreen.tsx` | Schermata di caricamento iniziale |
| `ErrorBoundary.tsx` | Gestione errori React |
| `DebugLogPopup.tsx` | Popup per visualizzare console logs intercettati |

##### **Contexts (`contexts/`)**
State management globale con React Context

| File | Responsabilità | State Gestito |
|------|----------------|---------------|
| `ConnectionContext.tsx` | **CONTEXT PRINCIPALE** — Connessione XMPP, auto-login, `switchAccountContext()` | Client, isConnected, isConnecting, JID |
| `AuthContext.tsx` | Gestione credenziali (salvataggio/caricamento localStorage) | Login/logout credenziali |
| `VirtualMessagesContext.tsx` | UI virtuale messaggi + overlay spunte; reset su `onAccountChanged` | Virtual messages, overlay sets |
| `ConversationsContext.tsx` | Lista conversazioni (cache locale **account attivo**); reload su cambio JID account | Conversations[], `reloadFromDB` |
| `MessagingContext.tsx` | Campanello real-time: messaggi, receipt (0184), marker displayed (0333) | Message/receipt/marker handlers |

##### **Services (`services/`)**
Business logic e comunicazione con XMPP server

**ARCHITETTURA "Virtual UI + MAM-only DB"** (v4.0 — giugno 2026):
- **sync-initializer.ts** — sync full/incremental all'avvio (MAM fino a boundary T)
- **sync-boundary.ts** — handoff sync/listener: momento T, gate campanello
- **mam-sync.ts** — **unico writer** store `messages` (anche su eventi campanello)
- **outbox-send.ts** — coda invio persistente, separata dal DB messaggi
- **sync-status.ts** — Observer stato sync (UI indicators)

##### **Services Core**
Business logic e integrazione servizi esterni

| File | Responsabilità | Dipendenze |
|------|----------------|------------|
| `sync-initializer.ts` | **SYNC ALL'AVVIO** (full o incremental, MAM fino a boundary T) | XMPP, Repositories |
| `sync-boundary.ts` | **HANDOFF SYNC/LISTENER** (momento T, gate campanello) | - |
| `mam-sync.ts` | **MAM INCREMENTALE** — unico writer store `messages` | XMPP, MessageRepository |
| `outbox-send.ts` | **INVIO** — outbox + transmit XMPP (markable + receipt request) | XMPP, OutboxRepository |
| `sync-status.ts` | **Observer** per stato sync globale | - |
| `xmpp.ts` | **CORE XMPP** — Connessione, discovery, `sendReceipts`, `chatMarkers` | Stanza.js |
| `messages.ts` | Parse MAM → Message (testi, receipt, displayed); no invio diretto | Repositories |
| `conversations.ts` | Gestione conversazioni e roster | XMPP, IndexedDB |
| `conversations-db.ts` | IndexedDB **per account** (`setAccountContext`, migrazione legacy) | idb |
| `account-session.ts` | Switch contesto account: DB attivo + `onAccountChanged` (memoria) | conversations-db, mam-sync |
| `vcard.ts` | Gestione vCard (avatar, profilo) | XMPP XEP-0054 |
| `push-notifications.ts` | Push Notifications XEP-0357 | Service Worker, XMPP |
| `auth-storage.ts` | Storage credenziali per auto-login (localStorage) | localStorage API |
| `debug-logger.ts` | Intercettazione e raccolta console logs | Browser Console API |

##### **Repositories (`services/repositories/`)**
Data Access Layer per IndexedDB

**ARCHITETTURA v4.0**:
- MessageRepository: Observer per notifiche UI dopo write MAM
- OutboxRepository: coda messaggi in uscita (store separato)
- MetadataRepository: marker RSM sync incrementale

| File | Responsabilità | Ruolo Architettura |
|------|----------------|-------------------|
| `ConversationRepository.ts` | CRUD conversazioni su IndexedDB | Preview/unread (anche da campanello) |
| `MessageRepository.ts` | CRUD messaggi + **Observer pattern** | Scritto solo da `mam-sync.ts` |
| `OutboxRepository.ts` | CRUD outbox invio | Coda persistente pre-MAM |
| `VCardRepository.ts` | CRUD vCard cache | Cache profili contatti |
| `MetadataRepository.ts` | CRUD metadata sync (RSM token) | Tracking sync incrementale |
| `index.ts` | Export centrale repositories | - |

##### **Hooks (`hooks/`)**
Custom React Hooks

| File | Responsabilità | Note |
|------|----------------|------|
| `useMessages.ts` | Merge outbox + virtual + DB + overlay spunte | Observer + reconcile |
| `useBackButton.ts` | Hook per back button Android | - |

##### **Utils (`utils/`)**
Utility functions

| File | Responsabilità |
|------|----------------|
| `jid.ts` | Parse e validazione JID XMPP |
| `date.ts` | Formattazione date e timestamp |
| `message.ts` | Utility per messaggi (truncate, format, tempId) |
| `message-id.ts` | origin-id canonico (XEP-0359) da stanza/MAM |
| `checkmark.ts` | `resolveCheckmarkLevel()` — 3 livelli spunte |
| `image.ts` | Utility per immagini (resize, convert) |

##### **Config (`config/`)**
- `constants.ts` - **TUTTE LE COSTANTI CONFIGURABILI**
  - XMPP server defaults
  - UI configuration
  - Pagination settings
  - Timeouts
  - Storage keys

---

## 📦 Dipendenze

### Dipendenze di Produzione (`dependencies`)

| Package | Versione | Uso |
|---------|----------|-----|
| `react` | 19.2.0 | UI Framework |
| `react-dom` | 19.2.0 | React rendering |
| `react-router-dom` | 7.9.6 | Routing (HashRouter) |
| `stanza` | 12.21.0 | **CORE** - XMPP client library |
| `idb` | 8.0.3 | **CORE** - IndexedDB wrapper |
| `events` | 3.3.0 | Event emitter polyfill |
| `node-fetch` | 3.3.2 | Fetch polyfill per testing |

### Dipendenze di Sviluppo (`devDependencies`)

| Package | Versione | Uso |
|---------|----------|-----|
| `typescript` | 5.9.3 | Type checking |
| `vite` | 7.2.4 | Build tool e dev server |
| `@vitejs/plugin-react` | 5.1.1 | React plugin per Vite |
| `eslint` | 9.39.1 | Linting |
| `@playwright/test` | 1.57.0 | E2E testing |
| `jsdom` | 27.2.0 | DOM testing |

### Dipendenze Critiche

⚠️ **ATTENZIONE**: Questi package sono CORE per il funzionamento:
1. **stanza** (12.21.0) - XMPP protocol implementation
2. **idb** (8.0.3) - Offline-first data persistence
3. **react-router-dom** (7.9.6) - Navigation

Non aggiornare queste versioni senza testing completo.

---

## 🚀 Entrypoint

### 1. **Entry Point HTML**
- **File**: `/workspace/web-client/index.html`
- **Responsabilità**: HTML root, link a `main.tsx`

### 2. **Entry Point JavaScript**
- **File**: `/workspace/web-client/src/main.tsx`
- **Responsabilità**: 
  - React initialization
  - Service Worker registration
  - Global event handlers (touch, zoom, orientation)

### 3. **App Root Component**
- **File**: `/workspace/web-client/src/App.tsx`
- **Responsabilità**:
  - Context Providers setup
  - Router configuration (HashRouter)
  - Global error boundary

### 4. **Service Worker**
- **File**: `/workspace/web-client/public/sw.js`
- **Responsabilità**:
  - Offline caching
  - Push notifications handling

### Flow di Inizializzazione (Sync Boundary + Virtual UI + contesto account)

```
index.html
  → main.tsx (React.render)
    → ConnectionProvider (setAccountContext da credenziali salvate)
    → AppInitializer (dopo isConnected)
        1. Salva boundary T (momento corrente)
        2. Attiva campanello listener (da T in poi → virtual UI + MAM)
        3. Sync MAM solo passato (end = T) sul DB dell'account attivo
      → App.tsx (Contexts + Router)
        → ConversationsPage | ChatPage | ProfilePage
          └─→ campanello continua (eventi da T → overlay → mam-sync)
```

**Cambio account**: `switchAccountContext(jid)` → apre altro IndexedDB → context React ricaricano → sync su token di quell'account.

**Handoff esplicito**: sync copia il passato (MAM fino a T + 5s overlap); campanello gestisce il futuro (virtual UI → `scheduleConversationMamSync`). De-duplicazione per `messageId` (origin-id).

---

## 🌐 Servizi Esterni

### 1. **Supabase — Piattaforma Alfred (Alpha bootstrap)**

**Progetto cloud**: `tvwpoxxcqwphryvuyqzu` (region `eu-west-1`, status `ACTIVE_HEALTHY`)

| Check | Esito |
|-------|-------|
| URL API | https://tvwpoxxcqwphryvuyqzu.supabase.co |
| Auth health | ✅ 200 (GoTrue, con `apikey`) |
| MCP Supabase (agente) | ✅ `execute_sql`, `apply_migration`, `list_migrations` |
| REST API (anon) | ✅ 200 — tabella smoke `platform_agent_smoke` |

Config in repo: `supabase/config.toml`, `supabase/migrations/` (bootstrap + smoke test), `deploy/supabase.json` (ref/URL/region — **no secret**). Chiavi anon/publishable solo su Supabase; l’agente le ottiene via MCP.

**Test live (2026-06-24)**: migrazione `platform_agent_smoke` applicata; REST restituisce `{"label":"cursor-agent-ok"}`.

### 2. **Fly.io — Bridge Alfred (Alpha bootstrap)**

**App Fly**: `xmpptest` (region `fra`)

Un’app Fly, due demoni Python nello stesso container (`scripts/start-bridges.sh`), **due servizi Fly** in `fly.toml`:

| Bridge | Porta interna | Esposizione pubblica | Health test |
|--------|---------------|----------------------|-------------|
| XMPP | 8080 | `https://xmpptest.fly.dev` (443) | `/health` |
| Matrix | 8081 | `https://xmpptest.fly.dev:8081` | `/health` |

Config deploy in root: `fly.toml` (due `[[services]]`), `Dockerfile`. Fly collegato a GitHub legge il repo.

**Test live (2026-06-24)**: XMPP `/health` ✅ 200 · Matrix `:8081/health` ✅ 200. PR Fly #103 (`app/fly-io`): chiudere senza merge.

### 3. **XMPP Server** (legacy web-client)

**Server di Default**:
- **Domain**: `jabber.hot-chilli.net`
- **WebSocket**: `wss://jabber.hot-chilli.net:5281/xmpp-websocket`

**Discovery Automatico**:
- XEP-0156 (host-meta discovery) implementato in `xmpp.ts`
- Fallback automatico su pattern comuni se discovery fallisce

**Protocolli XMPP Supportati**:
| XEP | Nome | Implementazione |
|-----|------|-----------------|
| XEP-0313 | Message Archive Management (MAM) | `sync-initializer.ts`, `conversations.ts` |
| XEP-0059 | Result Set Management (RSM) | `sync-initializer.ts` (tokens) |
| XEP-0054 | vCard-temp | `vcard.ts` |
| XEP-0357 | Push Notifications | `push-notifications.ts` |
| XEP-0184 | Message Delivery Receipts | `outbox-send.ts`, `MessagingContext.tsx`, `xmpp.ts` |
| XEP-0333 | Chat Markers (displayed) | `MessagingContext.tsx`, `ChatPage.tsx`, `MessageItem.tsx` |
| XEP-0030 | Service Discovery | `xmpp.ts`, `push-notifications.ts` |
| XEP-0077 | In-Band Registration | `xmpp.ts` |
| XEP-0199 | XMPP Ping | Stanza.js built-in |

### 4. **IndexedDB (Local)**

**Database per account**: `conversations-db-{jid_normalizzato}` (es. `conversations-db-testardo_conversations_im`)  
**Legacy (migrazione)**: `conversations-db` — DB condiviso pre-v2.2; copiato al primo login account se dedicato vuoto  
**Versione schema**: 4 (gestita da `idb` in `upgradeConversationsDB`)

**Stores** (identici in ogni DB account):
- `conversations` — Lista conversazioni
- `messages` — Messaggi (Observer pattern; scritto solo da MAM)
- `vcards` — Avatar e profili contatti
- `metadata` — Marker sync (chiave `sync`: RSM token, conversationTokens, listenerCoveredUntil)
- `outbox` — Coda messaggi in uscita

**Contesto attivo**: `setAccountContext(jid)` in `conversations-db.ts`; orchestrato da `account-session.ts` / `ConnectionContext.tsx`  
**Gestione dati**: `repositories/` (tutte le query usano il DB dell'account corrente via `getDB()`)


### 4. **Service Worker**

**Scope**: `/XmppTest/`
**File**: `public/sw.js`
**Funzionalità**:
- Cache asset statici per offline
- Push notifications receiver
- Background sync (future)

### 5. **Browser APIs Utilizzate**

- **Notification API** - Push notifications
- **Service Worker API** - Offline support
- **IndexedDB API** - Data persistence
- **WebSocket API** - XMPP connection

---

## 🔧 Build e Testing

### Client Flutter (`client/`)

**Gate standard** (locale, agenti, CI — stesso script):

```bash
cd client
bash scripts/verify.sh           # pub get + analyze + test
bash scripts/verify.sh --build   # + build web release
```

```bash
flutter run -d chrome
```

| Step | Tool | Output |
|------|------|--------|
| **Verifica** | `scripts/verify.sh` | `flutter analyze` (zero issue obbligatorio) + `flutter test` |
| Dev | `flutter run -d chrome` | Hot reload locale |
| Prod web | `flutter build web --base-href "/XmppTest/"` | `client/build/web/` |
| Deploy | GitHub Actions `deploy-pages.yml` | https://alfred-im.github.io/XmppTest/ |

**`flutter analyze`**: in CI e nello script `verify.sh` qualsiasi issue (anche `info`, es. `unnecessary_import`) fa fallire il gate — allineare il codice prima del push.

Workflow CI: `verify.sh` → build web → copia `index.html` → `404.html` (SPA su Pages).

---

### Client legacy React (tag `legacy/web-client-final`)

> Recupero: `git checkout legacy/web-client-final`

### Script NPM (legacy)

```bash
# Development
npm run dev              # Start Vite dev server (hot reload)
npm run build            # Build production (TypeScript check + Vite build)
npm run preview          # Preview production build

# Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking (implicito in build)

# Testing
npm run test:browser     # Run Playwright browser tests
npm run test:browser:setup  # Install Playwright browsers
```

### Build Configuration

**Tool**: Vite 7.2.4  
**Config File**: `vite.config.ts`

**Ottimizzazioni Build**:
- Code splitting automatico per vendor libraries:
  - `react-vendor` - React, React DOM, React Router
  - `xmpp-vendor` - Stanza.js
  - `db-vendor` - idb
  - `pages` - ChatPage, ConversationsPage
  - `services` - xmpp, messages, conversations, sync-initializer

**Base URL**: `/XmppTest/` (per GitHub Pages)

**Output**: `/workspace/web-client/dist/`

### TypeScript Configuration

**Strict Mode**: Abilitato  
**Config Files**:
- `tsconfig.json` - Base config
- `tsconfig.app.json` - App source
- `tsconfig.node.json` - Vite config

**Target**: ES2020  
**Module**: ESNext

### Linting

**Tool**: ESLint 9.39.1  
**Config**: `eslint.config.js`  
**Plugins**:
- `react-hooks` - React hooks rules
- `react-refresh` - Fast refresh

### Testing

**Framework**: Playwright 1.57.0  
**Test Files**: `web-client/test-*.mjs` (7 file di test)

**Test Scenarios**:
- Browser integration tests
- vCard photo upload/download
- Push notifications
- Login flow

**Nota**: Unit tests non ancora implementati (future)

### Deployment

**Target**: GitHub Pages  
**Workflow**: `.github/workflows/deploy-pages.yml`  
**Trigger**: Push su branch `main`  
**URL**: Configurabile tramite `vite.config.ts` base URL

---

## 💾 Database e Storage

### Isolamento per account (v2.2)

```
Login account A  →  conversations-db-A  (storico A)
Logout           →  memoria React reset, DB A resta su disco
Login account B  →  conversations-db-B  (storico B, indipendente)
```

- `getDB()` richiede `currentAccountJid` impostato; errore se nessun account attivo
- Logout **non** cancella IndexedDB (`clearDatabase()` solo da Debug UI, per account corrente)
- Documentazione fix: `docs/fixes/account-storage-isolation.md`

### IndexedDB Structure

**Database Name**: `conversations-db-{jid_normalizzato}` per account  
**Legacy**: `conversations-db` (singolo DB condiviso, solo migrazione)  
**Version**: 4 (`upgradeConversationsDB` in `conversations-db.ts`)

#### Object Stores

##### 1. **conversations**
```typescript
{
  jid: BareJID              // JID bare del contatto (primary key)
  displayName?: string
  avatarData?: string       // Base64 image
  avatarType?: string       // MIME type
  lastMessage: {
    body: string
    timestamp: Date
    from: 'me' | 'them'
    messageId: string
  }
  unreadCount: number
  updatedAt: Date
}
```
**Indexes**: `by-updatedAt`

##### 2. **messages**
```typescript
{
  messageId: string
  conversationJid: BareJID
  body: string
  timestamp: Date
  from: 'me' | 'them'
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  tempId?: string
  mamArchiveId?: string
  markerType?: 'receipt' | 'displayed'
  markerFor?: string        // origin-id messaggio target
}
```
**Note strategia**:
- Messaggi testuali: `body !== ''`, `markerType === undefined`
- Marker: `body === ''`, `markerType !== undefined`, `markerFor` punta al messaggio
- Marker salvati come messaggi separati, applicati visivamente nel rendering

**Indexes**: 
- `by-conversationJid`
- `by-timestamp`
- `by-conversation-timestamp` (compound `[conversationJid, timestamp]`)
- `by-tempId`

##### 3. **vcards**
```typescript
{
  jid: BareJID
  fullName?: string
  nickname?: string
  photoData?: string
  photoType?: string
  email?: string
  description?: string
  lastUpdated: Date
}
```
**Indexes**: `by-lastUpdated`

##### 4. **metadata**
Record singolo con chiave `'sync'`:
```typescript
{
  lastSync: Date
  lastRSMToken?: string
  conversationTokens?: Record<string, string>
  listenerCoveredUntil?: Record<string, string>
  isInitialSyncComplete?: boolean
  initialSyncCompletedAt?: Date
}
```

##### 5. **outbox**
```typescript
{
  tempId: string
  conversationJid: BareJID
  body: string
  timestamp: Date
  status: 'queued' | 'sending' | 'failed'
  stanzaId?: string
  lastError?: string
}
```
**Indexes**: `by-conversationJid`, `by-status`

### IndexedDB Structure (deprecato — riferimento storico)

> Il nome `alfred-xmpp-db` e gli schema sotto non riflettono più il codice. Sostituiti da `conversations-db-{account}` e interfacce in `conversations-db.ts` (vedi sopra).

<details>
<summary>Schema legacy documentato (pre-v2.2)</summary>

**Database Name**: `alfred-xmpp-db`  

##### conversations (legacy)
```typescript
{
  id: string
  jid: string
  name?: string
  lastMessage?: string
  lastMessageTime?: number
  unreadCount?: number
  avatar?: string
  presence?: string
}
```

##### metadata (legacy key/value generico)
```typescript
{ key: string; value: any }
```

</details>


### LocalStorage

**Keys utilizzate** (da `constants.ts`):

| Key | Tipo | Uso |
|-----|------|-----|
| `xmpp_jid` | string | JID utente per auto-login |
| `xmpp_password` | string | Password (⚠️ encrypted future) |
| `push_config` | JSON | Configurazione push notifications |

⚠️ **Security Note**: Le password sono attualmente in plain text nel localStorage. Encryption pianificata per versioni future.

### Repository Pattern

Tutti gli accessi al database avvengono tramite Repository:

```typescript
// Esempio: ConversationRepository (usa getDB() → DB account attivo)
class ConversationRepository {
  async getAll(): Promise<Conversation[]>
  async getByJid(jid: string): Promise<Conversation | null>
  async saveAll(conversations: Conversation[]): Promise<void>
  async update(jid: string, updates: Partial<Conversation>): Promise<void>
  async delete(jid: string): Promise<void>
}
```

**ARCHITETTURA "SYNC-ONCE + LISTEN"**:
- `MessageRepository` implementa **Observer Pattern** per real-time updates
- `MetadataRepository` gestisce marker per sync incrementale

**Vantaggi**:
- Separation of concerns
- Facilita testing
- Centralizza logica database
- Real-time updates senza polling

---

## 📊 Stato Corrente

### Stack su `main` (2026-06-24, post-merge PR #108–#115)

| Componente | Stato |
|------------|-------|
| `client/` (Flutter) | 🟢 Auth, contatti, chat realtime (testo + GIF), profilo, multi-account |
| `supabase/` | 🟢 Schema dominio + RLS + RPC + storage `chat-media` + outbox |
| `bridge-xmpp/` · `bridge-matrix/` | 🟡 Stub Fly.io health — federazione non implementata |
| `web-client/` (React) | ❌ Rimosso — tag `legacy/web-client-final` |

### ✅ Client Flutter — implementato (Alpha produzione)

- Auth Supabase (login/registrazione **email + password**; username identità IM in `profiles`, non esposto come credenziale altrui)
- Multi-account Thunderbird (`SharedPreferences` + switch refresh token) — PR #111
- Contatti unificati (interni + federati in rubrica)
- Inbox via RPC `list_conversations` (un round-trip) — PR #112
- Chat realtime testo + GIF (Supabase Postgres + Realtime + Storage) — PR #109/#115
- Stabilità inbox web: `waitForSupabaseSessionReady` + `ChangeNotifierProxyProvider` — PR #113/#114
- Deploy GitHub Pages con passkeys bundle — PR #110
- Layout conversazioni + chat responsive, tema `#2D2926`
- Test: unit, widget, e2e Playwright inbox, SQL smoke, CI analyze+test+build

**Architettura dettagliata**: `docs/architecture/alpha-full-stack.md`  
**Registro PR**: `docs/architecture/alpha-pr-registry.md`

### 🚧 Prossimi passi (post-Alpha client+platform)

- Implementazione bridge XMPP (slixmpp) — consume `outbox`/`sync_cursors`
- Bridge Matrix (matrix-nio)
- Spunte XEP-0184/0333 via bridge
- Encryption token multi-account

Vedi `docs/decisions/project-revolution-discovery.md`.

### ✅ Funzionalità legacy (tag `legacy/web-client-final` — riferimento)

**Architettura v3.0 "Sync-Once + Listen" (15 dicembre 2025)**:
- ✅ **Sync iniziale** (full o incremental) all'avvio
- ✅ **Sync status indicator** nella ConversationsPage
- ✅ **Real-time messaging** tramite Observer pattern
- ✅ **Clear DB** tool nel Debug Logger

**Core Features**:
- ✅ **Login XMPP** con popup glassmorphism
- ✅ **Auto-login** da localStorage
- ✅ **Lista conversazioni** con ricerca (cache-only)
- ✅ **Chat 1-to-1** con invio/ricezione real-time
- ✅ **vCard** (avatar, profilo utente)
- ✅ **MAM (Message Archive Management)** per storico messaggi (solo all'avvio)
- ✅ **Paginazione messaggi** (load more da cache)
- ✅ **Cache-first loading** (IndexedDB per account)
- ✅ **Isolamento storage multi-account** (un DB IndexedDB per JID; storico conservato al logout)
- ✅ **Offline support** (Service Worker)
- ✅ **Push Notifications** (XEP-0357) con abilitazione automatica
- ✅ **Delivery Receipts (XEP-0184)** + **Chat Markers (XEP-0333)** — Spunte WhatsApp 3 livelli
  - Livello 1: ✓ grigia (inviato al server XMPP)
  - Livello 2: ✓✓ grigie (XEP-0184 receipt)
  - Livello 3: ✓✓ blu (XEP-0333 displayed)
  - Overlay `deliveredUi` / `readingUi` + persistenza MAM
- ✅ **Typing indicators** (future - base implementata)
- ✅ **Presence** (online/offline status)
- ✅ **Debug Logger** (intercetta e visualizza tutti i console.log)

### 🚧 Roadmap legacy (non su `main` — da riportare in Flutter)

- 🚧 **Chat di gruppo (MUC)** - XEP-0045
- 🚧 **OMEMO (E2E Encryption)** - XEP-0384
- 🚧 **File upload** - XEP-0363
- 🚧 **Voice/Video calls** - Jingle (XEP-0166)
- 🚧 **Dark mode**
- 🚧 **Emoji picker**
- 🚧 **Markdown support**
- 🚧 **Message reactions**
- 🚧 **Message deletion** (locale - non server)
- 🚧 **PWA install prompt**

### ⚠️ Known Issues

Documentati in `docs/fixes/known-issues.md`:

1. **Push Notifications**: Richiede configurazione server XMPP con servizio push
2. **Password Storage**: Plain text in localStorage (encryption planned)
3. ~~**MAM Performance**: Sync iniziale può essere lenta con molti messaggi~~ ✅ RISOLTO v3.0 (sync incremental)
4. **Profile Photo**: Alcuni server XMPP non supportano vCard photo
5. ~~**Conversazioni account precedente visibili dopo cambio account**~~ ✅ RISOLTO v2.2 (IndexedDB per account — vedi `docs/fixes/account-storage-isolation.md`)

### 🔍 Testing Status

| Area | Copertura | Note |
|------|-----------|------|
| **E2E Tests** | ✅ Parziale | Playwright `e2e/inbox-load.spec.ts` (PR #114) |
| **Unit Tests** | ✅ Base | `test/unit/` modelli, storage, RPC parsing |
| **Widget Tests** | ✅ Base | `test/widget/` bolle, logo, provider listen |
| **SQL Smoke** | ✅ | `supabase/tests/schema_smoke.sql` |
| **CI** | ✅ | `flutter analyze` + `flutter test` in deploy-pages |
| **Integration Tests** | ❌ Nessuna | Pianificati per Q1 2026 |
| **Manual Testing** | ✅ Completo | Testing manuale su feature implementate |

### 📈 Performance (Alpha Flutter — online-only)

**Nota**: metriche legacy IndexedDB/XMPP non si applicano al client Flutter su `main`.

| Area | Comportamento |
|------|---------------|
| Inbox | Un round-trip RPC `list_conversations` |
| Chat | Realtime Supabase su canale `messages-{conversationId}` |
| Invio | Optimistic UI + RPC `send_message` |
| Web | Online-only (D-031) — nessuna cache offline |

**Ottimizzazioni legacy React** (tag `legacy/web-client-final`): sync-once, cache-first IndexedDB — vedi sezione legacy sotto.

### 🔒 Security Status

**Implementato**:
- ✅ WebSocket TLS (wss://)
- ✅ XMPP SASL authentication
- ✅ XEP-0077 In-Band Registration

**Da Implementare**:
- ❌ Password encryption in localStorage
- ❌ OMEMO (E2E encryption)
- ❌ CSP (Content Security Policy) headers
- ❌ Rate limiting client-side

### 📱 Browser Compatibility

**Supportato**:
- ✅ Chrome/Edge 90+ (desktop + mobile)
- ✅ Firefox 88+ (desktop + mobile)
- ✅ Safari 14+ (desktop + mobile)

**Richiede**:
- Service Worker support
- IndexedDB support
- WebSocket support
- ES2020 support

### 🎨 Design System

**Nome Ufficiale**: Alfred - Messaggistica istantanea

**Colore Istituzionale**: `#2D2926` (Dark Charcoal)
- Hover: `#3d3632`
- Active: `#1e1b19`
- Gradient: `linear-gradient(135deg, #2D2926, #4a433e)`
- Contrasto: 15.8:1 con bianco (WCAG AAA)

**Logo**: Spunta (✓) in cerchio — `client/lib/widgets/alfred_logo.dart` (Flutter); legacy in `SplashScreen.tsx` al tag

**Typography**: 
- Font Family: 'Inter', 'SF Pro Display', system-ui
- Heading: 24px/700, 20px/600, 18px/600
- Body: 14px/400, Small: 12px/400

**UI Pattern**: Ispirato a Telegram/WhatsApp web
- Layout: Sidebar + Main panel
- Componenti: Glassmorphism per modal
- Animazioni: 150-300ms ease-in-out

**CSS Files con colore**: index.css, ConversationsPage.css, ChatPage.css, NewConversationPopup.css, LoginPopup.css

---

## 🔄 Ultima Revisione

**Data**: 2026-06-24  
**Versione**: 3.1.0-alpha — Client Flutter + Supabase su `main`

**Modifiche Recenti** (v3.1.0-alpha — 24 giugno 2026):
- ✅ **PR #109**: app completa Flutter + schema dominio Supabase
- ✅ **PR #110**: passkeys `bundle.js` — fix schermo bianco Pages
- ✅ **PR #111**: multi-account switch senza logout forzato
- ✅ **PR #112**: RPC `list_conversations` inbox un round-trip
- ✅ **PR #113**: fix race auth web (`waitForSupabaseSessionReady`)
- ✅ **PR #115**: GIF in chat (`content_type`, `media_url`, bucket `chat-media`)
- ✅ **PR #114**: `ChangeNotifierProxyProvider` — fix UI inbox bloccata
- ✅ Documentazione: `alpha-pr-registry.md`, `flutter-inbox-stability.md`, sync PROJECT_MAP/CHANGELOG

**Modifiche precedenti** (v3.0.0-alpha — 24 giugno 2026):
- ✅ **PR #108**: UI chat Flutter + deploy Pages
- ✅ Rimosso `web-client/` — tag `legacy/web-client-final`

**Modifiche legacy** (v2.2 / v4.0 — giugno 2026, client React al tag):
- ✅ **Isolamento storage per account XMPP**:
  - Un IndexedDB per JID: `conversations-db-{account}`
  - `account-session.ts`, `switchAccountContext()`, `onAccountChanged()`
  - Logout: reset memoria React, **nessun wipe** dello storico locale
  - Migrazione automatica da `conversations-db` legacy
  - Fix: conversazioni di un account non più visibili nell'altro
  - Doc: `docs/fixes/account-storage-isolation.md`
- ✅ **Cursor rules**: `.cursor/rules/main.mdc` → obbligo lettura `.cursor-rules.md`

**Modifiche Recenti** (v4.0 - 16 giugno 2026):
- ✅ **Spunte WhatsApp 3 livelli** (XEP-0184 + XEP-0333):
  - Livello 1: ✓ grigia — conferma invio server XMPP
  - Livello 2: ✓✓ grigie — XEP-0184 delivery receipt (`receipt request` + listener `receipt`)
  - Livello 3: ✓✓ blu — XEP-0333 `displayed` (`markable` + `markDisplayed()`)
  - Virtual UI + overlay `deliveredUi`/`readingUi`; solo MAM scrive nel DB
  - `markerType: 'receipt' | 'displayed'`, `markerFor` = origin-id canonico
  - Policy documentata in `docs/architecture/message-states.md` v2.1

**Modifiche Precedenti** (v3.1 - 17 dicembre 2025):
- ✅ **Implementato XEP-0333 (Chat Markers)** — sostituito dal modello 3 livelli v4.0

**Modifiche Precedenti** (v3.0.1 - 17 dicembre 2025):
- ✅ **Ripristinato auto-login funzionante**:
  - ConnectionContext ora gestisce auto-login all'avvio con useEffect
  - Credenziali migrate da sessionStorage a localStorage per persistenza
  - LoginPopup riceve prop isInitializing per mostrare spinner durante auto-login
  - Documenti: XmppContext deprecato (sostituito da ConnectionContext)
- ✅ **Fix architetturale**:
  - Logica auto-login persa durante refactoring context ora ripristinata
  - auth-storage.ts ora usa localStorage invece di sessionStorage

**Modifiche Precedenti** (v3.0 - 15 dicembre 2025):
- ✅ **Implementata architettura "Sync-Once + Listen"**:
  - Sync SOLO all'avvio (full se DB vuoto, incremental se popolato)
  - Real-time messaging tramite Observer pattern
  - Eliminato pull-to-refresh (-100% overhead)
  - Riduzione 93% punti di sincronizzazione (da 15+ a 1)
  - Riduzione 70% codice sync (da ~1700 a ~530 righe)
  - Riduzione 95% query server durante utilizzo
- ✅ **Nuovi componenti**:
  - `AppInitializer.tsx` - Wrapper per sync startup
  - `sync-initializer.ts` - Orchestrazione sync (full/incremental)
  - `sync-status.ts` - Observable sync status per UI
- ✅ **Rimossi componenti obsoleti** (eliminati dal codebase):
  - `usePullToRefresh.ts`
  - `sync.ts`
  - `SyncService.ts`
  - `src/repositories/` (duplicato non usato)
  - `App.css` (landing page legacy)
- ✅ **UI improvements**:
  - Loading spinner in ConversationsPage durante sync
  - "Clear DB" button in DebugLogPopup
- ✅ **Documentazione aggiornata**:
  - PROJECT_MAP.md (questo file)
  - docs/implementation/sync-system-complete.md (completamente riscritto)
  - docs/architecture/README.md
  - README.md principale

---

## 📞 Contatti e Risorse

- **Repository**: GitHub (URL da configurare)
- **Documentazione Completa**: `/workspace/docs/`
- **Issues**: GitHub Issues
- **License**: MIT (vedi `/workspace/LICENSE`)

---

**Nota**: Questo documento è generato e mantenuto come "punto di verità" per il progetto Alfred. Deve essere aggiornato ad ogni cambio significativo di architettura, dipendenze, o responsabilità.
