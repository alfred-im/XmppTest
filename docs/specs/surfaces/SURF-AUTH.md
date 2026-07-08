# SURF-AUTH — Overlay autenticazione multi-account

| Campo | Valore |
|-------|--------|
| **Superficie ID** | `SURF-AUTH` |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Promesse** | — |
| **Supersedes** | AUTH-MULTI overlay/shell (SDD v1 epurato) |
| **PR** | #140, #147, #152 |

Binding UX overlay login/registrazione sulla shell `HomeScreen` — credenziali come card temporanea, mai schermata full-screen.

---

## 1. Superficie

| Elemento | Valore |
|----------|--------|
| Layout | `Stack` — `HomeScreen` sotto, `AuthOverlay` (45% nero) + `AuthScreen` card sopra |
| Widget | `client/lib/widgets/auth_overlay.dart`, `client/lib/screens/auth_screen.dart` |
| Controller | `AuthController` — gate overlay, errori user-friendly |
| Shell parent | `client/lib/app_shell.dart` — `sessionReady` → sempre `HomeScreen` |

---

## 2. Promesse SURFACE

### MUST

| ID | Promessa |
|----|----------|
| **SURF-AUTH-001** | Shell `HomeScreen` **sempre** visibile (sidebar + inbox + chat) — mai sostituita da auth full-screen |
| **SURF-AUTH-002** | 0 account → `AuthOverlay` obbligatorio, non dismissibile |
| **SURF-AUTH-003** | ≥1 account → overlay solo da «Aggiungi account», dismissibile |
| **SURF-AUTH-004** | Login e registrazione sulla stessa card (`AuthScreen`); toggle Accedi/Registrati |
| **SURF-AUTH-005** | «Chiudi account» (`removeAccount`): se ultimo account → overlay obbligatorio |
| **SURF-AUTH-006** | Registrazione: opzione tipo account `user` / `group` sulla stessa card — [SYS-GROUP](../promises/system/SYS-GROUP.md) REQ-004 |

### SHOULD

| ID | Promessa |
|----|----------|
| **SURF-AUTH-007** | Dopo login/sign-up OK: overlay chiuso automaticamente |

### MUST NOT

| ID | Promessa |
|----|----------|
| **SURF-AUTH-010** | `AuthScreen` a tutto schermo che sostituisce `HomeScreen` (eccetto card in overlay) |
| **SURF-AUTH-011** | Overlay dismissibile con 0 account |
| **SURF-AUTH-012** | Rotella globale che nasconde shell durante switch account |

---

## 3. Mappa legacy REQ → SURF

| AUTH-MULTI-REQ | SURF-ID |
|----------------|---------|
| REQ-001 | SURF-AUTH-001 |
| REQ-004 (tipo account) | SURF-AUTH-006 |
| REQ-011 | SURF-AUTH-002 |
| REQ-012 | SURF-AUTH-003 |
| REQ-013 | SURF-AUTH-004 |
| REQ-014 | SURF-AUTH-005 |
| REQ-018 | SURF-AUTH-010 |
| REQ-021 | SURF-AUTH-011 |
| REQ-022 | SURF-AUTH-012 |

REQ manifest/focus/sidebar: [SURF-ACCOUNT-SIDEBAR.md](./SURF-ACCOUNT-SIDEBAR.md).

---

## 4. Tracciabilità

| SURF-ID / AUTH-REQ | Verifica |
|--------------------|----------|
| SURF-AUTH-001 | `app_shell.dart` — `sessionReady` → sempre `HomeScreen`; `design/auth-overlay-shell.md` |
| SURF-AUTH-002, REQ-011, REQ-021 | `auth_overlay_shell.md`; `client/test/unit/auth_controller_test.dart` — gate overlay |
| SURF-AUTH-003, REQ-012 | `auth_overlay_shell.md` |
| SURF-AUTH-004, REQ-013 | `auth_screen.dart` — toggle Accedi/Registrati |
| SURF-AUTH-005, REQ-014 | `account_manager_persistence_test.dart`; `auth_controller_test.dart` — overlay dopo ultimo account |
| SURF-AUTH-006 | `AuthScreen` — toggle tipo account |
| SURF-AUTH-010, REQ-018, REQ-022 | `design/auth-overlay-shell.md`; PR #140 |

Gate: `cd client && bash scripts/verify.sh`

---

## 5. Riferimenti

- [SURF-ACCOUNT-SIDEBAR.md](./SURF-ACCOUNT-SIDEBAR.md)
- [registry.md](../registry.md)
- [auth-overlay-shell.md](../../design/auth-overlay-shell.md)
