# INBOX-SEARCH — Ricerca on-demand inbox

| Campo | Valore |
|-------|--------|
| **Spec ID** | `INBOX-SEARCH` |
| **Layer** | capability |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-03 |
| **ADR** | — (UX client; dipende da [MSG-INBOX](./MSG-INBOX.spec.md)) |
| **PR** | #132 |
| **Supersedes** | `design/inbox-search-toggle.md` (evidenza UX) |

Documento per AI — contratto ricerca nella lista conversazioni: UI on-demand, filtro client-side, chiusura unificata.

---

## 1. Problema / obiettivo

L’utente deve poter filtrare la lista conversazioni per nome peer, anteprima ultimo messaggio o indirizzo, senza occupare spazio permanente nell’header inbox. La ricerca è **solo client-side** sulla lista già caricata da `list_inbox()`.

---

## 2. Requisiti

### MUST

- Barra «Cerca messaggi» **nascosta** di default in `InboxPanel`.
- Apertura: tap icona lente (`Icons.search`) → barra visibile + `requestFocus` sul campo.
- Filtro: `InboxController.filteredPeers` — substring case-insensitive su:
  - `displayName`
  - `preview` (ultimo messaggio)
  - `address` (username / indirizzo peer)
- Chiusura unificata: **un solo** metodo `_dismissSearch()` in `InboxPanel`:
  - nasconde barra
  - svuota `TextEditingController`
  - `onSearchChanged('')` se c’era testo
  - `unfocus` sul campo
- Trigger chiusura:
  - secondo tap sulla lente (toggle)
  - `TapRegion.onTapOutside` mentre barra visibile (barra + lente stesso `groupId`)
  - `dispose` del widget se filtro attivo
- Cambio account: `ValueKey(accountUserId)` su `InboxPanel` in `HomeScreen` → stato ricerca reset (widget nuovo).
- Layout:
  - **Mobile** (`showTopBar: true`): lente nell’header «Alfred», prima di Contatti; barra sotto header
  - **Desktop** (`showTopBar: false`): lente nella riga «Conversazioni»; barra sotto titolo

### SHOULD

- Hint campo: «Cerca messaggi».
- Tooltip lente: «Cerca messaggi».

### MUST NOT

- Ricerca server-side / RPC dedicata in Alpha.
- Barra ricerca sempre visibile.
- Callback sparse in `HomeScreen` (o parent) per chiudere la ricerca su ogni azione (contatti, drawer, selezione peer).
- Duplicare logica dismiss fuori da `_dismissSearch()` (o equivalente esposto).

---

## 3. Fuori scope

- Ricerca nel **contenuto** dei messaggi in chat (solo lista conversazioni).
- Tasto **Indietro** Android / **Escape** web per chiudere (follow-up).
- Navigazione programmatica che chiude ricerca senza tap utente.
- Ricerca full-text su DB.

---

## 4. Contratto

### 4.1 Backend

Nessuno — filtro su `peers` già in memoria da [MSG-INBOX](./MSG-INBOX.spec.md).

### 4.2 Client

| Componente | Responsabilità |
|------------|----------------|
| `InboxPanel` | Stato `_searchVisible`, UI barra, `_dismissSearch`, `_toggleSearch`, `TapRegion` |
| `InboxController.setSearchQuery` | Aggiorna `_searchQuery`, `notifyListeners()` |
| `InboxController.filteredPeers` | `filterByQueryFields` su displayName, preview, address |
| `list_filter.dart` | `filterByQueryFields` — substring case-insensitive |
| `HomeScreen._inboxPanel` | `peers: inbox.filteredPeers`, `onSearchChanged: inbox.setSearchQuery`, `key: ValueKey(accountUserId)` |

### 4.3 UX — flusso

```
Tap lente → barra + focus → digitazione → filteredPeers aggiornata live
Tap fuori / secondo tap lente → _dismissSearch → lista completa
Switch account → nuovo InboxPanel → ricerca chiusa
```

---

## 5. Verifica

| Tipo | Riferimento |
|------|-------------|
| Gate | `cd client && bash scripts/verify.sh` |
| Manuale | Apri/chiudi ricerca mobile + desktop; tap outside; switch account |

Nessun test widget dedicato in Alpha — comportamento coperto da review UX (#132).

---

## 6. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [inbox-search-toggle.md](../../design/inbox-search-toggle.md) | Design originale PR #132 |
| [alpha-full-stack.md](../../architecture/alpha-full-stack.md) §2.12 | Panoramica |
| [MSG-INBOX](./MSG-INBOX.spec.md) | Sorgente dati `peers` |

**Codice**: `client/lib/widgets/inbox_panel.dart`, `providers/inbox_controller.dart`, `utils/list_filter.dart`, `screens/home_screen.dart`
