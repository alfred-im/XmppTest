# Comandi ed eventi — contesto federation

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/federation/](../../model/uml/federation/)  
**Runtime:** stub — eventi documentati per implementazione bridge (profilo Platform).

---

## Comandi outbound (target)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `EnqueueFederatedDeliver` | Policy (confine account, protocollo esterno) | Accoda outbox con protocollo xmpp/matrix in attesa bridge. |
| `ClaimOutboxJob` | Bridge worker | Claim atomico su job outbox disponibile. |
| `TranslateToExternal` | Bridge | Traduce payload Alfred in messaggio protocollo esterno. |
| `PersistExternalId` | Bridge post-invio | Persiste id esterno sulla copia mittente; completa outbox. |
| `EnqueueFederatedReadReceipt` | (futuro) | Accoda read receipt verso bridge per protocollo esterno. |

---

## Comandi inbound (target)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `PollExternalSync` | Bridge scheduler | Legge watermark sync e recupera batch dal server federato. |
| `IngestExternalMessage` | Bridge | Normalizza evento esterno in copia destinatario Alfred. |
| `ApplyReceptionGate` | Policy (materializzazione inbound) | Valuta allow list prima di creare copia destinatario. |
| `MapExternalAck` | Bridge | Ack esterno → aggiorna spunte copia mittente via id logico o id esterno. |
| `AdvanceSyncCursor` | Bridge | Aggiorna watermark sync dopo batch processato. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `FederatedOutboxQueued` | Outbox con protocollo esterno; attende bridge. |
| `BridgeJobClaimed` | Worker ha lock su job outbox. |
| `ExternalSendSucceeded` | Server federato ha accettato messaggio; id esterno noto. |
| `ExternalSendFailed` | Outbox failed o retry con backoff. |
| `InboundMessageMaterialized` | Copia destinatario Alfred creata da bridge. |
| `InboundRejected` | Gate reception nega materializzazione inbound. |
| `ExternalDeliveryAck` | Ack recapito esterno → spunta doppia mittente. |
| `ExternalReadAck` | Ack lettura esterno → spunta lettura mittente. |
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

## Sistemi esterni

| Sistema | Ruolo |
|---------|-------|
| **Bridge XMPP** | Facciata verso server XMPP (implementazione futura). |
| **Bridge Matrix** | Facciata verso server Matrix (implementazione futura). |
| **Server federato peer** | Fonte di verità lato controparte esterna. |

---

## Tracciabilità

| Documento | Ruolo |
|-----------|----------|
| [bridge-stateless.md](../../decisions/bridge-stateless.md) | Stato autorevole su piattaforma |
| [SYS-DELIVERY](../../specs/promises/system/SYS-DELIVERY.md) | Outbox condiviso internal/federato |
| [mailbox-inbox-outbox-spec.md](../../architecture/mailbox-inbox-outbox-spec.md) | Identificatori λ / external_id |
