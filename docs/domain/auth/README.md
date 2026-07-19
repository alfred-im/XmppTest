# Contesto: auth

**Stato modellazione:** `verified`

## Mapping dominio → implementazione

| Dominio | Statechart | Codice |
|---------|------------|--------|
| `SignIn` | `SignInRequested` | `AuthMachine` + `OpenAccountWithPassword` |
| `SignUp` | `SignUpRequested` | `AuthMachine` + `OpenAccountWithSignUp` |
| `RequestPasswordReset` | `ResetPasswordRequested` | GoTrue reset |
| `ShowCredentialOverlay` | `OverlayOpenRequested` | overlay auth |
| `DismissCredentialOverlay` | `OverlayCloseRequested` | chiusura se ≥1 account |
| `SessionEstablished` | `SessionEstablished` | focus + overlay chiuso |

Statechart: `client/lib/machines/auth/` · Facade: `AuthController`
