# Comandi ed eventi — contesto federation

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/federation/](../../model/uml/federation/)

Target — bridge attualmente stub.

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `QueueFederatedSend` | Policy (invio verso esterno) | Accoda messaggio per bridge. |
| `DeliverToFederatedPeer` | Bridge | Invia verso server esterno del peer. |
| `ReceiveFromFederatedPeer` | Bridge | Riceve messaggio da server esterno. |
| `ApplyFederatedAck` | Bridge | Propaga conferme recapito/lettura esterne. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `FederatedSendQueued` | In attesa di bridge. |
| `FederatedMessageDelivered` | Server esterno ha accettato. |
| `InboundFederatedMessageReceived` | Messaggio esterno materializzato in archivio Alfred. |
| `FederatedAckApplied` | Spunte aggiornate da protocollo esterno. |

---

## Policy

| Policy | Descrizione |
|--------|-------------|
| **Bridge stateless** | Stato autorevole solo su piattaforma. |
| **Stesso modello caselle** | Copie archivio indipendenti con correlazione logica. |
| **Gate reception su inbound** | Allow list anche per messaggi federati in ingresso. |
