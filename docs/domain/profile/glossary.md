# Glossario — contesto profile

**Bounded context:** `profile`  
**Ultima revisione:** 2026-07-18  
**Promesse SDD:** [PROM-PROFILE-IDENTITY](../../specs/promises/product/PROM-PROFILE-IDENTITY.md), [PROM-PEER-PROFILE](../../specs/promises/product/PROM-PEER-PROFILE.md), [SYS-PROFILE](../../specs/promises/system/SYS-PROFILE.md)

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **ProfileSummary** | DTO identità pubblica: `id`, `displayName`, `username?`, `avatarUrl?`, `pronouns?`, `profileKind`. |
| **UserProfile** | Profilo completo proprio: `ProfileSummary` + `bio` + timestamp. |
| **Public profile columns** | Campi esposti in query batch: `id`, `username`, `display_name`, `avatar_url`, `pronouns`, `profile_kind`. |
| **Own profile edit** | UPDATE `profiles` su campi `display_name`, `bio`, `pronouns`, `avatar_url` — username read-only. |
| **Avatar upload** | Storage bucket `avatars`, path `{userId}/avatar.{ext}`, max 2 MB, upsert, URL pubblico. |
| **Profile refresh** | Dopo save: `AuthController.refreshProfile()` aggiorna manifest multi-account. |
| **Peer profile overlay** | `showPeerProfileOverlay` — identità peer + azioni allow/rubrica/chat/share. |
| **Hydrate profile** | Overlay: `findById` + `mergeDisplay` per username/pronouns mancanti. |
| **ProfileAvatar** | Widget condiviso: foto rete o iniziale colorata (`avatarColorForId`). |
| **ProfileIdentityLines** | Nome, `@username`, pronomi — riusato in inbox, sidebar, liste. |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **auth** | `UserProfile` da sessione; `refreshProfile` dopo modifica. |
| **multi-account** | `OpenAccount.profile` snapshot in manifest. |
| **contacts** | Overlay peer: toggle rubrica via `ContactsController`. |
| **reception** | Overlay peer: toggle allow via `ReceptionAllowlistController`. |
| **navigation** | «Inizia a chattare» → `AuthController.openConversation`. |
| **shareable-link** | Condividi profilo peer da overlay. |
| **messaging** | Peer inbox: campi profilo da `list_inbox()` (`ProfileSummary.fromInboxRow`). |

---

## Invarianti

1. Email mai esposta in ricerca, rubrica o inbox pubblica.
2. `username` non modificabile da `ProfileScreen` (scope attuale).
3. Stringhe opzionali (`bio`, `pronouns`) → `null` se vuote dopo trim.
4. Overlay peer non si apre per profilo proprio (`profile.id == auth.userId`).
5. Allow e rubrica nell'overlay sono indipendenti e immediate (no dialog).
6. `ProfileSummary` unico modello identità in tutta l'UI.
