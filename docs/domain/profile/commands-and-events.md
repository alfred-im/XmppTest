# Comandi ed eventi — contesto profile

**Ultima revisione:** 2026-07-19  
**UML:** [docs/model/uml/profile/](../../model/uml/profile/)

---

## Comandi — identità propria

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `UpdateOwnProfile` | Utente | Salva nome, bio, pronomi, avatar. |

---

## Comandi — scheda peer

| Comando | Emesso da | Descrizione |
|---------|-----------|-------------|
| `ViewPeerProfile` | Utente | Mostra identità del peer. |
| `TogglePeerConsent` | Utente | Consente o revoca recapito messaggi dal peer. |
| `TogglePeerInContacts` | Utente | Aggiunge o rimuove peer dalla rubrica. |
| `StartChatFromPeerProfile` | Utente | Apre conversazione dalla scheda peer. |
| `SharePeerProfile` | Utente | Condivide link al profilo peer. |

---

## Eventi

| Evento | Descrizione |
|--------|-------------|
| `OwnProfileUpdated` | Identità propria salvata. |
| `PeerProfileDisplayed` | Scheda peer visibile con dati completi. |
| `PeerConsentChanged` | Consenso recapito aggiornato. |
| `PeerContactListChanged` | Presenza in rubrica aggiornata. |

---

## Policy

| Policy | Descrizione |
|--------|-------------|
| **Nessuna scheda su sé stessi** | Tap sul proprio avatar non apre overlay peer. |
| **Username immutabile** | Identità pubblica username non editabile dal profilo. |
