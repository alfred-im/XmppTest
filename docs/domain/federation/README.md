# Contesto: federation

**Stato modellazione:** `documented` (runtime stub)

## Mapping dominio → implementazione (target)

| Dominio | Implementazione |
|---------|-----------------|
| `QueueFederatedSend` | outbox `protocol = xmpp\|matrix` |
| `DeliverToFederatedPeer` | bridge claim + translate |
| `ReceiveFromFederatedPeer` | `IngestExternalMessage` |
| `ApplyFederatedAck` | UPDATE spunte via `external_id` |

Attuale: `bridge-xmpp` / `bridge-matrix` — solo `GET /health`
