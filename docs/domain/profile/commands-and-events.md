# Comandi ed eventi — contesto profile

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/profile/](../../model/uml/profile/)

---

## Comandi — profilo proprio

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `SaveProfile` | `ProfileScreen` Salva | `ProfileService.updateProfile` con campi normalizzati. |
| `UploadAvatar` | Tap camera su `ProfileScreen` | `ProfileAvatarService.uploadAvatar` → URL pubblico. |
| `RefreshAuthProfile` | Post save/upload | `AuthController.refreshProfile()` — aggiorna sidebar/manifest. |
| `FindByUsername` | Compose / link | RPC `find_profile_by_username` (min 3 caratteri client). |
| `FetchSummariesByIds` | Batch lookup | SELECT profili pubblici per lista id. |
| `FindById` | Overlay hydrate | Singolo profilo per arricchire `ProfileSummary` parziale. |

---

## Comandi — overlay peer

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `OpenPeerProfile` | Tap avatar peer | `showPeerProfileOverlay`; skip se self. |
| `HydratePeerProfile` | `didChangeDependencies` overlay | `findById` + `mergeDisplay`. |
| `ToggleAllowMessages` | Switch overlay | `addProfile` / `removeByProfileId` su reception. |
| `ToggleRubrica` | Pulsante overlay | `addInternal` / `removeInternalByProfileId` su contacts. |
| `StartChatFromProfile` | CTA «Inizia a chattare» | Chiude overlay; `openConversation(ChatPeer.fromProfile)`. |
| `ShareProfileLink` | Icona share hero | `shareShareableProfileLink`. |
| `ClosePeerProfile` | Back / barrier tap | `Navigator.pop`. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `ProfileSaved` | UPDATE ok; `isSaving = false`. |
| `ProfileSaveFailed` | Eccezione save; `error` + rethrow. |
| `AvatarUploaded` | Storage ok; URL restituito. |
| `AvatarUploadFailed` | File troppo grande o errore storage. |
| `AuthProfileRefreshed` | Manifest e `auth.profile` allineati. |
| `PeerProfileOpened` | Dialog fullscreen visibile. |
| `PeerProfileHydrated` | Campi server uniti a snapshot parziale. |
| `AllowToggled` | Allow list aggiornata (overlay o screen). |
| `RubricaToggled` | Contatto internal aggiunto/rimosso. |
| `ConversationOpenRequested` | Navigation verso peer da overlay. |

---

## Stati UI

### ProfileController (profilo proprio)

| Stato | Campo / condizione |
|-------|-------------------|
| `Idle` | `isSaving == false`, `isUploadingAvatar == false` |
| `Saving` | `isSaving == true` |
| `UploadingAvatar` | `isUploadingAvatar == true` |

Save e upload sono mutuamente esclusivi nell'uso attuale (`_pickAvatar` fa upload poi save).

### PeerProfileOverlay (locale)

| Stato | Campo / condizione |
|-------|-------------------|
| `Displaying` | Profilo in `_profile` (parziale o idratato) |
| `AllowBusy` | `_allowBusy` durante toggle allow |
| `RubricaBusy` | `_rubricaBusy` durante toggle rubrica |

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| `ProfileSummary` unificato | PROM-PROFILE-IDENTITY-001, 002 |
| Refresh dopo save | PROM-PROFILE-IDENTITY-003 |
| Overlay apertura/contenuto | PROM-PEER-PROFILE-001–004 |
| Toggle allow / rubrica | PROM-PEER-PROFILE-005–008 |
| CTA chat | PROM-PEER-PROFILE-013, 014 |
| Username read-only | PROM-PROFILE-IDENTITY-021 |
