# Alfred Client (Flutter)

Client ufficiale Alfred — multi-piattaforma (web, mobile, desktop).

## Stato

Client — collegato a Supabase (contatti, inbox, chat realtime, profilo, **multi-account**).

| | |
|---|---|
| **Multi-account** | Manifest con tutti gli account aperti; **una** sessione GoTrue in RAM (focus); switch = focus UI + restore |
| **Auth** | Overlay su shell (`AuthOverlay`), non schermata piena |
| **Live (dev demo)** | https://alfred-im.github.io/XmppTest/ |
| **Layout** | Lista inbox + chat (stile WhatsApp Web) |
| **Inbox** | RPC `list_inbox()` — aggregazione on-read su `messages` |
| **Chat** | Identificata da `peer_profile_id` (`ChatPeer`) |
| **Media** | Testo, GIF, voice (WebM/Opus), location (mappa OSM) |
| **Nuovo messaggio** | FAB → username → stessa chat (vuota o con storico) |
| **Ricezione** | Allow list personale (`reception_allowlist`) — UI «Persone consentite» + toggle in scheda profilo peer (tap avatar) |
| **Profilo peer** | Overlay fullscreen al tap avatar — Allow + rubrica + CTA «Inizia a chattare» + Condividi — `PROM-PEER-PROFILE`, `SURF-PEER-PROFILE` |
| **Link condivisibili** | Fragment `#username` / `#username/chat`; share di sistema — `PROM-SHAREABLE-LINK` |
| **Gruppi** | Account `profile_kind = group`; `GroupHomePanel` + chat; partecipazione allow list bidirezionale — `SYS-GROUP` |
| **Invio** | `send_message_to_profile` |
| **Gate test** | `verify.sh` — **161** test unit/widget (zero issue analyze) |

## Test

Catalogo e launcher unificato:

```bash
cd client
bash scripts/test.sh list        # tutte le suite (gate + manuali)
bash scripts/test.sh gate        # gate CI — obbligatorio prima di git push
bash scripts/test.sh e2e-multi   # Playwright multi-account (scope attuale)
bash scripts/test.sh manual      # integration + e2e-multi + live
```

Dettaglio: [`scripts/test/README.md`](scripts/test/README.md)

Gate CI (equivale a `test.sh gate`): `bash scripts/verify.sh`

## Struttura

```
lib/
├── models/      # ChatPeer, ChatMessage, OpenAccount, …
├── services/    # AccountManager, AccountSession, InboxService, …
├── screens/     # HomeScreen (shell), GroupConversationScreen, AppShell, …
├── providers/   # AuthController, InboxController, GroupMessagesController, MessagesController, …
└── widgets/     # AuthOverlay, InboxPanel, ChatPanel, PeerProfileOverlay, …
```

Vedi `docs/decisions/multi-account-parallel-sessions.md`, `docs/implementation/multi-account-client.md`, `docs/implementation/groups-client.md`, `docs/implementation/peer-profile-overlay.md`, `PROJECT_MAP.md`.
