# Glossario — contesto shareable-link

**Bounded context:** `shareable-link`  
**Ultima revisione:** 2026-07-18  
**Promessa SDD:** [PROM-SHAREABLE-LINK](../../specs/promises/product/PROM-SHAREABLE-LINK.md)

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **Fragment** | Segmento URL dopo `#` — identità stabile della risorsa (profilo o chat). |
| **ShareableLinkTarget** | Destinazione parsata: indirizzo normalizzato + kind (`profile` \| `chat`). |
| **Canonical address** | `username` o `username@server` con server = `AppConfig.imServerId`. |
| **ParseFragment** | Legge e normalizza il fragment; ignora `push-chat/*`. |
| **OpenFromShareableLink** | Comando verso navigation per `#indirizzo/chat` sull'account in focus. |
| **NotFound** | Peer/gruppo inesistente o indirizzo non risolvibile su questa istanza. |
| **Adapter** | `ShareableLinkListener` → `ShareableLinkController` → macchina → navigation. |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **navigation** | `#…/chat` → `OpenFromShareableLink` → `openConversationOnAccount` (clear stale + fallback profilo). |
| **multi-account** | Richiede `sessionReady` + ≥1 account; risorsa sull'account in focus. |
| **profile** | `#indirizzo` (senza `/chat`) → overlay scheda profilo peer. |

---

## Invarianti

1. Il link identifica la **risorsa**, non l'account del visitatore.
2. Fragment `push-chat/*` è riservato alle notifiche push — non shareable-link.
3. Peer proprio (`profile.id == focusedUserId`) → fragment ignorato, nessun errore.
4. Con 0 account aperti il target resta in coda fino a `sessionReady`.
