# Comandi ed eventi — contesto auth

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/auth/](../../model/uml/auth/)

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `SignIn` | Utente | Accede con credenziali esistenti. |
| `SignUp` | Utente | Registra un nuovo account. |
| `RequestPasswordReset` | Utente | Richiede recupero password. |
| `ShowCredentialOverlay` | Policy / Utente | Mostra overlay login o registrazione. |
| `DismissCredentialOverlay` | Utente | Chiude overlay quando consentito. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `SessionEstablished` | Account autenticato e utilizzabile. |
| `AuthenticationFailed` | Credenziali o rete non valide. |
| `ValidationFailed` | Dati inseriti non validi. |
| `CredentialOverlayRequired` | Nessun account aperto — overlay obbligatorio. |
| `CredentialOverlayDismissed` | Overlay chiuso; shell invariata. |

---

## Policy

| Policy | Descrizione |
|--------|-------------|
| **Shell sempre visibile** | Auth in overlay, mai schermata piena dedicata. |
| **Overlay obbligatorio senza account** | Zero account → overlay non chiudibile. |
| **Validazione prima della rete** | Dati invalidi non partono verso il server. |
