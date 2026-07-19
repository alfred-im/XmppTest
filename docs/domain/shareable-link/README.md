# Contesto: shareable-link

**Stato modellazione:** `verified`

## Mapping dominio → implementazione

| Dominio | Statechart | Codice |
|---------|------------|--------|
| `ResolveSharedLink` | `ParseFragment`, `HandleTargetRequested` | `ShareableLinkMachine` |
| `OpenSharedChat` | `OpenFromShareableLink` | → `NavigationMachine` |
| `OpenSharedProfile` | `ShowProfileFromLink` | overlay profilo |
| `SharedLinkPending` | `TargetDeferred` | coda fino a sessione |
| `SharedLinkInvalid` | `ProfileNotFound` | UI not found |

Statechart: `client/lib/machines/shareable-link/` · `ShareableLinkController`
