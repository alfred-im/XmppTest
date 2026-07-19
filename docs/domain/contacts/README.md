# Contesto: contacts

**Stato modellazione:** `verified`

## Mapping dominio → implementazione

| Dominio | Statechart | Codice |
|---------|------------|--------|
| `AddContact` | `AddInternalContact` / `AddExternalContact` | `ContactService` |
| `RemoveContact` | `RemoveInternalContact` | `ContactService` |
| `SearchPeople` | `SearchProfiles` | RPC `search_profiles` |
| `StartChatFromContact` | `ComposeFromContact` | → `NavigationMachine.OpenFromCompose` |
| `ContactListReady` | `ContactsLoaded` | `ContactsMachine` |

Statechart: `client/lib/machines/contacts/` · `ContactsCoordinator`
