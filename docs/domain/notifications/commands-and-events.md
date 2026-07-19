# Comandi ed eventi — contesto notifications

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/notifications/](../../model/uml/notifications/)

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `RegisterDeviceForPush` | Policy | Registra il device per tutti gli account aperti. |
| `UnregisterDeviceFromPush` | Policy | Rimuove registrazione push del device. |
| `UpdateInChatSuppression` | Policy | Comunica al service worker se sopprimere notifiche. |
| `PresentPushNotification` | Service worker | Valuta e mostra o sopprime una push ricevuta. |
| `OpenChatFromNotification` | Utente (tap) | Apre la chat indicata dalla notifica. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `PushRegistrationSucceeded` | Device registrato per push. |
| `PushRegistrationSkipped` | Browser non supporta push o permesso negato. |
| `NotificationShown` | Notifica visibile all'utente. |
| `NotificationSuppressed` | Notifica non mostrata (chat attiva). |
| `ChatOpenFromNotificationSucceeded` | Chat aperta da tap notifica. |
| `ChatOpenFromNotificationDeferred` | Tap salvato fino a sessione pronta. |
| `ChatOpenFromNotificationFailed` | Account o peer non risolvibili. |

---

## Policy

| Policy | Descrizione |
|--------|-------------|
| **Chiave conversazione** | Ogni notifica identifica account destinatario **e** peer. |
| **Soppressione in chat** | Nessuna notifica se quella chat è già aperta in foreground. |
| **Tap serializzato** | Tap multipli non lasciano chat su peer sbagliato. |

---

## Sistemi esterni

| Sistema | Ruolo |
|---------|------|
| **Browser Push** | Permesso, subscription, visualizzazione. |
| **Service worker** | Ricezione push e tap. |
| **Piattaforma** | Registro subscription e invio push server. |
