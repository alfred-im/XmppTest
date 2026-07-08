# PROM-OVERLAY-DISMISS — Chiusura overlay fullscreen

| Campo | Valore |
|-------|--------|
| **Promessa ID** | `PROM-OVERLAY-DISMISS` |
| **Classe** | PRODUCT |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Supersedes** | PEER-PROFILE REQ-013 (SDD v1 epurato) |
| **PR origine** | #163 |

Promessa di prodotto riusabile: chiudere overlay fullscreen (modale) con pulsante ✕ e tap sul barrier — pattern unificato, non callback sparse nel parent.

---

## 1. Problema / obiettivo

L'utente chiude overlay fullscreen (es. scheda profilo peer) in modo prevedibile e coerente. La logica di dismiss resta nel widget overlay, non propagata con callback ad hoc nei parent.

Prima implementazione: [PROM-PEER-PROFILE](./PROM-PEER-PROFILE.md). Estendibile ad altri overlay fullscreen conformi.

---

## 2. Promesse

### MUST — trigger chiusura

| ID | Promessa |
|----|----------|
| **PROM-OVERLAY-DISMISS-001** | Pulsante ✕ in overlay → `Navigator.pop` / chiusura dialog |
| **PROM-OVERLAY-DISMISS-002** | Tap su barrier (area scura esterna al contenuto) → chiusura overlay |
| **PROM-OVERLAY-DISMISS-003** | Implementazione nel widget overlay (`PeerProfileOverlay` o equivalente) — **un solo** punto di dismiss documentato |

### SHOULD

| ID | Promessa |
|----|----------|
| **PROM-OVERLAY-DISMISS-010** | Transizione simmetrica all'apertura (fade/slide in chiusura) |

### MUST NOT

| ID | Promessa |
|----|----------|
| **PROM-OVERLAY-DISMISS-020** | Callback sparse nel parent (es. `HomeScreen`) per chiudere overlay su ogni azione navigazione |
| **PROM-OVERLAY-DISMISS-021** | Duplicare logica dismiss fuori dal widget overlay conforme |
| **PROM-OVERLAY-DISMISS-022** | Dialog di conferma prima della chiusura (dismiss ≠ annullare azione Allow/rubrica) |

### Fuori scope (follow-up)

- Tasto Indietro Android / Escape web per chiudere
- Navigazione programmatica che chiude overlay senza gesto utente

---

## 3. Mappa legacy REQ

| Legacy REQ | PROM-ID |
|------------|---------|
| PEER-PROFILE-REQ-013 | PROM-OVERLAY-DISMISS-001, 002, 003 |

---

## 4. Contratto implementativo

| Elemento | Responsabilità |
|----------|----------------|
| `showPeerProfileOverlay` | `showGeneralDialog` con `barrierDismissible: true` |
| `PeerProfileOverlay` | Pulsante ✕; contenuto card; barrier tap |
| Parent (inbox, chat, …) | Solo invocazione `showPeerProfileOverlay` — nessun stato dismiss |

Pattern analogo a [PROM-LIST-FILTER](./PROM-LIST-FILTER.md) `dismissSearch()` — punto unico per chiusura.

---

## 5. Superfici conformi

| Superficie | Stato | File |
|------------|-------|------|
| Overlay profilo peer | `implemented` | `peer_profile_overlay.dart` |
| SURF-INBOX | `implemented` | tap avatar → overlay conforme |
| SURF-CONTACTS | `implemented` | tap avatar internal → overlay conforme |
| SURF-ALLOWLIST | `implemented` | tap entry → overlay conforme |

---

## 6. Tracciabilità

| PROM-ID | Verifica |
|---------|----------|
| PROM-OVERLAY-DISMISS-001–003 | `peer_profile_overlay_test.dart` — widget smoke; barrier + close button |
| PROM-OVERLAY-DISMISS-020–021 | `peer_profile_overlay.dart` — dismiss centralizzato; nessun callback parent |
| PEER-PROFILE-REQ-013 (legacy) | `peer_profile_overlay_test.dart` |

Gate: `bash scripts/check-spec-sync.sh` + `cd client && bash scripts/verify.sh`

---

## 7. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [registry.md](../../registry.md) | Indice promesse |
| [PROM-PEER-PROFILE](./PROM-PEER-PROFILE.md) | Overlay profilo peer |
| [SURF-PEER-PROFILE](../../surfaces/SURF-PEER-PROFILE.md) | Binding superficie |
| [PROM-PEER-PROFILE](./PROM-PEER-PROFILE.md) | Contenuto overlay |
| [PROM-LIST-FILTER](./PROM-LIST-FILTER.md) | Pattern dismiss unificato (lista) |
