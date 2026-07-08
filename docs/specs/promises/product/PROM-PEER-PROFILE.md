# PROM-PEER-PROFILE — Scheda profilo peer in overlay

| Campo | Valore |
|-------|--------|
| **Promessa ID** | `PROM-PEER-PROFILE` |
| **Classe** | PRODUCT |
| **Status** | `implemented` |
| **Ultima revisione** | 2026-07-08 |
| **Supersedes** | PEER-PROFILE (SDD v1 epurato; chiusura overlay → [PROM-OVERLAY-DISMISS](./PROM-OVERLAY-DISMISS.md)) |
| **PR origine** | #163 |

Promessa di prodotto: tap avatar peer Alfred → overlay fullscreen con identità pubblica, toggle allow list e azione rubrica — **indipendenti** e **immediati**.

---

## 1. Problema / obiettivo

In diversi punti della piattaforma l'utente vede l'avatar di un altro account Alfred. Al tap sull'avatar si apre una modale con identità pubblica e due azioni distinte: consentire ricezione messaggi ([PROM-RECEPTION-FILTER](./PROM-RECEPTION-FILTER.md)) e aggiungere/rimuovere dalla rubrica ([PROM-PERSONAL-CONTACTS](./PROM-PERSONAL-CONTACTS.md)).

Nessun nuovo schema/RPC — composizione di capability esistenti.

---

## 2. Promesse

### MUST — apertura e contenuto

| ID | Promessa |
|----|----------|
| **PROM-PEER-PROFILE-001** | Tap avatar peer Alfred → overlay fullscreen (`showPeerProfileOverlay`) |
| **PROM-PEER-PROFILE-002** | Overlay mostra: avatar grande, `display_name`, `@username` se presente, pronomi se presenti — vedi [PROM-PROFILE-IDENTITY](./PROM-PROFILE-IDENTITY.md) |
| **PROM-PEER-PROFILE-003** | Profilo proprio (`profile.id == auth.userId`): **non** aprire overlay peer |
| **PROM-PEER-PROFILE-004** | Punti attivazione: tile inbox (solo avatar), header chat, autore messaggio gruppo, lista «Persone consentite», rubrica (solo internal) |

### MUST — azioni

| ID | Promessa |
|----|----------|
| **PROM-PEER-PROFILE-005** | Switch **Allow** («Consenti messaggi») ↔ `reception_allowlist` del focus — semantica [PROM-RECEPTION-FILTER](./PROM-RECEPTION-FILTER.md) |
| **PROM-PEER-PROFILE-006** | Pulsante rubrica «Aggiungi alla rubrica» / «Rimuovi dalla rubrica» ↔ `contacts` internal — semantica [PROM-PERSONAL-CONTACTS](./PROM-PERSONAL-CONTACTS.md) |
| **PROM-PEER-PROFILE-007** | Allow e rubrica **indipendenti** — stato UI separato |
| **PROM-PEER-PROFILE-008** | Allow e rubrica: azione **immediata**, **senza** dialog di conferma |
| **PROM-PEER-PROFILE-009** | Controller legati all'account in **focus** — [PROM-MULTI-ACCOUNT](./PROM-MULTI-ACCOUNT.md) |

### SHOULD

| ID | Promessa |
|----|----------|
| **PROM-PEER-PROFILE-010** | Transizione fade + slide leggero all'apertura overlay |
| **PROM-PEER-PROFILE-011** | Chiusura overlay: conforme a [PROM-OVERLAY-DISMISS](./PROM-OVERLAY-DISMISS.md) |
| **PROM-PEER-PROFILE-012** | `ProfileAvatar` accetta `onTap` opzionale con feedback ripple circolare |

### MUST NOT

| ID | Promessa |
|----|----------|
| **PROM-PEER-PROFILE-020** | Confondere Allow (ricezione) con rubrica (scorciatoia) |
| **PROM-PEER-PROFILE-021** | Dialog di conferma su toggle Allow o azione rubrica nell'overlay |
| **PROM-PEER-PROFILE-022** | Esporre email del peer |
| **PROM-PEER-PROFILE-023** | Overlay per contatti rubrica **esterni** (senza `linked_profile_id`) |
| **PROM-PEER-PROFILE-024** | Nuove RPC o tabelle — solo PostgREST esistente |

---

## 3. Mappa legacy REQ

| Legacy REQ | PROM-ID |
|------------|---------|
| PEER-PROFILE-REQ-001 | PROM-PEER-PROFILE-001 |
| PEER-PROFILE-REQ-002 | PROM-PEER-PROFILE-002 |
| PEER-PROFILE-REQ-003 | PROM-PEER-PROFILE-005 |
| PEER-PROFILE-REQ-004 | PROM-PEER-PROFILE-006 |
| PEER-PROFILE-REQ-005 | PROM-PEER-PROFILE-007 |
| PEER-PROFILE-REQ-006 | PROM-PEER-PROFILE-008 |
| PEER-PROFILE-REQ-007 | PROM-PEER-PROFILE-003 |
| PEER-PROFILE-REQ-008 | PROM-PEER-PROFILE-004 |
| PEER-PROFILE-REQ-009 | PROM-PEER-PROFILE-006 (rimozione rubrica) |
| PEER-PROFILE-REQ-010 | PROM-PEER-PROFILE-005 (toggle Allow off) |
| PEER-PROFILE-REQ-011 | PROM-PEER-PROFILE-009 |
| PEER-PROFILE-REQ-012 | PROM-PEER-PROFILE-010 |
| PEER-PROFILE-REQ-013 | PROM-PEER-PROFILE-011 → [PROM-OVERLAY-DISMISS](./PROM-OVERLAY-DISMISS.md) |
| PEER-PROFILE-REQ-014 | PROM-PEER-PROFILE-012 |
| PEER-PROFILE-REQ-015 | PROM-PEER-PROFILE-020 |
| PEER-PROFILE-REQ-016 | PROM-PEER-PROFILE-021 |
| PEER-PROFILE-REQ-017 | PROM-PEER-PROFILE-022 |
| PEER-PROFILE-REQ-018 | PROM-PEER-PROFILE-024 |
| PEER-PROFILE-REQ-019 | PROM-PEER-PROFILE-023 |

---

## 4. Contratto implementativo

| Elemento | Responsabilità |
|----------|----------------|
| `showPeerProfileOverlay` | Entry point; skip self; `showGeneralDialog` fullscreen |
| `PeerProfileOverlay` | UI identità + switch Allow + pulsante rubrica |
| `ProfileAvatar.onTap` | Tap avatar riusabile |
| `ContactsController` | `contactForProfileId`, `removeInternalByProfileId` |
| `ReceptionAllowlistController` | `removeByProfileId`, `addProfile` |
| `ChatMessage.toAuthorProfileSummary` | Profilo parziale da messaggio gruppo |

### UX attese

| Condizione | Comportamento |
|------------|---------------|
| Tap avatar inbox | Overlay; tap resto tile → apre chat |
| Switch Allow ON | `addProfile` immediato |
| Switch Allow OFF | `removeByProfileId` immediato |
| In rubrica | Pulsante «Rimuovi dalla rubrica» |
| Non in rubrica | Pulsante «Aggiungi alla rubrica» |
| Contatto esterno rubrica | Nessun overlay al tap avatar |

---

## 5. Superfici conformi

| Superficie | Stato | File |
|------------|-------|------|
| SURF-INBOX | `implemented` | [SURF-INBOX.md](../../surfaces/SURF-INBOX.md) — tap avatar tile |
| SURF-CONTACTS | `implemented` | [SURF-CONTACTS.md](../../surfaces/SURF-CONTACTS.md) — internal only |
| SURF-ALLOWLIST | `implemented` | [SURF-ALLOWLIST.md](../../surfaces/SURF-ALLOWLIST.md) |
| Chat header / gruppo | `implemented` | `chat_panel.dart`, `message_author_header.dart` |

---

## 6. Tracciabilità

| PROM-ID | Verifica |
|---------|----------|
| PROM-PEER-PROFILE-005, 010 | `reception_allowlist_controller_test.dart` — `removeByProfileId` |
| PROM-PEER-PROFILE-006, 009 | `contacts_controller_test.dart` — `contactForProfileId`, `removeInternalByProfileId` |
| PROM-PEER-PROFILE-003 | `peer_profile_overlay_test.dart` — skip self |
| PROM-PEER-PROFILE-002, 008, 012 | `peer_profile_overlay_test.dart` — widget smoke |
| PROM-PEER-PROFILE-009 | `main.dart` — proxy provider focus |
| PROM-PEER-PROFILE-011 | [PROM-OVERLAY-DISMISS](./PROM-OVERLAY-DISMISS.md) |

Gate: `bash scripts/check-spec-sync.sh` + `cd client && bash scripts/verify.sh`

---

## 7. Riferimenti

| Documento | Ruolo |
|-----------|--------|
| [registry.md](../../registry.md) | Indice promesse |
| [SURF-PEER-PROFILE](../../surfaces/SURF-PEER-PROFILE.md) | Binding superficie |
| [PROM-OVERLAY-DISMISS](./PROM-OVERLAY-DISMISS.md) | Chiusura overlay |
| [PROM-RECEPTION-FILTER](./PROM-RECEPTION-FILTER.md) | Semantica Allow |
| [PROM-PERSONAL-CONTACTS](./PROM-PERSONAL-CONTACTS.md) | Semantica rubrica |
