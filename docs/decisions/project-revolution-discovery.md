# Rivoluzione Alfred — Discovery Q&A

**Stato**: 🟡 In corso — Iterazione 4 (livello alto; dettaglio implementativo posticipato)  
**Creato**: 2026-06-24  
**Fase**: **Prototipo / documentazione strategica** — solo livello alto per ora.  
**Obiettivo**: Documentare l'applicazione **completa** top-down, prima di qualsiasi implementazione.  
**Regola**: Nessun codice finché non lo dici tu. Piano pezzi e ordine sviluppo → **non in questa fase** (si parlerà tra qualche giorno).

**Glossario**: **Piattaforma** = Supabase.

### Regole di lavoro su questo documento

1. Tu rispondi in modo discorsivo → io formalizzo.
2. Se una risposta **non è chiara**, la **riformulo e la ripresento** (non assumo).
3. **Solo livello alto** adesso — niente prototipo minimo, niente ordine di sviluppo, niente dettagli che possono aspettare.

---

## Visione target (formalizzata)

### Sintesi

**Alfred viene riscritto da zero.** Il `web-client/` React **muore del tutto** (tag `legacy/web-client-final` @ `6e792eb`). Nuovo stack: **Flutter Web** + **Piattaforma (Supabase)** + **due bridge Python** (XMPP + Matrix) su **Fly.io**. Inbox unificata, chat separate per protocollo, brand grafico **identico** all'attuale.

### Architettura target

```
                    ┌─────────────────────────────┐
                    │   Flutter Web (client UI)    │
                    │   brand Alfred invariato     │
                    │   hosting: deploy facile     │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                     Piattaforma (Supabase)                    │
│  Auth • Postgres • Realtime • Storage • Edge Functions        │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
         sempre attivo                   sempre attivo
                │                              │
                ▼                              ▼
┌───────────────────────────┐    ┌───────────────────────────┐
│  Bridge XMPP (Python)     │    │  Bridge Matrix (Python)   │
│  Fly.io — sempre in run   │    │  Fly.io — sempre in run   │
└─────────────┬─────────────┘    └─────────────┬─────────────┘
              │                                │
              └──────── routing per contatto ──┘
                    (non scelto dall'utente)
```

### Routing: contatti, non server

**Chiarimento utente (Iterazione 4)** — cosa intendi per "server":

| Cosa intendi tu | Formalizzazione |
|-----------------|-----------------|
| I due **bridge** sono sempre attivi | I processi bridge XMPP e Matrix girano **sempre** su Fly.io |
| Non scelgo i server | L'utente **non configura** server XMPP/Matrix nell'UI |
| Scelgo i **contatti** | Se aggiungi un contatto **Matrix** → il messaggio passa dal **bridge Matrix** |
| | Se il contatto è **XMPP** → passa dal **bridge XMPP** |
| | Il protocollo è una proprietà del **contatto/conversazione**, non una scelta esplicita di server |

**L'utente pensa in termini di persone**, non di infrastruttura. I bridge e i server sotto sono trasparenti.

### Ruoli componenti

| Componente | Tecnologia | Ruolo | Deploy |
|------------|------------|-------|--------|
| **Piattaforma** | Supabase | Backend completo; fonte di verità | Supabase Cloud |
| **Bridge XMPP** | Python | Sempre attivo; scambio XMPP ↔ piattaforma | Fly.io |
| **Bridge Matrix** | Python | Sempre attivo; scambio Matrix ↔ piattaforma | Fly.io |
| **Client** | Flutter Web | UI; parla solo con piattaforma; brand Alfred attuale | Deploy facile (GH Pages ok) |

### Repository

**Monorepo** in questo repository, **tre cartelle** (proposta accettata):

```
/workspace/
├── client/          # Flutter Web
├── bridge-xmpp/     # Bridge Python XMPP
├── bridge-matrix/   # Bridge Python Matrix
└── supabase/        # Schema, migrazioni, edge functions
```

Un solo repo — nessuna repo separata per ora.

### Brand

**Identico** al Alfred attuale dal punto di vista grafico: colore `#2D2926`, spunta, stile UI esistente. Il rewrite Flutter **riproduce** il look, non lo reinventa.

---

## Applicazione completa — funzionalità (livello alto)

> **Nota**: questo è lo **scope dell'app intera**, non un "prototipo minimo". Lo sviluppo sarà a pezzi, ma il documento descrive il prodotto finito a livello strategico.

| Area | Funzionalità |
|------|--------------|
| Auth | Login sulla **piattaforma** |
| Contatti | Lista contatti |
| Conversazioni | Vista conversazione + **creazione** nuova conversazione |
| Profilo | Pagina profilo |
| Protocollo | **XMPP** (Matrix nell'architettura generale; dettaglio feature Matrix — da approfondire a livello alto) |

---

## Workflow concordato

| Fase | Cosa | Stato | Quando |
|------|------|-------|--------|
| 1. Discovery alto livello | Questo documento | 🟡 **In corso** | Adesso |
| 2. Architettura dettagliata | Schema dati, flussi, API — sempre documento | ⬜ | Dopo |
| 3. Piano implementazione a pezzi | Ordine sviluppo, milestone | ⏸️ **Posticipato** | Tra qualche giorno |
| 4. Codice | Implementazione | ⏸️ | Su tuo comando esplicito |

---

## Aree — stato

| Area | Stato |
|------|-------|
| A. Visione | ✅ |
| B. Prodotto (Flutter Web) | ✅ |
| C. Architettura macro | 🟡 — schema dati / API da documentare |
| D. Infra (Fly bridge, GH Pages web, monorepo) | ✅ |
| E. Protocolli (inbox unica, chat separate, routing per contatto) | 🟡 |
| F. Brand | ✅ |
| G. Sicurezza (no E2EE) | 🟡 — dettaglio credenziali posticipato |
| H. Scope funzionale alto livello | 🟡 |
| I. Legacy web-client | ✅ |
| J. Metriche successo | ⏸️ posticipato |

---

## Iterazione 4 — Risposte formalizzate

### L3 (correzione). Bridge sempre attivi; routing per contatto

**Risposta utente**: I bridge sono **sempre attivi**. Non scelgo server — scelgo **contatti**. Contatto Matrix → bridge Matrix; altrimenti bridge XMPP.

**Sostituisce** la formulazione precedente che legava l'attivazione bridge all'aggiunta account utente. I bridge sono **servizi permanenti**; il percorso del messaggio dipende dal **protocollo del contatto/conversazione**.

---

### D4. Repository

**Risposta**: **Monorepo unico**, cartelle separate per client / bridge-xmpp / bridge-matrix / supabase. Per l'utente va bene così; repo separate solo se servissero e fossero da creare.

**Raccomandazione**: monorepo — coerente con fase prototipo e singolo team.

---

### F1. Brand

**Risposta**: Brand Alfred **attuale**, **identico** graficamente.

---

### P1 / P2. Prototipo minimo e ordine pezzi

**Risposta**: **Non si discute ora.** Non c'è un "prototipo minimo" da definire in questa fase. Si documenta l'app **intera** top-down; lo sviluppo a pezzi si pianifica **più avanti** (non stasera).

- P1 → ⏸️ posticipato
- P2 → ⏸️ posticipato

---

## Domande da chiarire (ripresentate in modo semplice)

> Regola: se non è chiaro, si ripresenta. Queste **non bloccano** il livello alto — si possono chiudere più avanti.

### L2b. Un solo "numero" XMPP per utente Alfred?

**Domanda semplice**: Un utente Alfred può avere **due account XMPP diversi** collegati (come avere due SIM sullo stesso telefono), oppure **uno solo**?

**Risposta**: _non compresa — in attesa_

---

### G2. Dove mettiamo la password del tuo account XMPP?

**Domanda semplice**: Quando colleghi il tuo account XMPP ad Alfred, la password la salvi **una volta sulla piattaforma** e ci pensiamo noi, oppure preferisci un altro modo?

_(È una decisione che possiamo anche rimandare alla fase implementativa — non serve rispondere stasera se non ti è chiara.)_

**Risposta**: _non compresa — in attesa / posticipabile_

---

### L2. Auth — conferma allineamento

**Già formalizzato**: login **solo piattaforma**; nessun login protocollo nel client.

**Da confermare insieme a L3**: dopo il login piattaforma, l'utente deve ancora **collegare** la propria identità XMPP (e Matrix) sulla piattaforma affinché i bridge possano inviare messaggi **a suo nome**? Oppure basta aggiungere contatti?

**Risposta**: _da chiarire — potrebbe essere la fonte del disallineamento su "server"_

---

## Iterazione 5 — Prossimo livello alto (quando vuoi)

Domande **solo strategiche** — niente implementazione:

1. **Contatti**: la lista contatti è **unificata** (XMPP + Matrix insieme) come l'inbox, o schermata separata per protocollo?
2. **Matrix nello scope funzionale**: oltre XMPP, quali feature Matrix servono a livello prodotto (stesse di XMPP: chat 1:1, gruppi, …)?
3. **Profilo**: profilo utente Alfred (piattaforma) vs profilo XMPP (vCard) — sono la stessa cosa in UI o due livelli?
4. **Notifiche push**: servono nel nuovo Alfred o dopo?
5. **Offline**: l'app deve funzionare offline come oggi (cache locale) o solo online via piattaforma?

---

## Log decisioni

| # | Data | Decisione | Stato |
|---|------|-----------|-------|
| D-001 | 2026-06-24 | Riscrittura completa | ✅ |
| D-002 | 2026-06-24 | Client Flutter Web | ✅ |
| D-003 | 2026-06-24 | Piattaforma = Supabase (backend completo) | ✅ |
| D-004 | 2026-06-24 | Due bridge Python (XMPP + Matrix) | ✅ |
| D-005 | 2026-06-24 | Bridge su Fly.io | ✅ |
| D-006 | 2026-06-24 | Bridge = adattatori, non server protocollo | ✅ |
| D-007 | 2026-06-24 | Inbox unificata | ✅ |
| D-008 | 2026-06-24 | Flutter → solo piattaforma | ✅ |
| D-009 | 2026-06-24 | Documento top-down prima del codice | ✅ |
| D-010 | 2026-06-24 | web-client React eliminato | ✅ |
| D-011 | 2026-06-24 | Web hosting = deploy facile (GH Pages ok) | ✅ |
| D-012 | 2026-06-24 | Tag `legacy/web-client-final` @ `6e792eb` | ✅ |
| D-013 | 2026-06-24 | Chat separate in inbox (no associazione cross-protocollo) | ✅ |
| D-014 | 2026-06-24 | Login solo piattaforma | ✅ |
| D-015 | 2026-06-24 | ~~Bridge attivi per account aggiunti~~ → **Bridge sempre attivi; routing per contatto** | ✅ Corretto iter.4 |
| D-016 | 2026-06-24 | No E2EE | ✅ |
| D-017 | 2026-06-24 | Fase prototipo — infra non bloccante | ✅ |
| D-018 | 2026-06-24 | **Monorepo** con cartelle client / bridge-xmpp / bridge-matrix / supabase | ✅ |
| D-019 | 2026-06-24 | Brand grafico **identico** all'Alfred attuale | ✅ |
| D-020 | 2026-06-24 | Scope = **app completa** documentata; no "minimo prototipo" ora | ✅ |
| D-021 | 2026-06-24 | Piano pezzi e ordine sviluppo **posticipati** | ✅ |

---

## Checklist chiusura fase alto livello

- [x] Architettura macro (client / piattaforma / bridge)
- [x] Routing per contatto, bridge sempre attivi
- [x] Inbox e chat separate
- [x] Login piattaforma
- [x] Monorepo
- [x] Brand invariato
- [x] Funzionalità app a livello alto (login, contatti, chat, creazione, profilo, XMPP)
- [ ] L2b, G2, L2 conferma (non bloccanti — ripresentate)
- [ ] Iterazione 5: contatti unificati, Matrix scope, profilo, push, offline
- [ ] Schema dati e flussi (fase 2 documento)
- [ ] Brief alto livello approvato ("ok, il livello alto è completo")

---

## Cronologia iterazioni

| Iterazione | Data | Sintesi |
|------------|------|---------|
| 0–1 | 2026-06-24 | Visione stack; formalizzazione iniziale |
| 2 | 2026-06-24 | Ruoli Supabase/bridge; Flutter Web; workflow |
| 3 | 2026-06-24 | Inbox; login piattaforma; no E2EE; hosting facile |
| 4 | 2026-06-24 | Bridge sempre attivi; routing contatti; monorepo; brand; scope app intera; P1/P2 posticipati |
| 5 | _prossima_ | Contatti, Matrix feature, profilo, push, offline |
