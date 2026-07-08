# PROM-LIST-FILTER — Filtro locale su lista e ricerca on-demand

| Campo | Valore |
|-------|--------|
| **Promessa ID** | `PROM-LIST-FILTER` |
| **Classe** | PRODUCT |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Supersedes** | UX in [INBOX-SEARCH.spec.md](../../capabilities/INBOX-SEARCH.spec.md); [inbox-search-toggle.md](../../../design/inbox-search-toggle.md) |
| **PR origine** | #132 (inbox); estensione contatti/allow list — backlog |

Promessa di prodotto riusabile: filtrare una lista già caricata in memoria, con barra di ricerca **on-demand** (icona lente).

---

## 1. Problema / obiettivo

L'utente deve poter restringere una lista senza occupare spazio permanente nell'header. Il filtro è **solo client-side** sui dati già in RAM; nessuna RPC dedicata alla ricerca lista.

Le superfici ([SURF-*](../../registry.md)) dichiarano campi filtrabili, hint e componenti Flutter.

---

## 2. Promesse

### MUST — logica filtro

| ID | Promessa |
|----|----------|
| **PROM-LIST-FILTER-001** | Filtro: substring case-insensitive sui campi dichiarati dalla SURFACE |
| **PROM-LIST-FILTER-002** | Query vuota → lista completa (nessun elemento escluso) |
| **PROM-LIST-FILTER-003** | Aggiornamento filtro in tempo reale su ogni keystroke (`onChanged`) |
| **PROM-LIST-FILTER-004** | Implementazione condivisa: `filterByQuery` / `filterByQueryFields` in `client/lib/utils/list_filter.dart` |

### MUST — ricerca on-demand (UI)

| ID | Promessa |
|----|----------|
| **PROM-LIST-FILTER-010** | Barra di ricerca **nascosta** di default |
| **PROM-LIST-FILTER-011** | Apertura: tap icona lente (`Icons.search`) → barra visibile + `requestFocus` sul campo |
| **PROM-LIST-FILTER-012** | Chiusura unificata: **un solo** metodo `dismissSearch()` (o equivalente esposto dal widget condiviso) — nasconde barra, svuota controller, `onSearchChanged('')` se testo presente, `unfocus` |
| **PROM-LIST-FILTER-013** | Trigger chiusura: secondo tap lente (toggle); `TapRegion.onTapOutside` (barra + lente stesso `groupId`); `dispose` se filtro attivo |
| **PROM-LIST-FILTER-014** | Tooltip icona lente = hint del campo (testo definito dalla SURFACE) |

### SHOULD

| ID | Promessa |
|----|----------|
| **PROM-LIST-FILTER-020** | Widget condiviso `CollapsibleListSearch` (o nome equivalente) in `client/lib/widgets/` — superfici non duplicano stato `_searchVisible` / `_dismissSearch` |
| **PROM-LIST-FILTER-021** | Cambio account / smontaggio schermata: stato ricerca reset (es. `ValueKey(ownerId)` o `dispose`) |

### MUST NOT

| ID | Promessa |
|----|----------|
| **PROM-LIST-FILTER-030** | Ricerca server-side / RPC dedicata per filtrare la lista |
| **PROM-LIST-FILTER-031** | Barra ricerca sempre visibile sulla superficie |
| **PROM-LIST-FILTER-032** | Callback sparse nel parent (es. `HomeScreen`) per chiudere la ricerca su ogni azione |
| **PROM-LIST-FILTER-033** | Duplicare logica dismiss fuori dal punto unico documentato |

### Fuori scope (follow-up)

- Tasto Indietro Android / Escape web per chiudere
- Navigazione programmatica che chiude ricerca senza tap utente
- Ricerca nel contenuto messaggi in chat (solo liste)

---

## 3. Contratto implementativo

| Elemento | Responsabilità |
|----------|----------------|
| `list_filter.dart` | `filterByQuery`, `filterByQueryFields` |
| Widget ricerca (condiviso o per-superficie conforme) | Stato visibilità, lente, `TapRegion`, `dismissSearch` |
| Controller per superficie | `_searchQuery`, `setSearchQuery`, getter lista filtrata |
| SURFACE | Campi filtro, hint, tooltip, layout header |

---

## 4. Superfici conformi

| Superficie | Stato conformità | File |
|------------|------------------|------|
| SURF-INBOX | `implemented` | [SURF-INBOX.md](../../surfaces/SURF-INBOX.md) |
| SURF-CONTACTS | `implemented` | [SURF-CONTACTS.md](../../surfaces/SURF-CONTACTS.md) |
| SURF-ALLOWLIST | `implemented` | [SURF-ALLOWLIST.md](../../surfaces/SURF-ALLOWLIST.md) |

---

## 5. Tracciabilità

| PROM-ID | Verifica |
|---------|----------|
| PROM-LIST-FILTER-001–004 | `client/test/unit/list_filter_test.dart` |
| PROM-LIST-FILTER-010–014 | `collapsible_list_search.dart`; `inbox_panel_test.dart` |
| PROM-LIST-FILTER-020 | `collapsible_list_search.dart` (widget condiviso) |
| PROM-LIST-FILTER-020–021 | `home_screen.dart` — `ValueKey(accountUserId)` su `InboxPanel` |
| PROM-LIST-FILTER-030 | Nessuna RPC ricerca lista; solo memoria |
| PROM-LIST-FILTER-031–033 | `inbox-search-toggle.md`; dismiss centralizzato |
| SURF-CONTACTS (estensione) | `contacts_screen.dart` + `contacts_screen_test.dart` |
| SURF-ALLOWLIST (estensione) | `allowed_people_screen.dart` + `allowed_people_screen_test.dart` |

Gate: `bash scripts/check-spec-sync.sh` + `cd client && bash scripts/verify.sh`

---

## 6. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [registry.md](../../registry.md) | Indice promesse |
| [MAILBOX-INBOX.spec.md](../../capabilities/MAILBOX-INBOX.spec.md) | Sorgente dati inbox |
| [CONTACTS.spec.md](../../capabilities/CONTACTS.spec.md) | Sorgente dati rubrica |
| [RECEPTION-ALLOWLIST.spec.md](../../capabilities/RECEPTION-ALLOWLIST.spec.md) | Sorgente dati allow list |
