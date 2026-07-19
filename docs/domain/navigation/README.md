# Contesto: navigation

**Stato modellazione:** `verified`

## Mapping dominio → implementazione

| Dominio | Statechart | Codice |
|---------|------------|--------|
| `ShowInbox` | `SwitchToAccount` / `InboxVisible` | `NavigationMachine` |
| `OpenConversation` | `OpenPeerOnFocusedAccount`, `OpenConversationOnAccount`, `OpenFromPushTap`, `OpenFromShareableLink`, `OpenFromCompose` | adapter per ingresso |
| `CloseConversation` | `CloseConversation` | `NavigationMachine` |
| `EnterGroupShell` | `SwitchToAccount` [gruppo] | `GroupShell` |
| `OpenGroupConversation` | `OpenGroupChat` | shell gruppo |
| `LeaveGroupConversation` | `BackToGroupHome` | shell gruppo |

Statechart: `client/lib/machines/navigation/` · `NavigationCoordinator`
