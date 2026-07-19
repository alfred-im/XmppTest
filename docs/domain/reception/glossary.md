# Glossario — contesto reception

**Bounded context:** `reception`  
**Ultima revisione:** 2026-07-18  
**Promesse SDD:** [SYS-RECEPTION](../../specs/promises/system/SYS-RECEPTION.md), [PROM-RECEPTION-FILTER](../../specs/promises/product/PROM-RECEPTION-FILTER.md)

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **Reception allowlist** | Tabella `reception_allowlist`: chi può **consegnare** messaggi al destinatario (`owner_id`). |
| **AllowedPerson** | Voce UI: `entryId` + `ProfileSummary` del profilo consentito. |
| **Owner (destinatario)** | Utente che filtra la ricezione (`owner_id = auth.uid()`). |
| **Sender gate** | Condizione recapito: mittente ∈ allow list del destinatario. |
| **Silent rejection** | Messaggio accettato server (✓) ma senza copia destinatario né ✓✓ — nessun errore al mittente. |
| **Empty allowlist** | Lista vuota → nessun mittente passa il gate ([PROM-RECEPTION-FILTER-002](../../specs/promises/product/PROM-RECEPTION-FILTER.md)). |
| **Always-on filter** | Nessun toggle globale on/off — filtro sempre attivo ([SYS-RECEPTION-014](../../specs/promises/system/SYS-RECEPTION.md)). |
| **No retro-delivery** | Aggiunta tardiva non consegna messaggi precedentemente rifiutati. |
| **Archive retention** | Rimozione da lista: messaggi già in archivio destinatario restano. |
| **`is_sender_allowed_for_reception`** | Helper SECURITY DEFINER server — solo worker/RPC interne. |
| **Consenti messaggi** | Etichetta UI switch overlay peer e gestione lista «Persone consentite». |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **delivery** | Worker `alfred_delivery.process_outbox` applica gate prima di INSERT copia destinatario. |
| **messaging** | Mittente vede ✓ permanente, mai ✓✓ se rifiutato; destinatario non vede messaggio. |
| **contacts** | Rubrica **non** proxy allow list ([SYS-RECEPTION-022](../../specs/promises/system/SYS-RECEPTION.md)). |
| **profile** | `ProfileSummary` nelle voci lista; ricerca profili per aggiunta. |
| **multi-account** | `ReceptionAllowlistController` scoped a account in focus. |

---

## Invarianti

1. Gate server **prima** della materializzazione copia destinatario.
2. Rifiuto: nessun errore RPC, nessun messaggio «bloccato» al mittente.
3. `allowed_profile_id ≠ owner_id` — client skip self in `addProfile`.
4. Unicità `(owner_id, allowed_profile_id)`.
5. CRUD client via PostgREST diretto (nessuna RPC dedicata).
6. Toggle allow in overlay: immediato, senza dialog ([PROM-PEER-PROFILE-008](../../specs/promises/product/PROM-PEER-PROFILE.md)); rimozione da screen lista richiede conferma.
