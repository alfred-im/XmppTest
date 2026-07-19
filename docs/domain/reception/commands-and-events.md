# Comandi ed eventi — contesto reception

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/reception/](../../model/uml/reception/)

---

## Comandi — allow list (client)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `AllowSender` | Utente | Consente recapito messaggi da un profilo. |
| `DisallowSender` | Utente | Revoca consenso recapito da un profilo. |
| `SearchCandidateSenders` | Utente | Cerca profili da aggiungere alla lista. |

---

## Comandi — gate recapito (server)

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `EvaluateInboundDelivery` | Policy (worker recapito) | Decide se materializzare messaggio per il destinatario. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `AllowListReady` | Lista persone consentite disponibile. |
| `SenderAllowed` | Profilo aggiunto alla allow list. |
| `SenderDisallowed` | Profilo rimosso dalla allow list. |
| `DeliveryPermitted` | Mittente autorizzato — destinatario riceve. |
| `DeliverySilentlyBlocked` | Mittente non autorizzato — nessun errore al mittente. |

---

## Policy

| Policy | Descrizione |
|--------|-------------|
| **Filtro sempre attivo** | Ogni recapito passa dal gate. |
| **Lista vuota = nessun recapito** | Senza voci, nessun mittente passa. |
| **Nessuna retro-consegna** | Consenso tardivo non recapita messaggi passati. |
| **Rifiuto silenzioso** | Il mittente vede invio accettato; spunta doppia solo se recapitato. |
