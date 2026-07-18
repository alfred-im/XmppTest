# Contesto: contacts

**Stato modellazione:** `implemented` (dominio + UML + macchina documentata)

Vedi [glossary.md](./glossary.md) · [commands-and-events.md](./commands-and-events.md) · [UML](../../model/uml/contacts/)

Statechart: `client/lib/machines/contacts/` — `ContactsMachine` documenta `ContactsController` (load, filtro, CRUD).

## Artefatti

| File | Stato |
|------|-------|
| [glossary.md](./glossary.md) | compilato |
| [commands-and-events.md](./commands-and-events.md) | compilato |
| [contacts-state.puml](../../model/uml/contacts/contacts-state.puml) | compilato |
| [seq-add-internal-contact.puml](../../model/uml/contacts/seq-add-internal-contact.puml) | compilato |
| [seq-compose-from-contact.puml](../../model/uml/contacts/seq-compose-from-contact.puml) | compilato |
| [statechart](../../../client/lib/machines/contacts/) | documentato (produzione = `ContactsController`) |

## Implementazione runtime

| Componente | Ruolo |
|------------|-------|
| `ContactsController` | Orchestratore produzione — load, filtro, add/remove |
| `ContactService` | PostgREST `contacts` + RPC `search_profiles` |
| `ContactsScreen` | Lista, ricerca, sheet aggiunta Alfred/Esterno |
| `ComposeService.peerFromContact` | Scorciatoia internal → `ChatPeer` |

## SDD (confine prodotto)

[PROM-PERSONAL-CONTACTS](../../specs/promises/product/PROM-PERSONAL-CONTACTS.md) · [SYS-CONTACTS](../../specs/promises/system/SYS-CONTACTS.md) · [SURF-CONTACTS](../../specs/surfaces/SURF-CONTACTS.md)
