# SURF-GROUP-SHELL — Shell account gruppo

| Campo | Valore |
|-------|--------|
| **Superficie ID** | `SURF-GROUP-SHELL` |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Promesse** | [SYS-RECEPTION](../promises/system/SYS-RECEPTION.md) |
| **Supersedes** | GROUP-CORE shell REQ-004, 006–007, 016–017, 020 (SDD v1 epurato) |
| **PR** | #162 |

Binding UX shell dedicata quando focus su account `profile_kind = group`: niente inbox a lista, conversazione unica + entry profilo e allow list.

---

## 1. Superficie

| Elemento | Valore |
|----------|--------|
| Router | `client/lib/screens/home_screen.dart` — branch `profile_kind == group` |
| Schermata gruppo | `client/lib/screens/group_conversation_screen.dart` |
| Riuso | `AllowedPeopleScreen`, `ProfileScreen` |
| Registrazione | `client/lib/screens/auth_screen.dart` — toggle tipo account |

---

## 2. Promesse SURFACE

### MUST

| ID | Promessa |
|----|----------|
| **SURF-GROUP-SHELL-001** | Dopo login account gruppo: compare nel manifest multi-account come ogni altro account |
| **SURF-GROUP-SHELL-002** | Account gruppo in focus: shell **senza** `list_inbox()` — solo vista conversazione (storico unico) + entry profilo + entry allow list |
| **SURF-GROUP-SHELL-003** | Layout shell gruppo: allow list e profilo come account `user`; allow list **sopra** la conversazione |
| **SURF-GROUP-SHELL-004** | Account `user`: inbox e chat invariati; peer gruppo = `peer_profile_id` del profilo gruppo |
| **SURF-GROUP-SHELL-005** | Profilo gruppo: stessi campi e UI di [SURF-PROFILE](./SURF-PROFILE.md) (`display_name`, `bio`, `avatar_url`, `pronouns`; username non editabile) |
| **SURF-GROUP-SHELL-006** | Client registrazione: stessa schermata auth utente con opzione tipo account (`user` / `group`) |

### SHOULD

| ID | Promessa |
|----|----------|
| **SURF-GROUP-SHELL-007** | Etichetta UI distinta per account `group` nel manifest (badge «Gruppo») — vedi anche [SURF-ACCOUNT-SIDEBAR](./SURF-ACCOUNT-SIDEBAR.md) |
| **SURF-GROUP-SHELL-008** | Vista storico gruppo: messaggi ordinati per `created_at` su archivio `owner_id = gruppo` |

### MUST NOT

| ID | Promessa |
|----|----------|
| **SURF-GROUP-SHELL-010** | Inbox a lista conversazioni quando focus su account `group` |

---

## 3. Mappa legacy REQ → SURF

| GROUP-CORE-REQ | SURF-ID |
|----------------|---------|
| REQ-004 | SURF-GROUP-SHELL-006 |
| REQ-005 | SURF-GROUP-SHELL-001 |
| REQ-006 | SURF-GROUP-SHELL-002 |
| REQ-007 | SURF-GROUP-SHELL-003 |
| REQ-013, REQ-015 | SURF-GROUP-SHELL-005, SURF-GROUP-SHELL-004 |
| REQ-016 | SURF-GROUP-SHELL-007 |
| REQ-017 | SURF-GROUP-SHELL-008 |
| REQ-020 | SURF-GROUP-SHELL-010 |

Backend `profile_kind`, partecipazione: [SYS-GROUP](../promises/system/SYS-GROUP.md). UI conversazione: [SURF-GROUP-CONVERSATION.md](./SURF-GROUP-CONVERSATION.md).

---

## 4. Tracciabilità

| SURF-ID / GROUP-REQ | Verifica |
|---------------------|----------|
| SURF-GROUP-SHELL-002, REQ-006–007, REQ-020 | `group_conversation_screen_test.dart`, `home_screen_group_test.dart`, `inbox_controller_group_test.dart` |
| SURF-GROUP-SHELL-006, REQ-004 | `AuthScreen` — toggle tipo account |
| SURF-GROUP-SHELL-007, REQ-016 | `account_sidebar_test.dart` |
| SURF-GROUP-SHELL-001, REQ-005 | `account_manager_persistence_test.dart` (`profileKind` manifest) |

Gate: `check-spec-sync.sh` + `verify.sh` + smoke SQL gruppo

---

## 5. Riferimenti

- [SURF-GROUP-CONVERSATION.md](./SURF-GROUP-CONVERSATION.md)
- [SURF-ACCOUNT-SIDEBAR.md](./SURF-ACCOUNT-SIDEBAR.md)
- [registry.md](../registry.md)
