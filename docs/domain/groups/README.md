# Contesto: groups

**Stato modellazione:** `verified`

## Mapping dominio → implementazione

| Dominio | Statechart | Codice |
|---------|------------|--------|
| `ViewGroupHome` | `LoadGroupHome` | `GroupHomeMachine` |
| `OpenGroupConversation` | `InitGroupMessages` | `GroupMessagesMachine` |
| `BroadcastToGroup` | `BroadcastRequested` | `broadcast*ToAllowlist` |
| `GroupBroadcastSent` | `BroadcastAcknowledged` | reload storico |
| `GroupConversationUpdated` | `OwnerRealtimeReceived` | realtime archivio gruppo |

Statechart: `client/lib/machines/groups/` · `GroupHomeCoordinator`, `GroupMessagesCoordinator`
