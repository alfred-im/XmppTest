# Test Credentials (Riferimento Tecnico)

Credenziali account di test configurati su conversations.im per sviluppo e testing. Documento per riferimento rapido AI.

## Accesso Produzione

**URL**: https://alfred-im.github.io/XmppTest/

Usa uno degli account sotto per accedere alla versione live dell'applicazione.

## Account Disponibili

### Server: conversations.im

| Account | JID | Password | Note |
|---------|-----|----------|------|
| Account 1 | `testardo@conversations.im` | `FyqnD2YpGScNsuC` | Avatar WebP configurato, account principale test |
| Account 2 | `testarda@conversations.im` | `FyqnD2YpGScNsuC` | Avatar WebP configurato, account secondario test |

## WebSocket Configuration

**Endpoint Corretto**:
```
wss://xmpp.conversations.im:443/websocket
```

**Discovery**: XEP-0156 supportato via `https://conversations.im/.well-known/host-meta`

**Note**: NON usare `wss://conversations.im/xmpp-websocket` (404 error)

## Feature Testing Status

Testing eseguito il 2025-11-30:

| Feature | Status | Note |
|---------|--------|------|
| XMPP Connection | ✅ OK | WebSocket stabile |
| vCard Download | ✅ OK | Avatar WebP funzionanti |
| Messaging | ✅ OK | Real-time send/receive |
| Roster | ✅ OK | Contact list working |

## Known Issues

**WebSocket Fallback**: Se discovery fallisce, il fallback URL era errato (`/ws` invece di `/websocket`). Correggere in `xmpp.ts` se necessario.

**XML Parser**: DOMParser può avere problemi con namespace XML in host-meta. Fallback regex implementato.

## Test Automatizzati

Config per test E2E:

```javascript
const TEST_ACCOUNTS = {
  account1: { jid: 'testardo@conversations.im', password: 'FyqnD2YpGScNsuC' },
  account2: { jid: 'testarda@conversations.im', password: 'FyqnD2YpGScNsuC' }
};
```

---

**Ultimo aggiornamento**: 2025-12-06
