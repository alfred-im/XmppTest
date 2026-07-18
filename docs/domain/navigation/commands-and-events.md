# Comandi ed eventi — contesto navigation

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/navigation/](../../model/uml/navigation/)

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `SwitchToAccount` | Sidebar | Solo focus + inbox (no chat). Se account gruppo → `GroupShell`. |
| `OpenPeerOnFocusedAccount` | Tap riga inbox / contatto | Chat su account già in focus. |
| `OpenConversationOnAccount` | Compose | Focus + resolve peer + open chat. |
| `OpenFromPushTap` | Adapter notifications | `openConversationFromPushTap`: clear stale, focus, retry inbox, fallback profilo. |
| `OpenFromShareableLink` | Adapter shareable-link | `openConversationOnAccount` con clear stale + fallback profilo. |
| `CloseConversation` | Back mobile / chiudi chat | Torna a inbox (`InboxVisible`) o group home (`GroupShell`). |
| `OpenGroupChat` | Tap conversazione in group home | Apre chat gruppo (resta in `GroupShell`). |
| `BackToGroupHome` | Back da chat gruppo | Torna al pannello home gruppo. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `NavigationIdle` | Inbox visibile, nessuna chat aperta (`InboxVisible`). |
| `ConversationOpened` | Chat 1:1 aperta con peer risolto (`ChatOpen`). |
| `GroupShellEntered` | Account gruppo in focus — home gruppo visibile. |
| `GroupChatOpened` | Chat gruppo aperta dentro `GroupShell`. |
| `NavigationRejected` | Peer non trovato, self-peer, account non aperto. |
| `AccountFocusRequired` | Delega `FocusAccount` a multi-account. |

---

## Transizioni shell (per account in focus)

| Da | Comando / condizione | A |
|----|----------------------|---|
| `InboxVisible` | `OpenPeerOnFocusedAccount` / `OpenConversationOnAccount` ok | `ChatOpen` |
| `ChatOpen` | `CloseConversation` | `InboxVisible` |
| `*` | `SwitchToAccount` su account gruppo | `GroupShell` |
| `GroupShell` | `OpenGroupChat` | `GroupShell` (chat gruppo) |
| `GroupShell` | `BackToGroupHome` / `CloseConversation` | `GroupShell` (home) |
| `InboxVisible` | `SwitchToAccount` su account utente | `InboxVisible` |

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Shell sempre visibile | PROM-MULTI-ACCOUNT-001 |
| `OpenFromPushTap` | PROM-PUSH-NOTIFY-030/036, seq-notification-click |
| `OpenFromShareableLink` | PROM-SHAREABLE-LINK-004 |
| `CloseConversation` | PROM-MULTI-ACCOUNT-010 (AccountViewState) |
| `GroupShell` | SURF-GROUP-SHELL |
