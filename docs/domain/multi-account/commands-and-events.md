# Comandi ed eventi — contesto multi-account

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/multi-account/](../../model/uml/multi-account/)

---

## Comandi

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `FocusAccount` | Utente / Policy | Solo I/O focus GoTrue. Scope e shell: `NavigationMachine.SwitchToAccount`. |
| `OpenAccount` | Utente | Aggiunge account al manifest (login o registrazione). |
| `CloseAccount` | Utente | Rimuove account dal manifest. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `AccountFocused` | Account attivo con sessione utilizzabile. |
| `AccountOpened` | Nuovo account nel manifest. |
| `AccountClosed` | Account rimosso dal manifest. |
| `NoOpenAccounts` | Manifest vuoto. |
| `SessionUnavailable` | Focus impostato ma sessione non ancora ripristinata. |

---

## Policy

| Policy | Descrizione |
|--------|-------------|
| **Una sessione attiva** | Solo un account ha sessione in memoria alla volta. |
| **Focus persistito** | L'account in focus sopravvive al riavvio app. |
| **Reconnect automatico** | Sessione assente viene ritentata in background. |

---

## Sistemi esterni

| Sistema | Ruolo |
|---------|------|
| **Persistenza locale** | Manifest account e focus. |
| **Supabase GoTrue** | Autenticazione e refresh sessione. |
