# Comandi ed eventi — contesto contacts

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/contacts/](../../model/uml/contacts/)

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `LoadContacts` | Init `ContactsController` | `ContactService.fetchContacts(ownerId)` ordinati per `display_name`. |
| `SetSearchQuery` | `CollapsibleListSearch` | Filtra `filteredContacts` per `displayName` (locale, sync). |
| `SearchProfiles` | Sheet aggiunta tab Alfred | RPC `search_profiles` se query ≥ 2 caratteri. |
| `AddInternalContact` | Tap risultato ricerca / overlay peer | INSERT `contacts` internal + `load()`. |
| `AddExternalContact` | Sheet tab Esterno | INSERT `contacts` xmpp/matrix + `load()`. |
| `RemoveInternalContact` | Overlay peer «Rimuovi dalla rubrica» | `deleteContact` per `contactForProfileId` + `load()`. |
| `ComposeFromContact` | Icona chat in `ContactsScreen` | `peerFromContact` → internal ok; esterno → `StateError`. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `ContactsLoaded` | Lista pronta; `isLoading = false`. |
| `ContactsLoadFailed` | Eccezione in `load()`; `error` valorizzato. |
| `ContactAdded` | Riga inserita; lista ricaricata. |
| `ContactRemoved` | Riga eliminata; lista ricaricata. |
| `ProfileSearchResults` | Risultati `search_profiles` nel sheet (UI locale). |
| `ComposePeerResolved` | `ChatPeer` restituito al navigator (internal). |
| `ComposeRejected` | Contatto esterno o internal invalido — snackbar errore. |

---

## Stati UI (ContactsController)

| Stato | Campo / condizione |
|-------|-------------------|
| `Loading` | `isLoading == true` (solo init/primo load) |
| `Ready` | `isLoading == false`, lista in memoria |
| `Error` | `error != null` (coesiste con Ready dopo primo load) |

Ricerca lista: stato ortogonale (`_searchQuery`), non blocca CRUD.

---

## Transizioni principali

| Da | Comando | A |
|----|---------|---|
| `Loading` | `ContactsLoaded` | `Ready` |
| `Loading` | `ContactsLoadFailed` | `Ready` + `error` |
| `Ready` | `AddInternalContact` / `AddExternalContact` | `Ready` (reload) |
| `Ready` | `RemoveInternalContact` | `Ready` (reload) |
| `Ready` | `SetSearchQuery` | `Ready` (vista filtrata) |

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Isolamento rubrica / inbox | PROM-PERSONAL-CONTACTS-001–005 |
| Compose internal / reject external | PROM-PERSONAL-CONTACTS-006, 021 |
| Controller per focus | PROM-PERSONAL-CONTACTS-007 |
| Filtro lista | PROM-PERSONAL-CONTACTS-008 |
| Reload post-add | PROM-PERSONAL-CONTACTS-011 |
| Azione rubrica da overlay | PROM-PEER-PROFILE-006 |
