# Implementazione client multi-account (sessioni parallele)

**Data**: 2026-06-29  
**ADR**: [multi-account-parallel-sessions.md](../decisions/multi-account-parallel-sessions.md)  
**PR**: #140

Guida implementativa per AI — flussi e file del refactor.

---

## 1. Diagramma runtime

```
AuthController
    └── AccountManager
            ├── AccountSession (user A)
            │     ├── SupabaseClient A
            │     ├── InboxService / MessageService / …
            │     └── InboxController A  ← realtime sempre ON
            ├── AccountSession (user B)
            │     └── …
            └── focusUserId → A | B
```

Il **focus** determina quale `inboxController` e quali servizi espone la UI via `AuthController.focusedSession`.

---

## 2. File principali

| File | Responsabilità |
|------|----------------|
| `services/account_manager.dart` | Ciclo vita account aperti, focus, persistenza, sign-in/up delegati |
| `services/account_session.dart` | Client Supabase dedicato, wiring servizi, restore da `OpenAccount` |
| `services/account_storage_service.dart` | `OpenAccount[]` + `focusUserId` in SharedPreferences |
| `models/open_account.dart` | DTO persistito (ex `SavedAccount`) |
| `providers/auth_controller.dart` | Stato UI auth, overlay, errori user-friendly |
| `widgets/auth_overlay.dart` | Barriera semi-trasparente |
| `widgets/no_account_placeholder.dart` | Inbox vuota |
| `screens/home_screen.dart` | Shell + Stack overlay |
| `screens/app_shell.dart` | Solo loading iniziale `sessionReady`, poi sempre `HomeScreen` |
| `services/supabase_bootstrap.dart` | `bootstrapApp()` — nessun `Supabase.initialize` globale per utente |

---

## 3. Flussi

### 3.1 Avvio app

1. `AuthController.initialize()` → `AccountManager.initialize()`
2. Carica `OpenAccount[]` da storage
3. Per ogni entry: `AccountSession.restore()` → `setSession(refreshToken)` sul **client dedicato**
4. Imposta focus da `alfred_focus_user_id` o primo account
5. Se 0 account: `showAuthOverlay = true`, `authOverlayDismissible = false`

### 3.2 Login / registrazione

1. `AccountSession.signInWithPassword` o `signUp` usa client bootstrap (`_sign_in` / `_sign_up`)
2. Dopo successo: `restore(OpenAccount)` su client con storage `alfred_auth_{userId}`
3. `AccountManager._adoptSession` → aggiunge alla mappa, persiste, imposta focus
4. Overlay chiuso

### 3.3 Cambio focus

1. `AuthController.setFocus(userId)` → `AccountManager.setFocus`
2. Aggiorna `focusUserId` in storage
3. `notifyListeners()` — `ListenableProxyProvider` espone `inboxController` del focus (**dispose noop** — lifecycle in `AccountSession.close()`)
4. **Nessuna** chiamata `setSession` tra sessioni esistenti
5. **`AccountViewState` per `userId`** — `activePeer` e mobile inbox/chat **non** si azzerano al switch

### 3.4 Chiusura account

1. `removeAccount(userId)` → `session.clearStoredAccount()` — rimuove entry manifest + logout locale (clear `alfred_auth_{userId}`, no `signOut` GoTrue)
2. Rimuove da mappa RAM
3. Se era focus: focus sul primo rimasto o `null`
4. Se 0 account: overlay obbligatorio

### 3.5 Persistenza dichiarativa (PR redesign persistenza)

**Implementazione**: `docs/implementation/multi-account-persistence-redesign.md`

- `AccountSession` scrive **solo la propria** entry in `alfred_saved_accounts` (`upsertAccount` / `removeAccount`)
- Login/sign-up: `persistOpenAccount` con token dalla **risposta HTTP** — mai da `currentSession`
- `tokenRefreshed`: `updateStoredRefresh` con token dall’evento auth
- Sync profilo: `updateStoredProfile`
- `AccountManager` **non** ricostruisce mai la lista (`saveAllAccounts` vietato nel runtime)
- `_lastKnownRefreshToken` in RAM per `toOpenAccount()` e sidebar

---

## 4. Provider (`main.dart`)

```dart
// Inbox: ListenableProxyProvider — dispose noop (PR #143)
ListenableProxyProvider<AuthController, InboxController?>(
  update: (_, auth, _) => auth.focusedSession?.inboxController,
  dispose: (context, inbox) { /* AccountSession.close() */ },
)

// Contatti / profilo: ricreati al cambio focus (servizi del client in focus)
ChangeNotifierProxyProvider<AuthController, ContactsController?>(…)
ChangeNotifierProxyProvider<AuthController, ProfileController?>(…)
```

`MessagesController` resta per-chat, creato in `_ChatWithMessages` con i servizi della `AccountSession` in focus.

---

## 5. Migrazione da modello precedente

| Prima | Dopo |
|-------|------|
| `SavedAccount` | `OpenAccount` (stesso JSON) |
| `AuthService` | `AccountManager` + `AccountSession` |
| `switchAccount` + `setSession` | `setFocus` |
| `signOut` | `removeAccount` |
| `prepareAddAccount` | Rimosso (sessioni indipendenti) |
| `Supabase.instance.client` | `session.client` per ogni servizio |
| `bootstrapSupabase()` | `bootstrapApp()` |

Storage `alfred_saved_accounts` **non** cambia chiave — upgrade trasparente al primo avvio post-refactor (restore parallelo).

---

## 6. Test

| Test | Cosa verifica |
|------|----------------|
| `test/unit/account_storage_test.dart` | Round-trip `OpenAccount`, focus, `saveAllAccounts` atomico |
| `test/unit/auth_service_multi_account_test.dart` | Upsert multi-account storage |
| `test/unit/account_manager_view_state_test.dart` | View per account, `setFocus` non resetta altri |
| `test/unit/multi_account_chat_scenario_test.dart` | Focus switch + chat reciproca (mock) |
| `test/unit/messages_controller_multi_account_test.dart` | Scope `userId+peer`, errori RPC |
| `test/unit/account_manager_persistence_test.dart` | Persistenza 2 account |
| `test/widget/inbox_provider_lifecycle_test.dart` | Inbox non disposed al focus switch |
| `test/widget/inbox_provider_listen_test.dart` | ProxyProvider + InboxController notify |

**Gap noto (PR #143)**: nessun e2e browser / F5 / GoTrue reale. Vedi `docs/fixes/multi-account-chat-persistence-pr143.md` § validazione.

### Harness integrazione (no browser)

```bash
bash client/scripts/integration-multi-account.sh   # API agent1↔agent2
bash client/scripts/diagnose-test-env.sh           # Chrome CDP per computerUse
```

---

## 7. Verifica

```bash
cd client && bash scripts/verify.sh
```

---

## Riferimenti

- [auth-overlay-shell.md](../design/auth-overlay-shell.md)
- [alpha-full-stack.md](../architecture/alpha-full-stack.md) §2.3–2.4
- [flutter-inbox-stability.md](../fixes/flutter-inbox-stability.md) §3 (evoluzione bootstrap)
