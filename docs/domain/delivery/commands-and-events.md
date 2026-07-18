# Comandi ed eventi — contesto delivery

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/delivery/](../../model/uml/delivery/)  
**Nota:** nessuno statechart client — solo sequenze worker.

---

## Comandi (account RPC → accodano outbox)

| Comando | Emesso da | Outbox `event_kind` | Descrizione |
|---------|-----------|---------------------|-------------|
| `EnqueueDeliver` | `send_message_to_profile` | `deliver` | INSERT copia mittente + payload λ, recipient, snapshot contenuto. |
| `EnqueueGroupErogate` | `broadcast_message_to_allowlist` | `group_erogate` | INSERT riga archivio gruppo + payload broadcast. |
| `EnqueueReadReceipt` | `mark_peer_read` | `read_receipt` | Per ogni λ letto: payload `sender_profile_id`, `reader_id`. |

Ogni accodamento termina con `perform alfred_delivery.process_outbox(outbox_id)` nella stessa transazione (internal).

---

## Comandi worker (`alfred_delivery`)

| Comando | Handler | Descrizione |
|---------|---------|-------------|
| `ProcessOutbox` | `process_outbox(uuid)` | Legge `event_kind`; delega a handler. |
| `DeliverInternal` | `deliver_internal(uuid)` | Gate + INSERT destinatario/gruppo + `delivered_at` + eventuale erogazione. |
| `GroupErogate` | `group_erogate(uuid)` | Fan-out da riga archivio gruppo. |
| `ErogateGroupMessage` | `erogate_group_message(...)` | Loop allow list partecipanti con gate per-partecipante. |
| `ProcessReadReceipt` | `process_read_receipt(uuid)` | Chiama `propagate_read_receipt`. |
| `PropagateReadReceipt` | `propagate_read_receipt(λ, sender)` | UPDATE `read_at` copia mittente. |
| `CompleteOutbox` | tutti gli handler | `outbox.status = completed`, `updated_at = now()`. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `OutboxQueued` | Riga outbox INSERT con `status = queued`. |
| `DeliveryGatePassed` | `is_sender_allowed_for_reception` (e bidirezionale se gruppo) true. |
| `DeliveryGateRejected` | Gate fallito; payload `reception_rejected: true`; nessuna copia destinatario. |
| `RecipientCopyMaterialized` | INSERT `messages` su archivio destinatario o gruppo. |
| `SenderDeliveredAtSet` | UPDATE `delivered_at` su copia mittente (✓✓ grigie). |
| `GroupArchiveUpdated` | Messaggio umano inserito in storico gruppo (`owner_id = gruppo`). |
| `ParticipantCopyErogated` | INSERT copia proxy su archivio partecipante (stesso λ). |
| `ReadAtPropagated` | UPDATE `read_at` su copia mittente da read receipt. |
| `OutboxCompleted` | Handler terminato; outbox `completed`. |
| `PushNotifyEnqueued` | (SYS-PUSH) Post-recapito riuscito — `event_kind = push_notify`. |

---

## Policy (Event Storming)

| Policy | Trigger | Azione |
|--------|---------|--------|
| **Gate before deliver** | `ProcessOutbox` + `event_kind = deliver` | Valuta reception allow list destinatario prima di INSERT. |
| **Bidirectional group gate** | Destinatario o mittente è gruppo | Richiede allow list in **entrambe** le direzioni. |
| **Auto-erogate on group receive** | INSERT storico gruppo da umano | `erogate_group_message` nella stessa transazione. |
| **Silent skip erogation** | Partecipante non passa gate | `continue` nel loop — nessun effetto su spunte originali. |
| **No cross-boundary RPC** | Qualsiasi account RPC | Vietato INSERT/UPDATE su archivio altrui. |

---

## Stati operativi outbox

| Stato | Significato |
|-------|-------------|
| `queued` | In attesa di consumer (`process_outbox` o bridge). |
| `processing` | (futuro async) Consumer ha claimato la riga. |
| `completed` | Handler terminato (anche su rejection silenziosa). |
| `failed` | Errore transazione; `last_error` valorizzato. |

Su internal sincrono, transizione `queued` → `completed` è atomica nella RPC account.

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Outbox bus, event_kind | SYS-DELIVERY-001–009 |
| Worker schema e handler | SYS-DELIVERY-010–017 |
| Spunte via worker | SYS-DELIVERY-018–020 |
| Gate in deliver_internal | SYS-RECEPTION + SYS-DELIVERY-012 |
| Gruppo / erogazione | SYS-GROUP-015–026 |
