# Comandi ed eventi — contesto reception

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/reception/](../../model/uml/reception/)

---

## Comandi — client UI

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `LoadAllowlist` | Init `ReceptionAllowlistController` | `fetchAllowedPeople` con join `profiles`. |
| `SetSearchQuery` | `AllowedPeopleScreen` | Filtra `filteredAllowedPeople` per `displayName`. |
| `SearchProfiles` | Sheet aggiunta | RPC `search_profiles` (≥ 2 caratteri). |
| `AddAllowedProfile` | Tap risultato / switch overlay ON | INSERT `reception_allowlist`; skip self e duplicati. |
| `RemoveAllowedPerson` | Dialog conferma screen / switch overlay OFF | DELETE per `entryId` o `removeByProfileId`. |

---

## Comandi — server (delivery gate)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `DeliverInternal` | Worker outbox | Dopo INSERT copia mittente, verifica allow list destinatario. |
| `CheckSenderAllowed` | `is_sender_allowed_for_reception` | EXISTS riga `(owner=dest, allowed=sender)`. |
| `MaterializeRecipientCopy` | Gate pass | INSERT copia destinatario + `delivered_at` su mittente. |
| `SkipRecipientCopy` | Gate fail | Nessuna copia destinatario; `reception_rejected` solo audit server. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `AllowlistLoaded` | Lista pronta; `isLoading = false`. |
| `AllowlistLoadFailed` | Eccezione fetch; `error` valorizzato. |
| `ProfileAllowed` | Riga inserita; lista ricaricata. |
| `ProfileDisallowed` | Riga eliminata; lista ricaricata. |
| `AddSkipped` | Self o duplicato — no-op client. |
| `DeliveryAccepted` | Gate pass — mittente riceve ✓✓ (`delivered_at`). |
| `DeliverySilentlyRejected` | Gate fail — mittente resta ✓; destinatario ignora. |

---

## Stati UI (ReceptionAllowlistController)

| Stato | Campo / condizione |
|-------|-------------------|
| `Loading` | `isLoading == true` |
| `Ready` | `isLoading == false` |
| `Empty` | `allowedPeople.isEmpty` — copy «nessuno può consegnarti…» |
| `Error` | `error != null` |

`allowedProfileIds` è vista derivata (`Set<String>`) per lookup O(1) in overlay.

---

## Semantica recapito (osservabile)

| Ruolo | Gate fail |
|-------|-----------|
| Mittente | RPC ok; spunta singola permanente |
| Destinatario | Messaggio assente da inbox |
| Dopo rimozione da lista | Solo messaggi **nuovi** rifiutati |
| Dopo aggiunta a lista | Nessuna retro-consegna |

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Filtro sempre attivo | PROM-RECEPTION-FILTER-001 |
| Lista vuota default | PROM-RECEPTION-FILTER-002, 003 |
| Rifiuto silenzioso | PROM-RECEPTION-FILTER-005, 006 |
| Isolamento rubrica | PROM-RECEPTION-FILTER-010 |
| Gate server | SYS-RECEPTION-005–010 |
| Toggle overlay | PROM-PEER-PROFILE-005 |
