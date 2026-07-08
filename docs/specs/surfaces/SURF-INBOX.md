# SURF-INBOX — Lista conversazioni

| Campo | Valore |
|-------|--------|
| **Superficie ID** | `SURF-INBOX` |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Promesse** | [PROM-LIST-FILTER](../promises/product/PROM-LIST-FILTER.md) |
| **Supersedes** | INBOX-SEARCH, MAILBOX-INBOX REQ-011, RECEPTION-ALLOWLIST REQ-015 (SDD v1 epurato) |
| **PR** | #132, #161 |

Binding promessa PRODUCT filtro lista sulla inbox (`InboxPanel`) + entry «Persone consentite» in header.

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
| **SURF-INBOX-007** | Icona «Persone consentite» in header inbox accanto a icona rubrica «Contatti» → naviga a `AllowedPeopleScreen` — [PROM-RECEPTION-FILTER](../promises/product/PROM-RECEPTION-FILTER.md) REQ-015 |

### MUST NOT

| ID | Promessa |
|----|----------|
| **SURF-INBOX-010** | Ricerca nel contenuto messaggi chat (solo lista conversazioni) |

---

## 3. Mappa legacy REQ → SURF

| Capability REQ | SURF-ID |
|----------------|---------|
| INBOX-SEARCH REQ-003, 006–008 | SURF-INBOX-001–006 |
| MAILBOX-INBOX-REQ-011 | SURF-INBOX-001–006 |
| RECEPTION-ALLOWLIST-REQ-015 | SURF-INBOX-007 |
| INBOX-SEARCH REQ-011 | PROM-LIST-FILTER-030 (no RPC lista) |

---

## 4. Tracciabilità

| SURF-ID / PROM-ID | Verifica |
|-------------------|----------|
| SURF-INBOX-001, PROM-LIST-FILTER-010–014 | `inbox_panel_test.dart`; `collapsible_list_search.dart`, `inbox_panel.dart` |
| SURF-INBOX-002 | `inbox_controller.dart` `filteredPeers`; `list_filter_test.dart` |
| SURF-INBOX-003 | `inbox_panel.dart` hint + tooltip |
| SURF-INBOX-004, SURF-INBOX-005 | `inbox_panel.dart` — `showTopBar` |
| SURF-INBOX-006 | `home_screen.dart` |
| SURF-INBOX-007, RECEPTION-REQ-015 | `inbox_panel_test.dart`; `allowed_people_screen_test.dart` |

---

## 5. Riferimenti

- [PROM-LIST-FILTER](../promises/product/PROM-LIST-FILTER.md)
- [SURF-ALLOWLIST.md](./SURF-ALLOWLIST.md)
- [SURF-CHAT.md](./SURF-CHAT.md)
- [registry.md](../registry.md)
