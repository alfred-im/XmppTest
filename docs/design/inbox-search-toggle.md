# Ricerca on-demand nella lista conversazioni

> **Superseded by spec**: [INBOX-SEARCH.spec.md](../specs/capabilities/INBOX-SEARCH.spec.md) — design UX PR #132; per contratto usare la spec.

**Data**: 2026-06-28  
**Status**: ✅ Specifica vincolante — implementata in client Flutter (PR #132)  
**Categoria**: Inbox, UX, layout  
**Correlata**: [alpha-full-stack.md](../architecture/alpha-full-stack.md) §2.12

---

## Concept

La ricerca nella **lista conversazioni** (`InboxPanel`) non è sempre visibile. L’utente la apre con un’icona lente; si chiude con tap fuori dalla barra o secondo tap sulla lente. Alla chiusura il filtro testuale si **azzera** (lista completa).

Filtro client-side su `InboxController.filteredPeers` — stesso meccanismo di prima, solo UI on-demand.

---

## Layout

| Contesto | Header | Ricerca |
|----------|--------|---------|
| **Mobile** (`showTopBar: true`) | Barra scura «Alfred» — lente a destra, prima di Contatti | Barra sotto header, solo se aperta |
| **Desktop** (`showTopBar: false`) | Riga «Conversazioni» + lente + Contatti | Barra sotto la riga titolo, solo se aperta |

Apertura: tap lente → barra visibile + `requestFocus` sul campo.

---

## Regole di chiusura (vincolanti)

**Un solo metodo**: `InboxPanel._dismissSearch()` — nasconde barra, svuota controller, chiama `onSearchChanged('')`, toglie focus.

| Trigger | Meccanismo |
|---------|------------|
| Secondo tap sulla lente | Toggle esplicito |
| Tap fuori da barra + lente | `TapRegion` con `groupId` condiviso — `onTapOutside` → `_dismissSearch()` |
| Smontaggio widget | `dispose` — azzera filtro se ancora attivo |
| Cambio account | `ValueKey(userId)` su `InboxPanel` in `HomeScreen` — widget nuovo, stato ricerca reset |

**Vietato**: liste di callback sparse in `HomeScreen` o altri parent per chiudere la ricerca (contatti, drawer, selezione peer, ecc.). Il tap-outside copre le interazioni utente senza enumerare le azioni.

### Non coperto in Alpha (follow-up)

- Tasto **Indietro** (Android) / **Escape** (web)
- Navigazione programmatica senza tap utente

Estensioni future devono chiamare solo `_dismissSearch()` (o equivalente esposto), non duplicare logica.

---

## Implementazione Flutter

| Elemento | Percorso |
|----------|----------|
| UI + stato ricerca + `dismissSearch` | `client/lib/widgets/inbox_panel.dart` |
| Filtro lista (invariato) | `client/lib/providers/inbox_controller.dart` |
| `Key` account | `client/lib/screens/home_screen.dart` |

**Tecnica**: `TapRegion` — barra e lente nello stesso `groupId`; `onTapOutside` solo mentre `_searchVisible`.

---

## Riferimenti

- [alpha-full-stack.md](../architecture/alpha-full-stack.md) — §2.12
- `PROJECT_MAP.md` — layout inbox
- PR #132
