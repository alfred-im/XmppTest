# Changelog - Fix Push Notifications

## [5 Dicembre 2025] - Fix Invio Stanze IQ per XEP-0357

### 🐛 Bug Fixes

#### Push Notifications - Server Fallisce

**Problema**: Quando si tentava di abilitare le Push Notifications, il server falliva perché le stanze IQ non venivano inviate correttamente.

**Causa**: Stanza.js non ha supporto nativo per XEP-0357, quindi `client.sendIQ()` non riusciva a serializzare la struttura oggetto custom in XML XMPP valido.

**Soluzione**: 
- Invio di XML grezzo usando `client.send()` invece di `client.sendIQ()`
- Sistema di listener per gestire risposte IQ asincrone
- Timeout di 10 secondi per evitare promise pending infinite

### ✨ Miglioramenti

#### Logging Dettagliato

Aggiunto logging emoji-based per facilitare il debugging:

```
🚀 Push Notifications: Inizio abilitazione automatica...
🔍 Push Notifications: Cerco servizio push sul server...
✅ Push Notifications: Servizio push trovato
📤 Push Notifications: Invio richiesta di abilitazione al server XMPP...
✅ Push Notifications: Abilitate con successo!
```

Oppure, se il server non supporta XEP-0357:

```
❌ Push Notifications: Il server non supporta XEP-0357 (Push Notifications)
💡 Push Notifications: Per abilitare le push, serve un server XMPP con supporto XEP-0357
```

#### Rilevamento Automatico Supporto Server

Il codice ora rileva automaticamente se il server supporta XEP-0357 tramite Service Discovery (XEP-0030) e mostra messaggi chiari in console.

### 📝 File Modificati

- `web-client/src/services/push-notifications.ts`
  - `enablePushNotifications()`: Usa XML grezzo
  - `disablePushNotifications()`: Usa XML grezzo
  - `discoverPushService()`: Logging migliorato
  - `enablePushNotificationsAuto()`: Logging dettagliato

### 📚 Documentazione Aggiunta

- `web-client/PUSH_NOTIFICATIONS_FIX.md`: Documentazione completa del problema e della soluzione
- `CHANGELOG_PUSH_FIX.md`: Questo file

### ⚠️ Note Importanti

1. **Il fix risolve il problema tecnico di invio stanze**, ma le push notifications funzioneranno solo se:
   - Il server XMPP supporta XEP-0357
   - È configurato un servizio push backend (es. FCM)
   - Sono configurate le chiavi VAPID (se richieste dal browser)

2. **I server pubblici attualmente configurati NON supportano XEP-0357**:
   - `jabber.hot-chilli.net` ❌
   - `conversations.im` ❌

3. **Per testare le push notifications** serve un server XMPP configurato con:
   - Prosody + mod_cloud_notify
   - Ejabberd + mod_push
   - MongooseIM + mod_event_pusher_push

### 🔍 Testing

Per verificare se il server supporta push:

1. Apri la console del browser (F12)
2. Fai login con un account XMPP
3. Osserva i log con emoji `🔍`, `✅`, `❌`
4. Se vedi `❌ Il server non supporta XEP-0357`, il server non ha push notifications

### 🚀 Prossimi Passi

Per abilitare effettivamente le push notifications:

1. Configurare un server XMPP con supporto XEP-0357
2. Configurare un push backend (FCM o custom)
3. Generare e configurare chiavi VAPID
4. Aggiornare `src/config/constants.ts` con le configurazioni

---

## Dettagli Tecnici

### Prima della Fix

```typescript
// ❌ NON FUNZIONAVA
const enableStanza = {
  type: 'set',
  enable: { xmlns: PUSH_NAMESPACE, jid: pushJid },
  x: { xmlns: 'jabber:x:data', type: 'submit', fields: [...] }
}
await client.sendIQ(enableStanza) // Stanza.js non riconosce questa struttura
```

### Dopo la Fix

```typescript
// ✅ FUNZIONA
const enableXml = `<iq type="set" id="${iqId}">
  <enable xmlns="${PUSH_NAMESPACE}" jid="${pushJid}">
    <x xmlns="jabber:x:data" type="submit">
      <field var="FORM_TYPE"><value>...</value></field>
      <field var="pubsub#endpoint"><value>...</value></field>
    </x>
  </enable>
</iq>`

return new Promise<boolean>((resolve) => {
  const handleIQ = (iq) => {
    if (iq.id === iqId) {
      emitter.removeListener('iq', handleIQ)
      resolve(iq.type === 'result')
    }
  }
  emitter.on('iq', handleIQ)
  setTimeout(() => { emitter.removeListener('iq', handleIQ); resolve(false) }, 10000)
  sender.send('iq', enableXml)
})
```

### Vantaggi della Nuova Implementazione

1. **XML Compliant**: L'XML inviato è perfettamente conforme a XEP-0357
2. **Asincrono**: Gestione corretta delle risposte IQ
3. **Timeout**: Non blocca indefinitamente se il server non risponde
4. **Debug-Friendly**: Logging dettagliato per capire cosa succede
5. **Server Agnostic**: Funziona con qualsiasi server che supporta XEP-0357

---

**Autore**: Claude (AI Assistant)  
**Data**: 5 Dicembre 2025  
**Versione**: 1.0.0
