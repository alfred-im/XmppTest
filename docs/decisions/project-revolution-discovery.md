# Rivoluzione Alfred — Discovery Q&A

**Stato**: 🟡 In corso — Iterazione 3 (modello inbox, auth, server, sicurezza)  
**Creato**: 2026-06-24  
**Fase**: **Prototipo** — scelte infrastrutturali non critiche se funzionano; priorità al documento e alla logica.  
**Obiettivo**: Allinearsi su visione, scope e vincoli **prima** di toccare codice o architettura.  
**Regola**: Nessuna implementazione finché non dici esplicitamente di iniziare. Fino ad allora: solo questo documento, top-down.

**Glossario**: **Piattaforma** = Supabase (termine usato dall'utente).

---

## Come usare questo documento

1. **Tu rispondi** in modo discorsivo.
2. **Io formalizzo** qui dentro e aggiungo domande di follow-up se serve.
3. **Approccio top-down**: prima strategia e architettura a tutti i livelli, poi implementazione a pezzi.
4. **Chiusura**: quando ogni area è ✅, questo file diventa il **brief vincolante**.

### Legenda stato sezioni

| Simbolo | Significato |
|---------|-------------|
| ⬜ | Non ancora discusso |
| 🟡 | In discussione |
| ✅ | Approvato — vincolante |
| ❌ | Scartato / fuori scope |

---

## Visione target (formalizzata)

### Sintesi

**Alfred viene riscritto da zero.** Il `web-client/` React attuale **muore del tutto** (ultimo stato preservato con tag git — vedi D-012). Al suo posto: client **Flutter Web**, backend **Supabase**, due **bridge Python** (XMPP + Matrix) su **Fly.io**, **inbox unificata** per entrambi i protocolli.

### Architettura target (aggiornata — Iterazione 2)

```
                    ┌─────────────────────────────┐
                    │   Flutter Web (client UI)    │
                    │   hosting: deploy più facile │
                    │   (es. GitHub Pages — proto) │
                    └──────────────┬──────────────┘
                                   │ Auth, DB, Realtime,
                                   │ Storage, Edge Functions
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                     Supabase (piattaforma)                    │
│  • Auth  • Postgres  • Realtime  • Storage  • Edge Functions │
│  = unica fonte di verità applicativa (server dell'app)       │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
       ascolto + scambio                ascolto + scambio
                │                              │
                ▼                              ▼
┌───────────────────────────┐    ┌───────────────────────────┐
│  Bridge Python XMPP       │    │  Bridge Python Matrix     │
│  (daemon — Fly.io)        │    │  (daemon — Fly.io)        │
│  NON è un server XMPP     │    │  NON è un homeserver      │
└─────────────┬─────────────┘    └─────────────┬─────────────┘
              │                                │
              ▼                                ▼
     Server XMPP esterni              Homeserver Matrix esterni
```

### Ruoli componenti (confermati)

| Componente | Tecnologia | Ruolo | Deploy |
|------------|------------|-------|--------|
| **Piattaforma / server applicativo** | Supabase | Auth, database, realtime, storage, edge functions — **tutto** il backend applicativo | Supabase Cloud |
| **Bridge XMPP** | Python | Ascolta rete XMPP **e** piattaforma; normalizza e scambia eventi bidirezionalmente | Fly.io |
| **Bridge Matrix** | Python | Ascolta rete Matrix **e** piattaforma; normalizza e scambia eventi bidirezionalmente | Fly.io |
| **Client** | Flutter **Web** | UI unica; inbox unificata; chat sempre separate per protocollo | Deploy più facile _(prototipo: GitHub Pages ok)_ |
| **Server XMPP / Matrix** | Terzi o self-hosted | Infrastruttura protocollo **esterna** ai bridge; i bridge non sono autosufficienti | Fuori scope Alfred |

### Terminologia: i daemon sono **bridge**

Conferma tecnica: sì, sono **protocol bridge services** (o **sync daemons**).

| Cosa sono | Cosa **non** sono |
|-----------|-------------------|
| Processi Python long-running in ascolto | Server XMPP (tipo Prosody/Ejabberd) |
| Ponte bidirezionale protocollo ↔ Supabase | Homeserver Matrix (tipo Synapse/Dendrite) |
| Client/componente verso server esterni | Fonte di verità dei dati |

**Flusso tipico**:
- **Inbound**: evento su XMPP/Matrix → bridge lo riceve → normalizza → scrive/aggiorna Supabase → Realtime notifica Flutter.
- **Outbound**: utente agisce su Flutter → Supabase (DB o Edge Function) → bridge legge/comanda → invia sul protocollo corretto.

Il **server dell'applicazione** è Supabase. I bridge sono **adattatori di protocollo**, non applicazioni autosufficienti.

### Hosting Flutter Web (fase prototipo)

**Vincolo utente**: dove mettiamo il web **non è un problema** in questa fase. Serve un **link funzionante**; deploy il più semplice possibile.

| Layer | Dove | Nota |
|-------|------|------|
| Logica e dati | **Piattaforma** (Supabase) | Auth, DB, Realtime, Storage, Edge |
| Bundle Flutter Web | Hosting statico separato | **GitHub Pages** già funzionante — candidato naturale per il prototipo |
| Bridge Python | Fly.io | Invariato |

**Decisione prototipo**: hosting web = **il più facile** (GitHub Pages accettabile). Migrabile in seguito senza cambiare architettura.

---

## Workflow concordato

| Fase | Cosa facciamo | Stato |
|------|---------------|-------|
| 1. Discovery | Questo documento, iterazioni Q&A, livelli strategici top-down | 🟡 **In corso** |
| 2. Architettura dettagliata | Schema dati, API, flussi bridge, sicurezza — sempre su documento | ⬜ |
| 3. Piano a pezzi | Roadmap incrementale (un pezzo alla volta) | ⬜ |
| 4. Implementazione | Solo quando dici esplicitamente di iniziare | ⬜ |

**Non si implementa codice** finché non lo chiedi tu. Probabilmente si procederà **un pezzo alla volta**.

---

## Aree da definire

| Area | Stato | Note |
|------|-------|------|
| A. Visione e obiettivo | ✅ | Riscrittura totale, multi-protocollo |
| B. Prodotto e piattaforme | 🟡 | Flutter Web; fase prototipo |
| C. Architettura e stack | 🟡 | Piattaforma + bridge + Flutter; schema dati da dettagliare |
| D. Infrastruttura e deploy | 🟡 | Fly.io bridge; web = deploy facile (GH Pages ok) |
| E. XMPP e Matrix | 🟡 | Inbox unica, chat separate; account aggiunti dall'utente |
| F. UX / UI e brand | ⬜ | Flutter = nuova UI; brand da approfondire |
| G. Sicurezza e privacy | 🟡 | **No E2EE** in prototipo; credenziali protocollo TBD |
| H. Scope e priorità | 🟡 | Prototipo; documento prima; poi pezzi |
| I. Vincoli e non-obiettivi | ✅ | web-client muore; tag legacy applicato |
| J. Successo e metriche | ⬜ | Criteri completamento TBD |

---

## Iterazione 2 — Risposte formalizzate

### C3. Ruolo Supabase

**Risposta**: Supabase gestisce **tutto** il backend elencato:

- [x] Auth utenti
- [x] Database Postgres (messaggi, conversazioni, profili, modello unificato inbox)
- [x] Realtime (aggiornamenti verso Flutter Web)
- [x] Storage (file, media, avatar)
- [x] Edge Functions (logica API custom dove serve)

Supabase = **piattaforma applicativa** e fonte di verità dei dati.

---

### C4. Ruolo daemon Python

**Risposta**: Sono **bridge** — in ascolto di entrambi i sistemi (protocollo + piattaforma) e curano lo **scambio bidirezionale**.

- [x] Bridge/sync (confermato)
- [ ] Server autosufficienti (esplicitamente **no**)
- [ ] Gateway XMPP↔Matrix diretto tra loro — _non detto; gli scambi passano da Supabase_

---

### C5. Client Flutter ↔ backend

**Risposta formalizzata** (dedotta): Flutter Web parla **solo con Supabase** (auth, DB, realtime, storage, edge). **Non** parla direttamente con XMPP/Matrix né con i bridge. I bridge sono backend-to-backend con Supabase.

- [x] Solo Supabase

---

### B1. Target Flutter

- [ ] Android / iOS / Desktop — _non in scope v1_
- [x] **Web** — target confermato per il client

---

### B2. Inbox

**Risposta**: **Inbox unica assoluta** — XMPP e Matrix nello stesso elenco conversazioni, stessa UX.

---

### D5 / I1. Vecchio web-client

**Risposta**: Il `web-client/` React **muore del tutto** — nessun mantenimento in parallelo.

**Preservazione**: tag git sull'ultimo commit dove il web-client esiste ancora:

- Tag proposto: `legacy/web-client-final`
- Commit: `6e792eb` (main, 2026-06-17)
- Da applicare **prima** della rimozione fisica della cartella

---

### H1. Priorità e ordine di lavoro

**Risposta**:
1. **Prima** si completa il documento / discovery top-down (tutti i livelli strategici).
2. **Poi** implementazione a pezzi, quando lo dirai tu esplicitamente.
3. **Protocolli in v1** (XMPP prima, Matrix prima, o entrambi): **non ancora deciso** — si definisce durante l'approfondimento strategico, non subito.

---

## Iterazione 3 — Risposte formalizzate

### L1. Inbox unificata — chat separate

**Risposta**: Inbox **unica** (un solo elenco), ma le chat XMPP e Matrix restano **sempre separate**. **Nessuna associazione** tra thread di protocolli diversi.

**Analogia**: come due indirizzi email diversi della stessa persona — conviveno nella stessa casella (inbox), ma sono conversazioni distinte.

**Implicazioni modello dati**:
- Ogni conversazione ha un `protocol` (`xmpp` | `matrix`) — visibile in UI.
- **Non** esiste entità "contatto unificato" che raggruppa XMPP + Matrix.
- **Non** si fondono thread cross-protocollo.
- Ordinamento inbox: per attività recente, indipendentemente dal protocollo.

---

### L2. Auth — solo piattaforma

**Risposta**: **Non esiste login di protocollo** lato client. L'utente fa login **solo sulla piattaforma** (Supabase).

**Flusso**:
1. Registrazione / login account Alfred sulla piattaforma.
2. Dopo l'accesso, l'utente **aggiunge** account protocollo (XMPP, Matrix) tramite la piattaforma.
3. I bridge usano quegli account collegati per parlare con i server esterni.

**L2b** (più account stesso protocollo — es. due JID XMPP): _non ancora risposto — Iterazione 4_

---

### L3. Server protocollo — chiarimento domanda + risposta

**La domanda mal posta era**: "usiamo server nostri fissi o l'utente sceglie?"

**Riformulazione**: I server XMPP e Matrix **esistono già** nel mondo reale e girano in modo indipendente da Alfred. Alfred **non li ospita**. I bridge si connettono ai server **degli account che l'utente ha aggiunto**.

**Risposta formalizzata**:
- Se l'utente **non aggiunge** un account Matrix, il sistema Matrix **non lo riguarda** (nessun bridge attivo per lui su Matrix).
- Stesso ragionamento per XMPP.
- Non c'è una scelta astratta "server del progetto": c'è **aggiunta account** su piattaforma, ognuno con il proprio server (JID XMPP → server XMPP di quel JID; account Matrix → homeserver di quell'account).

```
Utente Alfred (piattaforma)
    ├── Account XMPP aggiunto  → bridge XMPP ↔ server di quel JID
    └── Account Matrix aggiunto → bridge Matrix ↔ homeserver di quell'account
```

---

### G1. Crittografia

**Risposta**: **Niente encryption** (E2EE fuori scope — OMEMO, Megolm, ecc.).

---

### G2. Credenziali protocollo

**Risposta**: _non esplicitata — deduzione logica: vivono sulla **piattaforma** (aggiunta account post-login), non nel client. Dettaglio storage (tabella cifrata, secrets, ecc.) — Iterazione 4._

---

### D6. Hosting Flutter Web

**Risposta**: **Va bene ovunque**, deploy **più facile possibile**. GitHub Pages già funziona — **usabile per il prototipo**. Unico requisito: **fornire il link** all'app.

- [x] Deploy facile (GitHub Pages ok in prototipo)
- [ ] Fly.io per web — _non richiesto_
- [ ] Vincolo provider — _nessuno in questa fase_

---

## Iterazione 4 — Prossime domande (top-down)

---

### L2b. Più account stesso protocollo

Un utente Alfred può aggiungere **due account XMPP** (o due Matrix)?

**Risposta**: _da compilare_

---

### G2. Dettaglio credenziali protocollo

Quando l'utente aggiunge un account XMPP/Matrix sulla piattaforma, dove salviamo password/token?

- [ ] Piattaforma (DB Supabase — tabella account collegati)
- [ ] Solo sui bridge (mai in DB centrale)
- [ ] Non importa in prototipo — decidiamo dopo

**Risposta**: _da compilare_

---

### Livello 6 — Repository

**D4.** Monorepo in questo repository (`alfred-web/`, `bridge-xmpp/`, `bridge-matrix/`, `supabase/`) o repo separate?

**Risposta**: _da compilare_

---

### Livello 7 — Brand / UX

**F1.** Alfred mantiene identità visiva attuale (#2D2926, spunta, stile WhatsApp/Telegram) o redesign libero?

**Risposta**: _da compilare_

---

### Livello 8 — Prototipo minimo

**P1.** Per il **primo prototipo** funzionante, qual è il minimo?

Esempio: _"Login piattaforma + aggiunta 1 account XMPP + inbox con 1 chat + invio messaggio"_

**Risposta**: _da compilare_

---

### Livello 9 — Ordine pezzi

**P2.** Quale pezzo prima? (scegli un ordine indicativo)

- [ ] Piattaforma (schema DB + auth)
- [ ] Bridge XMPP
- [ ] Bridge Matrix
- [ ] Client Flutter Web
- [ ] Tutto insieme minimalmente

**Risposta**: _da compilare_

---

## Log decisioni

| # | Data | Decisione | Motivazione | Stato |
|---|------|-----------|-------------|-------|
| D-001 | 2026-06-24 | Riscrittura completa di Alfred | Nuova architettura, non evoluzione incrementale | ✅ |
| D-002 | 2026-06-24 | Client **Flutter Web** | Sostituisce React; web come target v1 | ✅ |
| D-003 | 2026-06-24 | **Supabase** = backend completo | Auth, DB, Realtime, Storage, Edge Functions | ✅ |
| D-004 | 2026-06-24 | Due **bridge Python** (XMPP + Matrix) | Un bridge per protocollo | ✅ |
| D-005 | 2026-06-24 | Bridge su **Fly.io** | Processi long-running; non server protocollo | ✅ |
| D-006 | 2026-06-24 | Bridge = **adattatori**, non server | Ascoltano protocollo + piattaforma; scambio bidirezionale | ✅ |
| D-007 | 2026-06-24 | **Inbox unificata** | XMPP e Matrix nella stessa UI | ✅ |
| D-008 | 2026-06-24 | Flutter parla **solo con Supabase** | Separazione client / protocolli | ✅ |
| D-009 | 2026-06-24 | Workflow **documento prima**, poi pezzi | Top-down; implementazione su comando esplicito | ✅ |
| D-010 | 2026-06-24 | `web-client/` React **eliminato** | Nessun parallelo con legacy | ✅ |
| D-011 | 2026-06-24 | Hosting web: **deploy più facile** | Prototipo; GitHub Pages ok; serve solo un link | ✅ |
| D-012 | 2026-06-24 | Tag git `legacy/web-client-final` @ `6e792eb` | Ultimo stato del web-client prima della rimozione | ✅ |
| D-013 | 2026-06-24 | Inbox unica, chat **sempre separate** | Nessuna associazione cross-protocollo (modello "due email") | ✅ |
| D-014 | 2026-06-24 | Login **solo piattaforma** | Nessun login protocollo nel client; account aggiunti dopo | ✅ |
| D-015 | 2026-06-24 | Server protocollo = **infra esterna** | Bridge attivi solo per account aggiunti dall'utente | ✅ |
| D-016 | 2026-06-24 | **No E2EE** in prototipo | OMEMO/Megolm fuori scope | ✅ |
| D-017 | 2026-06-24 | Fase **prototipo** | Scelte infra non bloccanti; focus su logica e documento | ✅ |

---

## Checklist chiusura discovery

- [x] Visione e ruoli macro (A, C parziale)
- [x] Inbox unica (B2)
- [x] Bridge vs server chiarito (C4)
- [x] Supabase full-stack backend (C3)
- [x] Workflow documento → pezzi (H)
- [x] Legacy web-client policy (D5, I1)
- [x] Modello dati inbox unificata (L1)
- [x] Auth piattaforma-only (L2)
- [ ] Più account stesso protocollo (L2b)
- [x] Modello server / account aggiunti (L3)
- [x] No E2EE (G1)
- [ ] Dettaglio storage credenziali (G2)
- [x] Hosting web prototipo (D6)
- [ ] Struttura repository (D4)
- [ ] Brand / UX (F)
- [ ] Prototipo minimo (P1)
- [ ] Ordine pezzi (P2)
- [ ] Criteri di successo (J)
- [ ] Brief approvato ("ok, procediamo")

---

## Cronologia iterazioni

| Iterazione | Data | Sintesi |
|------------|------|---------|
| 0 | 2026-06-24 | Documento creato |
| 1 | 2026-06-24 | Visione: Flutter + Supabase + 2 daemon Python su Fly.io |
| 2 | 2026-06-24 | Supabase full; bridge confermati; Flutter Web; inbox unica; legacy muore; workflow top-down |
| 3 | 2026-06-24 | Chat separate in inbox unica; login piattaforma; server = account aggiunti; no E2EE; web = deploy facile |
| 4 | _prossima_ | L2b, G2, repo, brand, prototipo minimo, ordine pezzi |
