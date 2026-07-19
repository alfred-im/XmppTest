# Comandi ed eventi — contesto delivery

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/delivery/](../../model/uml/delivery/)

Worker server — nessuno statechart client.

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `QueueDelivery` | Policy (invio account) | Accoda recapito messaggio al destinatario. |
| `QueueReadReceipt` | Policy (lettura) | Accoda propagazione spunta lettura al mittente. |
| `QueueGroupFanOut` | Policy (broadcast gruppo) | Accoda erogazione verso partecipanti. |
| `ProcessDeliveryQueue` | Policy (worker) | Elabora prossimo evento in coda. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `RecipientNotified` | Copia destinatario materializzata. |
| `DeliveryCompleted` | Evento in coda elaborato. |
| `ReadReceiptPropagated` | Spunta lettura visibile al mittente. |
| `GroupFanOutCompleted` | Erogazione gruppo terminata. |

---

## Policy

| Policy | Descrizione |
|--------|-------------|
| **Gate reception prima del recapito** | Allow list valutata sul destinatario. |
| **Nessuna scrittura cross-archivio** | Solo il worker attraversa il confine tra archivi. |
| **Rifiuto silenzioso** | Gate fallito non genera errore verso il mittente. |
