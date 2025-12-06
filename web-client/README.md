# Web Client - Note Tecniche

Note tecniche web client per riferimento AI. Vedi `/workspace/PROJECT_MAP.md` per architettura completa.

## Stack

- React 19.2.0 + TypeScript 5.9.3
- Vite 7.2.4 (dev server + bundler)
- Stanza.js 12.21.0 (XMPP WebSocket/BOSH)
- idb 8.0.3 (IndexedDB wrapper)
- CSS modulare, no framework UI

## Build

```bash
npm install
npm run dev        # Dev server localhost:5173/XmppTest/
npm run build      # Production build → dist/
npm run preview    # Preview production build
```

## XMPP Configuration

**Default Server**: `jabber.hot-chilli.net`

**WebSocket Discovery**: XEP-0156 automatico
1. Prova `https://domain/.well-known/host-meta`
2. Fallback `wss://domain:5281/xmpp-websocket`
3. Se fallisce: errore connessione

**Note**: Server deve supportare CORS su WebSocket

## GitHub Pages Deploy

Workflow `.github/workflows/deploy-pages.yml` automatico su push main:
- `npm ci --prefix web-client`
- `npm run build --prefix web-client`
- Deploy `dist/` via actions/deploy-pages

**Setup**: Settings → Pages → Source = GitHub Actions (prima volta)

## Riferimenti

Vedi `/workspace/docs/` per analisi dettagliate implementazioni e decisioni architetturali.
