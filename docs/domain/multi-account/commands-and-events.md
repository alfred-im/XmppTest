# Comandi ed eventi — contesto multi-account

**Ultima revisione:** 2026-07-18  
**UML:** [docs/model/uml/multi-account/](../../model/uml/multi-account/)

---

## Comandi (intento)

| Comando | Emesso da | Implementazione | Descrizione |
|---------|-----------|-----------------|-------------|
| `InitializeManifest` | `AuthController.initialize` | `AccountManager.initialize` | F5 / avvio: carica manifest, imposta focus, ripristina sessione GoTrue del focus. |
| `FocusAccount` | Sidebar, push (`NavigationCoordinator`), link | `AccountManager.setFocus` | Imposta `alfred_focus_user_id`, dispose sessione corrente, restore nuova da manifest. |
| `OpenAccountWithPassword` | Auth overlay login | `AccountManager.openWithPassword` | Sign-in → upsert manifest → focus sul nuovo account → sessione obbligatoria. |
| `OpenAccountWithSignUp` | Auth overlay registrazione | `AccountManager.openWithSignUp` | Sign-up → upsert manifest → focus → sessione obbligatoria. |
| `CloseAccount` | Sidebar profilo | `AccountManager.removeAccount` | Rimuove da manifest + storage auth; se era in focus, focus sul primo rimanente o svuota. |
| `ReconnectFocusedSession` | `HomeScreen` (manifest + focus, `focusedSession == null`) | `AccountManager.reconnectFocusedSession` | Ritenta `_activateFocusedSession` per il focus corrente. |

---

## Eventi di dominio (cosa è successo)

| Evento | Dopo | Descrizione |
|--------|------|-------------|
| `ManifestLoaded` | `InitializeManifest` | Account aperti letti da `alfred_saved_accounts` (refresh token non vuoto). |
| `NoOpenAccounts` | manifest vuoto | Nessun account aperto; overlay auth obbligatorio. |
| `AccountOpened` | login/signup ok | Nuova voce nel manifest (o primo account). |
| `AccountClosed` | `CloseAccount` ok | Rimosso dal manifest; `wasLastAccount` se era l'ultimo. |
| `FocusSwitchStarted` | `FocusAccount` su account diverso | Dispose sessione GoTrue precedente in corso. |
| `AccountFocused` | restore sessione ok | Focus persistito + `AccountSession` attiva in RAM. |
| `SessionRestoreFailed` | restore sessione fallito (non permanente) | Focus può restare; `focusedSession == null`. |

---

## Transizioni stato client

Vedi [multi-account-state.puml](../../model/uml/multi-account/multi-account-state.puml).

| Da | Evento | A |
|----|--------|---|
| `NoOpenAccounts` | `AccountOpened` (senza sessione) | `HasOpenAccounts` |
| `NoOpenAccounts` | `AccountOpened` + sessione | `FocusedWithSession` |
| `NoOpenAccounts` | `InitializeManifest` [vuoto] | `NoOpenAccounts` |
| `*` | `InitializeManifest` [session ok] | `FocusedWithSession` |
| `*` | `InitializeManifest` [focus, no session] | `FocusedAwaitingSession` |
| `HasOpenAccounts` | `FocusAccount` | `FocusSwitching` |
| `FocusedWithSession` | `FocusAccount` [altro] | `FocusSwitching` |
| `FocusedAwaitingSession` | `FocusAccount` | `FocusSwitching` |
| `FocusSwitching` | `AccountFocused` | `FocusedWithSession` |
| `FocusSwitching` | `SessionRestoreFailed` | `FocusedAwaitingSession` |
| `HasOpenAccounts` | `AccountFocused` | `FocusedWithSession` |
| `FocusedAwaitingSession` | `ReconnectFocusedSession` → `AccountFocused` | `FocusedWithSession` |
| `FocusedWithSession` | `AccountClosed` [ultimo] | `NoOpenAccounts` |
| `FocusedWithSession` | `AccountClosed` [non ultimo] | `FocusedWithSession` o `FocusedAwaitingSession` |
| `FocusedAwaitingSession` | `AccountClosed` [ultimo] | `NoOpenAccounts` |
| `HasOpenAccounts` | `AccountClosed` [ultimo] | `NoOpenAccounts` |

---

## Policy

| Policy | Trigger | Azione |
|--------|---------|--------|
| **Una sessione RAM** | `FocusAccount` | Dispose sessione precedente prima del restore. |
| **Focus serializzato** | Più `FocusAccount` rapidi | Coda `_focusOperationChain` in `AccountManager`. |
| **Auth permanente** | refresh token invalido | Rimuovi account da manifest; prova focus successivo. |
| **Overlay obbligatorio** | `NoOpenAccounts` dopo init o ultimo `CloseAccount` | `showAuthOverlay`, non dismissibile. |
| **Reconnect passivo** | shell visibile + manifest + focus senza sessione | `ReconnectFocusedSession` da `HomeScreen`. |

---

## Sistemi esterni

| Sistema | Ruolo |
|---------|--------|
| **SharedPreferences** | `alfred_saved_accounts`, `alfred_focus_user_id`, `alfred_auth_{userId}` |
| **Supabase GoTrue** | Sign-in/sign-up, refresh token, `AccountSession.restore` |
| **NavigationCoordinator** | Delega `FocusAccount` per tap push / link (via `SwitchToAccount`) |

---

## Tracciabilità SDD

| Elemento | Promessa |
|----------|----------|
| Manifest / focus | PROM-MULTI-ACCOUNT-001–005 |
| Una sessione RAM | PROM-MULTI-ACCOUNT-006 |
| Overlay auth | PROM-MULTI-ACCOUNT-012–014 |
| AccountViewState | PROM-MULTI-ACCOUNT-010 |
| Reconnect sessione | PROM-MULTI-ACCOUNT-006 |
