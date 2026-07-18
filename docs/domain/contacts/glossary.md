# Glossario — contesto contacts

**Bounded context:** `contacts`  
**Ultima revisione:** 2026-07-18  
**Promesse SDD:** [PROM-PERSONAL-CONTACTS](../../specs/promises/product/PROM-PERSONAL-CONTACTS.md), [SYS-CONTACTS](../../specs/promises/system/SYS-CONTACTS.md)

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **Rubrica** | Lista personale `contacts` scoped per `owner_id` — scorciatoie opzionali, non prerequisito per messaggistica. |
| **Contact** | Riga rubrica: `id`, `protocol`, `displayName`, snapshot `avatarUrl`, riferimento internal o indirizzo esterno. |
| **ContactProtocol** | `internal` (utente Alfred), `xmpp`, `matrix` — solo routing/salvataggio; non tipo chat in inbox. |
| **Internal contact** | `linked_profile_id` → profilo Alfred; snapshot `display_name` e `avatar_url` al momento dell'aggiunta. |
| **External contact** | `external_address` + `display_name`; federazione futura — compose da rubrica non supportato (scope attuale). |
| **Owner** | Utente in focus (`owner_id = auth.uid()`); controller e lista ricreate al cambio account. |
| **Profile search** | RPC `search_profiles` — min 2 caratteri client, max 20 risultati; per aggiunta internal. |
| **Filtered contacts** | Sottoinsieme locale per `displayName` via `filterByQuery` ([PROM-LIST-FILTER](../../specs/promises/product/PROM-LIST-FILTER.md)). |
| **Compose shortcut** | Tap icona chat in rubrica → `ComposeService.peerFromContact` → `ChatPeer` → navigation. |
| **Peer profile overlay** | Tap avatar contatto internal → scheda peer ([PROM-PEER-PROFILE](../../specs/promises/product/PROM-PEER-PROFILE.md)). |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **profile** | `ProfileSummary` per ricerca e snapshot internal; `findById` non usato dalla rubrica. |
| **reception** | Allow list **separata** — rubrica non implica consenso ricezione ([PROM-RECEPTION-FILTER-010](../../specs/promises/product/PROM-RECEPTION-FILTER.md)). |
| **messaging** | Inbox deriva da `messages` only; invio sempre address-based. |
| **navigation** | «Scrivi» da rubrica restituisce `ChatPeer` al chiamante (`Navigator.pop`). |
| **multi-account** | `ContactsController` legato a `focusedSession.userId`; ricreato al focus switch. |

---

## Invarianti

1. Rubrica non abilita né blocca invio/ricezione messaggi.
2. Aggiunta contatto non crea conversazione in inbox.
3. Nessun `contact_id` richiesto per `send_message_to_profile`.
4. Dopo `addInternal` / `addExternal` / `removeInternal` → `load()` ricarica lista.
5. `contactForProfileId` considera solo contatti `internal` con `linkedProfileId` match.
6. Contatti esterni: nessun overlay peer al tap avatar ([PROM-PEER-PROFILE-023](../../specs/promises/product/PROM-PEER-PROFILE.md)).
