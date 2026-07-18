# Comandi ed eventi — contesto shareable-link

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/shareable-link/](../../model/uml/shareable-link/)

---

## Comandi (intento)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `ParseFragment` | `ShareableLinkListener` (hashchange / bootstrap) | Normalizza fragment `#`; aggiorna target o torna idle. |
| `HandleTargetRequested` | Listener / `ShareableLinkController` | Tenta risoluzione se `sessionReady` e target in coda. |
| `SessionBecameReady` | Auth pronta con account aperti | Sblocca consumo target in coda. |
| `OpenFromShareableLink` | Macchina → adapter navigation | `#indirizzo/chat` → focus account + open chat (delega). |
| `ShowProfileFromLink` | Macchina → effetti UI | `#indirizzo` → overlay profilo peer. |
| `DismissNotFound` | `ShareableLinkNotFoundScreen` | Azzera stato not-found e fragment. |

---

## Eventi di dominio

| Evento | Dopo | Descrizione |
|--------|------|-------------|
| `FragmentParsed` | `ParseFragment` ok | Target in coda (`targetQueued`). |
| `FragmentCleared` | fragment assente o invalido | Torna idle. |
| `TargetDeferred` | `!sessionReady` o 0 account | Target conservato in coda. |
| `ProfileResolved` | lookup username ok | Profilo trovato in DB locale. |
| `ProfileNotFound` | lookup fallito | `NotFound` — UI 404. |
| `SelfPeerIgnored` | peer == account in focus | Target scartato senza errore. |
| `ChatOpenedFromLink` | `OpenFromShareableLink` ok | Navigation ha aperto chat corretta. |
| `ProfileOverlayShown` | `ShowProfileFromLink` | Scheda profilo peer visibile. |

---

## Policy

| Policy | Trigger | Azione |
|--------|---------|--------|
| **Attendi sessione** | target + `!sessionReady` | `TargetDeferred` |
| **No guest** | 0 account | overlay auth (multi-account); target resta in coda |
| **Clear stale chat** | `#peer/chat` con chat su altro peer | navigation `clearStaleConversationUnlessPeer` |
| **Fallback profilo** | peer assente da inbox | lookup profilo + `openConversation` |

---

## Tracciabilità SDD

| Elemento modello | Promessa |
|------------------|----------|
| Formato fragment | PROM-SHAREABLE-LINK-001–007 |
| Multi-account / auth | PROM-SHAREABLE-LINK-010–012 |
| `#…/chat` senza stale | PROM-SHAREABLE-LINK-004, 024 |
| Not found | PROM-SHAREABLE-LINK-006 |
| **Condivisione profilo** | PROM-SHAREABLE-LINK-003 |
