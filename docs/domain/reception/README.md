# Contesto: reception

**Stato modellazione:** `verified`

## Mapping dominio → implementazione

| Dominio | Statechart / server | Codice |
|---------|---------------------|--------|
| `AllowSender` | `AddAllowedProfile` | `ReceptionAllowlistService` |
| `DisallowSender` | `RemoveAllowedPerson` | `ReceptionAllowlistService` |
| `SearchCandidateSenders` | `SearchProfiles` | allow list UI |
| `EvaluateInboundDelivery` | `DeliverInternal` + gate | `alfred_delivery` worker |
| `DeliveryPermitted` | `DeliveryAccepted` | INSERT copia destinatario |
| `DeliverySilentlyBlocked` | `DeliverySilentlyRejected` | outbox completed, no recipient |

Statechart: `client/lib/machines/reception/` · `ReceptionCoordinator`
