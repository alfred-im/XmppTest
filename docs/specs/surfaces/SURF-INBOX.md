# SURF-INBOX — Lista conversazioni

| Campo | Valore |
|-------|--------|
| **Superficie ID** | `SURF-INBOX` |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Promesse** | [PROM-LIST-FILTER](../promises/product/PROM-LIST-FILTER.md) |
| **Supersedes** | [INBOX-SEARCH.spec.md](../capabilities/INBOX-SEARCH.spec.md) (parte UX) |
| **PR** | #132 |

Binding della promessa PRODUCT filtro lista sulla inbox (`InboxPanel`).

---

## 1. Superficie

| Elemento | Valore |
|----------|--------|
| Widget | `client/lib/widgets/inbox_panel.dart` |
| Controller | `InboxController` — `filteredPeers`, `setSearchQuery` |
| Parent | `HomeScreen` — `peers: inbox.filteredPeers`, `onSearchChanged`, `key: ValueKey(accountUserId)` |

---

## 2. Promesse SURFACE

### MUST

| ID | Promessa |
|----|----------|
| **SURF-INBOX-001** | Conforme a [PROM-LIST-FILTER](../promises/product/PROM-LIST-FILTER.md) |
| **SURF-INBOX-002** | Campi filtro: `displayName`, `preview`, `address` del peer (`filterByQueryFields`) |
| **SURF-INBOX-003** | Hint campo e tooltip lente: «Cerca messaggi» |
| **SURF-INBOX-004** | Layout **mobile** (`showTopBar: true`): lente nell'header «Alfred», prima di Contatti; barra sotto header |
| **SURF-INBOX-005** | Layout **desktop** (`showTopBar: false`): lente nella riga «Conversazioni»; barra sotto titolo |
| **SURF-INBOX-006** | Cambio account: `ValueKey(accountUserId)` su `InboxPanel` → stato ricerca reset |

### MUST NOT

| ID | Promessa |
|----|----------|
| **SURF-INBOX-010** | Ricerca nel contenuto messaggi chat (solo lista conversazioni) |

---

## 3. Tracciabilità

| SURF-ID / PROM-ID | Verifica |
|-------------------|----------|
| SURF-INBOX-001, PROM-LIST-FILTER-010–014 | `inbox_panel_test.dart`; `inbox_panel.dart` |
| SURF-INBOX-002 | `inbox_controller.dart` `filteredPeers`; `list_filter_test.dart` |
| SURF-INBOX-003 | `inbox_panel.dart` hint + tooltip |
| SURF-INBOX-004, SURF-INBOX-005 | `inbox_panel.dart` — `showTopBar` |
| SURF-INBOX-006 | `home_screen.dart` |

---

## 4. Riferimenti

- [PROM-LIST-FILTER](../promises/product/PROM-LIST-FILTER.md)
- [MAILBOX-INBOX.spec.md](../capabilities/MAILBOX-INBOX.spec.md)
