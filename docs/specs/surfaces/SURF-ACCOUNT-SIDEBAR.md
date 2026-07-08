# SURF-ACCOUNT-SIDEBAR — Sidebar account multipli

| Campo | Valore |
|-------|--------|
| **Superficie ID** | `SURF-ACCOUNT-SIDEBAR` |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Promesse** | [SYS-PROFILE](../promises/system/SYS-PROFILE.md) (`ProfileSummary` in manifest) |
| **Supersedes** | AUTH-MULTI sidebar/manifest; GROUP-CORE REQ-016 (SDD v1 epurato) |
| **PR** | #140, #147, #152, #162 |

Binding UX sidebar account aperti: manifest, focus, switch istantaneo, stato vista per account, badge gruppo.

---

## 1. Superficie

| Elemento | Valore |
|----------|--------|
| Widget | `client/lib/widgets/account_sidebar.dart` |
| Placeholder | `client/lib/widgets/no_account_placeholder.dart` |
| Runtime | `AccountManager` — manifest, focus, swap GoTrue |
| Storage | `alfred_saved_accounts`, `alfred_focus_user_id`, `alfred_auth_{userId}` |
| Parent | `HomeScreen` — `ListenableBuilder` su inbox focus |

---

## 2. Promesse SURFACE

### MUST

| ID | Promessa |
|----|----------|
| **SURF-ACCOUNT-SIDEBAR-001** | Account in lista sidebar = account **aperti** nel manifest — non bookmark disconnessi |
| **SURF-ACCOUNT-SIDEBAR-002** | Storage manifest: `alfred_saved_accounts` (JSON `OpenAccount[]`) — verità dopo F5 |
| **SURF-ACCOUNT-SIDEBAR-003** | Focus: `alfred_focus_user_id` — quale account mostra inbox/chat |
| **SURF-ACCOUNT-SIDEBAR-004** | Auth per account: `alfred_auth_{userId}` — sessione GoTrue dedicata; non ricostruisce il manifest |
| **SURF-ACCOUNT-SIDEBAR-005** | **Una** `AccountSession` / connessione GoTrue attiva in RAM; al `setFocus`: dispose sessione corrente (`clearAuthStorage: false`), restore nuovo account |
| **SURF-ACCOUNT-SIDEBAR-006** | `InboxController` + realtime inbox solo sul focus |
| **SURF-ACCOUNT-SIDEBAR-007** | `AccountViewState` per `userId`: `activePeer` e stato mobile inbox/chat **persistono** al cambio focus |
| **SURF-ACCOUNT-SIDEBAR-008** | «Chiudi account» (`removeAccount`): rimuove manifest + `alfred_auth_{userId}`; se era focus → primo rimasto o null |
| **SURF-ACCOUNT-SIDEBAR-009** | Token refresh: sessione attiva aggiorna propria entry manifest su `tokenRefreshed` |
| **SURF-ACCOUNT-SIDEBAR-010** | Sidebar mostra `ProfileSummary` per account in focus e lista account (`ProfileAvatar`, `ProfileIdentityLines`) |

### SHOULD

| ID | Promessa |
|----|----------|
| **SURF-ACCOUNT-SIDEBAR-011** | Switch focus senza loading auth visibile (restore in background) |
| **SURF-ACCOUNT-SIDEBAR-012** | `NoAccountPlaceholder` in area inbox quando nessun account/focus |
| **SURF-ACCOUNT-SIDEBAR-013** | Etichetta UI distinta per account `group` nel manifest (badge «Gruppo») — [SYS-GROUP](../promises/system/SYS-GROUP.md) REQ-016 |

### MUST NOT

| ID | Promessa |
|----|----------|
| **SURF-ACCOUNT-SIDEBAR-020** | N client GoTrue paralleli in RAM su web (BroadcastChannel collision) |
| **SURF-ACCOUNT-SIDEBAR-021** | `switchAccount` legacy con `setSession` tra account già in RAM |

---

## 3. Mappa legacy REQ → SURF

| Capability REQ | SURF-ID |
|----------------|---------|
| AUTH-MULTI-REQ-002 | SURF-ACCOUNT-SIDEBAR-001 |
| AUTH-MULTI-REQ-003 | SURF-ACCOUNT-SIDEBAR-002 |
| AUTH-MULTI-REQ-004 | SURF-ACCOUNT-SIDEBAR-003 |
| AUTH-MULTI-REQ-005 | SURF-ACCOUNT-SIDEBAR-004 |
| AUTH-MULTI-REQ-006 | SURF-ACCOUNT-SIDEBAR-005 |
| AUTH-MULTI-REQ-009 | SURF-ACCOUNT-SIDEBAR-006 |
| AUTH-MULTI-REQ-010 | SURF-ACCOUNT-SIDEBAR-007 |
| AUTH-MULTI-REQ-014 | SURF-ACCOUNT-SIDEBAR-008 |
| AUTH-MULTI-REQ-015 | SURF-ACCOUNT-SIDEBAR-009 |
| AUTH-MULTI-REQ-016 | SURF-ACCOUNT-SIDEBAR-011 |
| AUTH-MULTI-REQ-017 | SURF-ACCOUNT-SIDEBAR-012 |
| AUTH-MULTI-REQ-019 | SURF-ACCOUNT-SIDEBAR-020 |
| AUTH-MULTI-REQ-020 | SURF-ACCOUNT-SIDEBAR-021 |
| GROUP-CORE-REQ-016 | SURF-ACCOUNT-SIDEBAR-013 |

Overlay auth: [SURF-AUTH.md](./SURF-AUTH.md).

---

## 4. Tracciabilità

| SURF-ID / AUTH-REQ | Verifica |
|--------------------|----------|
| SURF-ACCOUNT-SIDEBAR-001–002, REQ-002–003 | `account_storage_test.dart` — round-trip `OpenAccount[]` |
| SURF-ACCOUNT-SIDEBAR-003, REQ-004 | `account_storage_test.dart` — `saveFocusUserId` / `loadFocusUserId` |
| SURF-ACCOUNT-SIDEBAR-004–005, REQ-005–006 | `account_manager_persistence_test.dart` — single active session |
| SURF-ACCOUNT-SIDEBAR-007, REQ-010 | `account_manager_view_state_test.dart`; `multi_account_chat_scenario_test.dart` |
| SURF-ACCOUNT-SIDEBAR-008, REQ-014 | `account_manager_persistence_test.dart` — `removeAccount` |
| SURF-ACCOUNT-SIDEBAR-006, REQ-009 | `inbox_provider_lifecycle_test.dart` |
| SURF-ACCOUNT-SIDEBAR-009, REQ-015 | `auth_service_multi_account_test.dart` |
| SURF-ACCOUNT-SIDEBAR-013, GROUP-REQ-016 | `account_sidebar_test.dart` |

Gate: `verify.sh` + `integration` + `e2e-multi`

---

## 5. Riferimenti

- [SURF-AUTH.md](./SURF-AUTH.md)
- [SURF-PROFILE.md](./SURF-PROFILE.md)
- [registry.md](../registry.md)
