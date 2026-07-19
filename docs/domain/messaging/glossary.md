# Glossario — contesto messaging

**Bounded context:** `messaging`  
**Ultima revisione:** 2026-07-19

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **Conversazione** | Scambio messaggi tra utente corrente e un peer (1:1 o gruppo). |
| **Messaggio** | Unità di contenuto in conversazione: testo, media o posizione. |
| **Invio** | Tentativo di consegnare un messaggio al peer tramite piattaforma. |
| **Messaggio in attesa** | Invio non ancora confermato dal server. |
| **Stato spunte** | Segnale visibile al mittente: accettato, recapitato, letto. |
| **Sincronizzazione** | Aggiornamenti in tempo reale mentre la conversazione è aperta. |

---

## Invarianti

1. Un messaggio logico non appare duplicato in conversazione.
2. Un solo invio attivo per conversazione.
3. Aprendo la conversazione, i messaggi del peer sono considerati letti.
4. Il mittente non riceve errore se il destinatario blocca per allow list — vede solo spunta singola.
