# Ricezione = ricezione sul server (client cloud)

> **Contratto capability**: [MAILBOX-READ.spec.md](../specs/capabilities/MAILBOX-READ.spec.md) (operativo); [MSG-READ.spec.md](../specs/capabilities/MSG-READ.spec.md) (`superseded`) — questo ADR resta vincolante (semantica cloud).

**Data**: 2026-06-26  
**Status**: ✅ Accettata — **concept vincolante** dell'applicazione  
**Categoria**: Messaggistica, spunte, modello cloud  
**Correlata**: [bridge-stateless.md](./bridge-stateless.md), [alpha-full-stack.md](../architecture/alpha-full-stack.md) §3

---

## Concept

Per un **client nel cloud** come Alfred — accesso **multidispositivo**, **fonte di verità sul server** (Supabase) — la **ricezione** di un messaggio coincide con la **ricezione sul server**, non con l'arrivo su un singolo device del destinatario.

Questo è il modello semantico dell'applicazione: il server è il punto in cui un messaggio è considerato «arrivato» nel sistema Alfred.

---

## Oggi vs domani

| Fase | Comportamento |
|------|----------------|
| **Oggi (Alpha)** | Invio e ricezione *sembrano* coincidenti: il mittente chiama `send_message_to_profile`, il messaggio è subito nel DB piattaforma, il destinatario lo vede via Realtime. Il passaggio «consegnato» può avvenire nello stesso istante dell'inserimento. |
| **Domani (federazione / bridge)** | Invio e ricezione saranno **disaccoppiati**, come già accade tra server diversi in XMPP/Matrix: il messaggio resta `sent` o `pending` finché il bridge non lo consegna all'altro dominio; solo allora diventa «ricevuto» (sul server di destinazione o nella piattaforma come ack federato). |

Il disaccoppiamento non è un'eccezione futura: è la **stessa logica** del caso federato, applicata progressivamente anche ai flussi che oggi appaiono sincroni.

---

## Implicazioni per le spunte (3 livelli WhatsApp)

| Livello | UI | Significato nel modello cloud Alfred |
|---------|-----|--------------------------------------|
| **1 — Inviato** | ✓ grigia | Il messaggio è stato accettato dalla piattaforma (RPC `send_message_to_profile` / outbox `queued` per federato). |
| **2 — Consegnato** | ✓✓ grigie | Il messaggio è **ricevuto sul server** — cioè disponibile nella fonte di verità per il destinatario (inserimento DB interno, oppure ack bridge/XEP-0184 per federato). **Non** significa «aperto sul telefono del destinatario». |
| **3 — Lettura** | ✓✓ blu | Il destinatario ha **visualizzato** la conversazione (`mark_peer_read` / XEP-0333 `displayed` via bridge). |

Nel client cloud Alfred il livello 2 segue il **server come fonte di verità**: consegnato = ricevuto **nella piattaforma** (o nel server federato di destinazione tramite bridge). Il multidispositivo è coerente: tutti i device del destinatario leggono lo stesso stato dal server.

---

## Conseguenze implementative

1. **`delivery_status = 'delivered'`** va impostato quando il messaggio è persistito/recapitato nella fonte di verità rilevante — **non** quando il client del destinatario riceve un evento Realtime. Il meccanismo concreto (immediato in piattaforma vs ack bridge) è **pipeline di recapito**, non due tipi di chat — vedi [no-internal-external-chat-distinction.md](./no-internal-external-chat-distinction.md).
2. **`delivery_status = 'read'`** resta legato all'azione esplicita di lettura (`mark_peer_read`), indipendente dal disaccoppiamento invio/ricezione.
3. **Outbox e bridge**: messaggi il cui recapito passa da bridge possono restare `pending`/`sent` fino a conferma — il disaccoppiamento è previsto nello schema (`outbox`, `bridge_jobs`); non definisce una «chat federata» separata.
4. **Non confondere** con WhatsApp mobile P2P: Alfred è cloud-first; la semantica delle spunte riflette il server, non la singola sessione WebSocket del peer.

---

## Riferimenti

- [alpha-full-stack.md](../architecture/alpha-full-stack.md) — §2.9 Spunte lettura
- [no-internal-external-chat-distinction.md](./no-internal-external-chat-distinction.md) — regola vincolante: nessuna distinzione chat interna/esterna a nessun livello
