# PROM-PROFILE-IDENTITY — Identità pubblica in UI

| Campo | Valore |
|-------|--------|
| **Promessa ID** | `PROM-PROFILE-IDENTITY` |
| **Classe** | PRODUCT |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Supersedes** | PROFILE REQ-007–014 client/UX (SDD v1 epurato) |
| **PR origine** | #118 (username/email), #134 (avatar, pronomi, `ProfileSummary`) |

Promessa di prodotto: modello e widget condivisi per identità pubblica (`ProfileSummary`) su sidebar, inbox, chat, manifest multi-account e rubrica.

---

## 1. Problema / obiettivo

L'utente riconosce persone e account con nome, username, pronomi e avatar coerenti in tutta l'app. Dopo modifica profilo proprio, l'identità in sidebar e manifest si aggiorna senza riavvio.

Schema backend (`profiles`, bucket `avatars`): [SYS-PROFILE](../system/SYS-PROFILE.md) e [contracts/schema.md](../../contracts/schema.md).

---

## 2. Promesse

### MUST

| ID | Promessa |
|----|----------|
| **PROM-PROFILE-IDENTITY-001** | Modello UI unificato **`ProfileSummary`**: `id`, `displayName`, `username?`, `avatarUrl?`, `pronouns?` — usato da sidebar, inbox (`ChatPeer`), `OpenAccount`, rubrica |
| **PROM-PROFILE-IDENTITY-002** | Widget condivisi: `ProfileAvatar` (foto o iniziale colorata), `ProfileIdentityLines` (nome, `@username`, pronomi) |
| **PROM-PROFILE-IDENTITY-003** | Dopo salvataggio profilo proprio: `AuthController.refreshProfile()` → aggiorna manifest account (`OpenAccount.profile`) |
| **PROM-PROFILE-IDENTITY-004** | Peer in inbox: campi profilo peer (`peer_avatar_url`, `peer_pronouns`) da `list_inbox()` |
| **PROM-PROFILE-IDENTITY-005** | Risoluzione username → profilo: `find_profile_by_username` ritorna `avatar_url`, `pronouns` |

### SHOULD

| ID | Promessa |
|----|----------|
| **PROM-PROFILE-IDENTITY-010** | Stringhe opzionali (`bio`, `pronouns`) salvate come `null` se vuote dopo trim |
| **PROM-PROFILE-IDENTITY-011** | Fallback avatar: `CircleAvatar` con iniziale da `display_name` e colore deterministico per `id` |
| **PROM-PROFILE-IDENTITY-012** | `ProfileService.fetchSummariesByIds` per batch fetch profili pubblici |

### MUST NOT

| ID | Promessa |
|----|----------|
| **PROM-PROFILE-IDENTITY-020** | Esporre email in rubrica, ricerca profili o inbox |
| **PROM-PROFILE-IDENTITY-021** | Modificare `username` da schermata profilo Alpha |

---

## 3. Mappa legacy REQ

| Legacy REQ | PROM-ID |
|------------|---------|
| PROFILE-REQ-007 | PROM-PROFILE-IDENTITY-001 |
| PROFILE-REQ-008 | PROM-PROFILE-IDENTITY-002 |
| PROFILE-REQ-009 | PROM-PROFILE-IDENTITY-003 |
| PROFILE-REQ-010 | PROM-PROFILE-IDENTITY-004 |
| PROFILE-REQ-011 | PROM-PROFILE-IDENTITY-005 |
| PROFILE-REQ-012 | PROM-PROFILE-IDENTITY-010 |
| PROFILE-REQ-013 | PROM-PROFILE-IDENTITY-011 |
| PROFILE-REQ-014 | PROM-PROFILE-IDENTITY-012 |
| PROFILE-REQ-015 | PROM-PROFILE-IDENTITY-020 |
| PROFILE-REQ-016 | PROM-PROFILE-IDENTITY-021 |

---

## 4. Contratto implementativo

| Elemento | Responsabilità |
|----------|----------------|
| `ProfileSummary` | DTO unificato identità pubblica |
| `UserProfile` | Profilo completo (`summary` + `bio` + timestamp) |
| `ProfileService` | `updateProfile`, `findByUsername`, `fetchSummariesByIds` |
| `ProfileAvatarService` | `uploadAvatar` → URL pubblico |
| `ProfileController` | Stato save/upload |
| `ProfileScreen` | Form edit; email/username read-only |
| `profile_identity.dart` | `ProfileAvatar`, `ProfileIdentityLines` |
| `OpenAccount.profile` | Snapshot in manifest multi-account |

### Dove appare `ProfileSummary`

- `AccountSidebar` — account in focus e lista account
- `InboxPeerTile` — avatar + nome peer
- `ChatPanel` header — identità controparte
- `ChatPeer` — identità chat
- Overlay peer — [PROM-PEER-PROFILE](./PROM-PEER-PROFILE.md)

---

## 5. Superfici conformi

| Superficie | Stato | File |
|------------|-------|------|
| SURF-INBOX | `implemented` | [SURF-INBOX.md](../../surfaces/SURF-INBOX.md) — tile peer |
| SURF-CONTACTS | `implemented` | [SURF-CONTACTS.md](../../surfaces/SURF-CONTACTS.md) |
| SURF-ALLOWLIST | `implemented` | [SURF-ALLOWLIST.md](../../surfaces/SURF-ALLOWLIST.md) |
| Profilo proprio | `implemented` | `profile_screen.dart` |
| Shell sidebar | `implemented` | `account_sidebar.dart` |

---

## 6. Tracciabilità

| PROM-ID | Verifica |
|---------|----------|
| PROM-PROFILE-IDENTITY-001 | `models_and_utils_test.dart` — `ProfileSummary.fromProfilesRow` |
| PROM-PROFILE-IDENTITY-002, 011 | `models_and_utils_test.dart` — `avatarColorForId`; `profile_identity.dart` |
| PROM-PROFILE-IDENTITY-003 | `account_storage_test.dart`; `auth_controller.dart` `refreshProfile` |
| PROM-PROFILE-IDENTITY-004 | `20260628100000_inbox_peer_profile_fields.sql`; [SYS-MAILBOX](../system/SYS-MAILBOX.md) |
| PROM-PROFILE-IDENTITY-005 | `schema_smoke.sql` — `find_profile_by_username` |
| PROM-PROFILE-IDENTITY-010 | `models_and_utils_test.dart` — `UserProfile.fromJson` |
| PROM-PROFILE-IDENTITY-020 | [SYS-CONTACTS](../system/SYS-CONTACTS.md); RPC senza campo email |

Gate: `bash scripts/check-spec-sync.sh` + `cd client && bash scripts/verify.sh`

---

## 7. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [registry.md](../../registry.md) | Indice promesse |
| [SYS-PROFILE](../system/SYS-PROFILE.md) | Schema backend |
| [SURF-PROFILE](../../surfaces/SURF-PROFILE.md) | Binding superficie |
| [PROM-MULTI-ACCOUNT](./PROM-MULTI-ACCOUNT.md) | Manifest `OpenAccount.profile` |
| [PROM-PEER-PROFILE](./PROM-PEER-PROFILE.md) | Overlay identità peer |
