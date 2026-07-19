# Contesto: profile

**Stato modellazione:** `verified`

## Mapping dominio → implementazione

| Dominio | Statechart | Codice |
|---------|------------|--------|
| `UpdateOwnProfile` | `SaveProfile`, `UploadAvatar` | `ProfileService`, `ProfileAvatarService` |
| `ViewPeerProfile` | `OpenPeerProfile` | overlay peer |
| `TogglePeerConsent` | `ToggleAllowMessages` | → `ReceptionMachine` |
| `TogglePeerInContacts` | `ToggleRubrica` | → `ContactsMachine` |
| `StartChatFromPeerProfile` | `StartChatFromProfile` | → navigation |
| `SharePeerProfile` | `ShareProfileLink` | share sheet |

Statechart: `client/lib/machines/profile/` · `ProfileCoordinator`
