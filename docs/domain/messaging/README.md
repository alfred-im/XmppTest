# Contesto: messaging

**Stato modellazione:** `verified`

## Artefatti

| Livello | File |
|---------|------|
| Dominio | [glossary.md](./glossary.md), [commands-and-events.md](./commands-and-events.md) |
| UML | [messaging-state.puml](../../model/uml/messaging/messaging-state.puml), sotto-macchine in `messaging/` |
| Statechart | [client/lib/machines/messaging/](../../../client/lib/machines/messaging/) |

## Mapping dominio → implementazione

| Dominio (DDD) | UML / statechart | Codice |
|---------------|------------------|--------|
| `OpenConversation` | `LoadMessages`, `AttachRealtime`, `MarkRead` | `MessagingCoordinator` init ciclo |
| `SendContent` | `SendStarted` → `SendAcknowledged` / `SendFailed` | `SendMessage`, `SendGif`, `SendVoice`, … |
| `RetryFailedSend` | `RetryStarted` | `RetryMessage` |
| `RefreshConversation` | `ReloadMessages` | reload su `ConversationLoadMachine` |
| `ConversationReady` | `MessagesLoaded` / stato `Ready` | lista messaggi in UI |
| `ContentSent` | `SendAcknowledged` | merge riga server |
| `ContentSendFailed` | `SendFailed` | coda `OutboundMessageQueue` |
| `ConversationUpdated` | `RealtimeReceived`, `DeliveryTickReceived` | merge realtime |

| Componente | Ruolo |
|------------|-------|
| `MessagingCoordinator` | Compone le tre macchine |
| `MessagesController` | Facade UI |
| `MessagesControllerEffects` | RPC, coda, media, realtime |
| `MessageService` | Piattaforma mailbox + realtime |
