# Comandi ed eventi — contesto federation

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/federation/](../../model/uml/federation/)  
**Runtime:** stub — eventi documentati per implementazione bridge.

---

## Comandi outbound (target)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `EnqueueFederatedDeliver` | RPC account (futuro branch `protocol != internal`) | INSERT outbox `protocol = xmpp|matrix`, `status = queued`. |
| `ClaimOutboxJob` | Bridge worker | SELECT … FOR UPDATE SKIP LOCKED su outbox/bridge_jobs. |
| `TranslateToExternal` | Bridge | Payload Alfred → stanza XMPP / event Matrix. |
| `PersistExternalId` | Bridge post-invio | UPDATE copia mittente `external_id`; outbox `completed`. |
| `EnqueueFederatedReadReceipt` | (futuro) | Outbox read verso bridge per XEP-0333 / m.receipt. |

---

## Comandi inbound (target)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `PollExternalSync` | Bridge scheduler | Legge `sync_cursors`; fetch MAM/Matrix sync. |
| `IngestExternalMessage` | Bridge | Normalizza evento esterno → INSERT copia destinatario Alfred. |
| `ApplyReceptionGate` | Piattaforma fase B | `is_sender_allowed_for_reception` prima di materializzare. |
| `MapExternalAck` | Bridge | Ack esterno → UPDATE `delivered_at`/`read_at` via λ o `external_id`. |
| `AdvanceSyncCursor` | Bridge | UPDATE `sync_cursors` dopo batch processato. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `FederatedOutboxQueued` | Outbox con `protocol != internal`; attende bridge. |
| `BridgeJobClaimed` | Worker ha lock su job/outbox row. |
| `ExternalSendSucceeded` | Server federato ha accettato messaggio; `external_id` noto. |
| `ExternalSendFailed` | Outbox `failed` o retry con backoff. |
| `InboundMessageMaterialized` | Copia destinatario Alfred creata da bridge. |
| `InboundRejected` | Gate reception nega materializzazione inbound. |
| `ExternalDeliveryAck` | XEP-0184 / equivalente → tick `delivered_at` mittente. |
| `ExternalReadAck` | XEP-0333 / m.receipt → tick `read_at` mittente. |
| `SyncCursorAdvanced` | Watermark aggiornato — bridge può riavviare senza perdita. |

---

## Stati outbox federato (target)

| Stato | Significato |
|-------|-------------|
| `queued` | In attesa claim bridge (stato attuale su invio federato). |
| `processing` | Bridge sta eseguendo invio/sync. |
| `completed` | Esito persistito su piattaforma. |
| `failed` | Esauriti retry; richiede intervento o dead-letter. |

---

## Sistemi esterni (rosa Event Storming)

| Sistema | Ruolo |
|---------|-------|
| `bridge-xmpp` | Facciata XMPP (slixmpp futuro). |
| `bridge-matrix` | Facciata Matrix (matrix-nio futuro). |
| Server XMPP/Matrix peer | Fonte di verità lato controparte federata. |

---

## Implementazione attuale

Solo `HealthCheck` su entrambi i bridge:

```
GET /health → {"status": "ok", "service": "alfred-bridge-xmpp|matrix"}
```

Nessun consumer outbox federato in produzione. Vedi [seq-federation-stub.puml](../../model/uml/federation/seq-federation-stub.puml).

---

## Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [bridge-stateless.md](../../decisions/bridge-stateless.md) | Regola vincolante stato su piattaforma |
| [full-stack.md](../../architecture/full-stack.md) § integrazione bridge |
| [SYS-DELIVERY](../../specs/promises/system/SYS-DELIVERY.md) | Outbox condiviso internal/federato |
| [mailbox-inbox-outbox-spec.md](../../architecture/mailbox-inbox-outbox-spec.md) | Identificatori λ / external_id |
