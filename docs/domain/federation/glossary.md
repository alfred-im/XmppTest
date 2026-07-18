# Glossario — contesto federation

**Bounded context:** `federation`  
**Ultima revisione:** 2026-07-18  
**Stato runtime:** bridge stub (health only); modello documentato per implementazione futura.

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **Federation** | Messaggistica verso/ da server esterni (XMPP, Matrix) tramite bridge Python su Fly.io. |
| **contact_protocol** | Enum `internal`, `xmpp`, `matrix` — routing backend; invisibile in inbox UI standard. |
| **Bridge (stateless)** | Processo `bridge-xmpp` / `bridge-matrix` senza stato business locale — vedi [bridge-stateless.md](../../decisions/bridge-stateless.md). |
| **Platform truth** | Supabase tiene outbox, `sync_cursors`, `bridge_jobs`, mapping identità. |
| **Outbox federato** | Stessa tabella `outbox`; `protocol = xmpp|matrix`, consumer = bridge worker (non `alfred_delivery` sync). |
| **Queued (federato)** | Outbox accodato; su internal `process_outbox` immediato; su federato resta fino a claim bridge. |
| **external_id** | Id messaggio percepito dall'altro sistema (XMPP stanza `id`, Matrix `event_id`) — mapping ack spunte. |
| **sync_cursors** | Watermark sync per `(profile_id, peer_profile_id, protocol, cursor_key)`. |
| **bridge_jobs** | Coda lavori bridge complementare a outbox (handshake, sync conversazione). |
| **Facciata federata** | Bridge traduce protocollo esterno ↔ modello caselle Alfred (copie archivio + λ). |
| **Inbound federato** | Messaggio esterno → bridge → INSERT copia destinatario Alfred (+ gate reception fase B). |
| **Outbound federato** | Client → RPC account → outbox → bridge → server esterno del peer. |
| **Ack federato** | XEP-0184/0333, Matrix receipt → bridge → UPDATE `delivered_at`/`read_at` copia mittente Alfred. |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **delivery** | Internal usa `alfred_delivery` sincrono; federato riusa outbox, consumer diverso. |
| **messaging** | Client invia sempre via piattaforma; non parla direttamente ai bridge. |
| **reception** | Gate allow list applicato anche su materializzazione inbound bridge. |
| **contacts** | Rubrica salva indirizzi `xmpp`/`matrix` per routing futuro. |

---

## Stato attuale (main)

| Componente | Stato |
|------------|-------|
| `bridge-xmpp/main.py` | Stub — `GET /health` |
| `bridge-matrix/main.py` | Stub — `GET /health` |
| Invio verso `user@server` | Client mostra «Indirizzo esterno non ancora supportato» o outbox `queued` |
| Ricezione federata | Non implementata |
| Rubrica XMPP/Matrix | Salvataggio contatti ✅ |

---

## Invarianti (target)

1. Bridge **non** conservano stato autorevole — solo cache volatile rigenerabile.
2. Stesso modello caselle: copie archivio indipendenti, λ per correlazione, spunte come segnali.
3. Più repliche bridge possono processare job idempotenti con lock su piattaforma.
4. `external_id` + λ risolvono ack protocollo esterno sulla copia mittente Alfred.
5. Flutter → **solo** Supabase; mai connessione diretta XMPP/Matrix dal client web.
