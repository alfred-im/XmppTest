# Contesto: delivery

**Stato modellazione:** `documented`

## Mapping dominio → implementazione

| Dominio | SQL / worker |
|---------|--------------|
| `QueueDelivery` | `EnqueueDeliver` → outbox `deliver` |
| `QueueReadReceipt` | `EnqueueReadReceipt` |
| `QueueGroupFanOut` | `EnqueueGroupErogate` |
| `ProcessDeliveryQueue` | `process_outbox` |
| `RecipientNotified` | INSERT copia destinatario + `delivered_at` |
| `DeliverySilentlyBlocked` | gate fail → outbox completed senza recipient |

Schema: `alfred_delivery` · Migrazione: `20260711190000_account_boundary_delivery.sql`
