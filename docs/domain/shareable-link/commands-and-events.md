# Comandi ed eventi — contesto shareable-link

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/shareable-link/](../../model/uml/shareable-link/)

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `ResolveSharedLink` | Policy (URL / fragment) | Interpreta link condiviso e determina target. |
| `OpenSharedChat` | Policy | Apre chat da link condiviso. |
| `OpenSharedProfile` | Policy | Mostra profilo da link condiviso. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `SharedLinkResolved` | Target identificato (profilo o chat). |
| `SharedLinkPending` | Target in attesa di sessione o account. |
| `SharedLinkInvalid` | Indirizzo non riconosciuto o profilo assente. |
| `SharedChatOpened` | Chat aperta da link. |
| `SharedProfileShown` | Profilo mostrato da link. |

---

## Policy

| Policy | Descrizione |
|--------|-------------|
| **Attendi autenticazione** | Senza account, target resta in coda. |
| **Nessuna chat stale** | Link chat chiude conversazione su altro peer. |
| **Self ignorato** | Link al proprio profilo non apre chat con sé stessi. |
