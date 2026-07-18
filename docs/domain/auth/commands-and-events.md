# Comandi ed eventi — contesto auth

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/auth/](../../model/uml/auth/)

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `BootstrapStarted` | `AuthController.initialize` | Avvio caricamento manifest / sessione focus. |
| `BootstrapCompleted` | Fine `initialize` | `hasOpenAccounts` determina `NoSession` vs `SessionActive`. |
| `OverlayOpenRequested` | «Aggiungi account», bootstrap senza account | `dismissible`: true se ≥1 account (`SURF-AUTH-003`). |
| `OverlayCloseRequested` | Annulla su overlay dismissibile | Chiusura consentita solo se dismissibile o manifest non vuoto. |
| `SignInRequested` | `AuthScreen` submit (modalità accedi) | Validazione email → `AccountManager.openWithPassword`. |
| `SignUpRequested` | `AuthScreen` submit (modalità registrati) | Validazione + username disponibile → `openWithSignUp`. |
| `ResetPasswordRequested` | Dialog recupero password | `AccountManager.resetPassword` via `EphemeralBootstrap`. |
| `LastAccountRemoved` | `removeAccount` su ultimo account | Overlay obbligatorio (`SURF-AUTH-005`). |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `BootstrapReady` | `sessionReady = true`; overlay impostato se manifest vuoto. |
| `OverlayMandatoryShown` | 0 account — overlay non dismissibile. |
| `OverlayDismissibleShown` | Aggiunta account — overlay chiudibile. |
| `OverlayClosed` | Overlay nascosto; shell invariata. |
| `OverlayCloseBlocked` | Tentativo chiusura con 0 account — ignorato. |
| `AuthOperationStarted` | Rotella su card (`isLoading`). |
| `AuthOperationCompleted` | Operazione riuscita; overlay chiuso se login/sign-up. |
| `AuthOperationFailed` | Errore user-friendly su card; overlay invariato. |
| `SessionEstablished` | Account nel manifest + focus; overlay chiuso (`SURF-AUTH-007`). |
| `ValidationRejected` | Email/username/display name non validi — nessuna chiamata rete. |

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Overlay obbligatorio 0 account | SURF-AUTH-002 |
| Overlay dismissibile add-account | SURF-AUTH-003 |
| Card login + registrazione | SURF-AUTH-004 |
| Chiusura post login/sign-up | SURF-AUTH-007 |
| Redirect email/reset | SURF-AUTH-008 |
| Ultimo account rimosso | SURF-AUTH-005 |
| Tipo account user/group | SURF-AUTH-006 |
