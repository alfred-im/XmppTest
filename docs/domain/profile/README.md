# Contesto: profile

**Stato modellazione:** `implemented` (dominio + UML + macchina documentata)

Vedi [glossary.md](./glossary.md) · [commands-and-events.md](./commands-and-events.md) · [UML](../../model/uml/profile/)

Statechart: `client/lib/machines/profile/` — `ProfileMachine` documenta edit proprio; overlay peer in `PeerProfileOverlay`.

## Artefatti

| File | Stato |
|------|-------|
| [glossary.md](./glossary.md) | compilato |
| [commands-and-events.md](./commands-and-events.md) | compilato |
| [profile-edit-state.puml](../../model/uml/profile/profile-edit-state.puml) | compilato |
| [seq-save-own-profile.puml](../../model/uml/profile/seq-save-own-profile.puml) | compilato |
| [seq-peer-profile-overlay.puml](../../model/uml/profile/seq-peer-profile-overlay.puml) | compilato |
| [statechart](../../../client/lib/machines/profile/) | documentato (produzione = `ProfileController` + overlay) |

## Implementazione runtime

| Componente | Ruolo |
|------------|-------|
| `ProfileSummary` / `UserProfile` | Modelli identità pubblica |
| `ProfileService` | UPDATE profilo, lookup username/id |
| `ProfileAvatarService` | Upload bucket `avatars` |
| `ProfileController` | Stato save/upload |
| `ProfileScreen` | Form edit profilo proprio |
| `profile_identity.dart` | `ProfileAvatar`, `ProfileIdentityLines` |
| `peer_profile_overlay.dart` | Scheda peer + allow/rubrica/chat/share |

## SDD (confine prodotto)

[PROM-PROFILE-IDENTITY](../../specs/promises/product/PROM-PROFILE-IDENTITY.md) · [PROM-PEER-PROFILE](../../specs/promises/product/PROM-PEER-PROFILE.md) · [SYS-PROFILE](../../specs/promises/system/SYS-PROFILE.md) · [SURF-PROFILE](../../specs/surfaces/SURF-PROFILE.md)
