# Rivoluzione Alfred — Discovery Q&A

**Stato**: 🟡 In corso — Iterazione 2 (ruoli componenti e workflow definiti)  
**Creato**: 2026-06-24  
**Obiettivo**: Allinearsi su visione, scope e vincoli **prima** di toccare codice o architettura.  
**Regola**: Nessuna implementazione finché non dici esplicitamente di iniziare. Fino ad allora: solo questo documento, top-down.

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
                    │   hosting: Fly.io (proposta) │
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
| **Client** | Flutter **Web** | UI unica; inbox unificata XMPP + Matrix | Fly.io _(proposta — vedi nota hosting)_ |
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

### Hosting Flutter Web — chi serve il web?

**Chiarimento**: Supabase gestisce il **backend** (API, dati, auth, realtime, file). **Non** ospita il bundle HTML/JS/CSS di Flutter Web — non è un hosting per SPA.

**"Gestito dalla piattaforma"** in senso architetturale:
- **Logica e dati** → Supabase (la piattaforma applicativa).
- **File statici del client web** → serve un web server separato.

**Proposta (da approvare)**:

| Opzione | Pro | Contro |
|---------|-----|--------|
| **Fly.io** _(consigliata)_ | Stesso provider dei bridge; un solo ecosistema deploy; TLS e dominio unificati | Terza app Fly da gestire |
| Cloudflare Pages / Vercel | Ottimo per static SPA, CDN globale | Provider diverso da Fly |
| GitHub Pages | Già usato oggi | Meno adatto a stack Supabase-centric; si abbandona con la rivoluzione |

**Raccomandazione**: **Fly.io** anche per Flutter Web — tre app Fly (`alfred-web`, `bridge-xmpp`, `bridge-matrix`), una piattaforma Supabase. Tutto sotto il concetto di "stack Alfred", con Supabase come cuore applicativo.

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
| B. Prodotto e piattaforme | 🟡 | Flutter Web confermato; mobile/desktop TBD |
| C. Architettura e stack | 🟡 | Supabase + bridge + Flutter; dettaglio schema dati TBD |
| D. Infrastruttura e deploy | 🟡 | Fly.io bridge + web (proposta); Supabase backend |
| E. XMPP e Matrix | 🟡 | Inbox unica; ordine implementazione TBD (top-down prima) |
| F. UX / UI e brand | ⬜ | Flutter = nuova UI; brand da approfondire |
| G. Sicurezza e privacy | ⬜ | E2EE, credenziali protocollo |
| H. Scope e priorità | 🟡 | Documento prima; poi pezzi; v1 minimo TBD |
| I. Vincoli e non-obiettivi | 🟡 | web-client React muore; tag git legacy |
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

## Iterazione 3 — Prossime domande (top-down)

### Livello 1 — Modello dati unificato (inbox unica)

**L1.** Come rappresentiamo una conversazione nella inbox unificata?

- Ogni chat ha un `protocol: xmpp | matrix` visibile in UI?
- Un contatto può esistere su **entrambi** i protocolli come un'unica "persona" o sono sempre thread separati?

**Risposta**: _da compilare_

---

### Livello 2 — Auth e identità

**L2.** L'utente Alfred si registra **solo su Supabase** (account Alfred), poi collega account XMPP/Matrix?

oppure

- Usa direttamente credenziali XMPP/Matrix senza account Alfred separato?

**L2b.** Un utente Alfred può collegare **più account** dello stesso protocollo (es. due JID XMPP)?

**Risposta**: _da compilare_

---

### Livello 3 — Server protocollo

**L3.** In v1 gli utenti si connettono a:

- [ ] Server predefiniti da noi (es. jabber.hot-chilli.net + un homeserver Matrix)
- [ ] Server scelti dall'utente (JID / homeserver custom)
- [ ] Entrambe le modalità

**Risposta**: _da compilare_

---

### Livello 4 — Sicurezza

**G1.** E2EE (OMEMO / Megolm) in v1: must-have, v2, o fuori scope iniziale?

**G2.** Credenziali XMPP/Matrix: dove le memorizziamo? (Supabase vault cifrato, segreti solo sui bridge, …)

**Risposta**: _da compilare_

---

### Livello 5 — Hosting web (conferma proposta)

**D6.** Confermi **Fly.io** per servire Flutter Web (oltre ai due bridge)?

- [ ] Sì, Fly.io per tutto il compute (web + bridge)
- [ ] Preferisco altro per il web: _______________
- [ ] Valutiamo dopo

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
| D-011 | 2026-06-24 | Hosting web: **Fly.io proposto** | Supabase non ospita SPA; stesso provider dei bridge | 🟡 Proposta |
| D-012 | 2026-06-24 | Tag git `legacy/web-client-final` @ `6e792eb` | Ultimo stato del web-client prima della rimozione | 🟡 Da applicare |

---

## Checklist chiusura discovery

- [x] Visione e ruoli macro (A, C parziale)
- [x] Inbox unica (B2)
- [x] Bridge vs server chiarito (C4)
- [x] Supabase full-stack backend (C3)
- [x] Workflow documento → pezzi (H)
- [x] Legacy web-client policy (D5, I1)
- [ ] Modello dati inbox unificata (L1)
- [ ] Auth e identità utente (L2)
- [ ] Server protocollo v1 (L3)
- [ ] Sicurezza E2EE e credenziali (G)
- [ ] Conferma hosting Flutter Web (D6)
- [ ] Struttura repository (D4)
- [ ] Brand / UX (F)
- [ ] Criteri di successo (J)
- [ ] Ordine pezzi implementativi e v1 minimo
- [ ] Brief approvato ("ok, procediamo")

---

## Cronologia iterazioni

| Iterazione | Data | Sintesi |
|------------|------|---------|
| 0 | 2026-06-24 | Documento creato |
| 1 | 2026-06-24 | Visione: Flutter + Supabase + 2 daemon Python su Fly.io |
| 2 | 2026-06-24 | Supabase full; bridge confermati; Flutter Web; inbox unica; legacy muore; workflow top-down |
| 3 | _prossima_ | Modello dati, auth, server protocollo, sicurezza, hosting web |
