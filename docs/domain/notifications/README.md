# Contesto: notifications

**Stato modellazione:** `verified`

## Mapping dominio → implementazione

| Dominio | Statechart / SW | Codice |
|---------|-----------------|--------|
| `RegisterDeviceForPush` | `SyncSubscriptions` | `PushSubscriptionService` |
| `UnregisterDeviceFromPush` | `UnregisterSubscription` | cleanup account |
| `UpdateInChatSuppression` | `UpdateSuppressionState` | `PushSuppressionBinder` → SW |
| `PresentPushNotification` | `HandlePushPayload` | service worker |
| `OpenChatFromNotification` | `OpenFromPushTap` → navigation | `NotificationsMachine` |

Statechart: `client/lib/machines/notifications/`
