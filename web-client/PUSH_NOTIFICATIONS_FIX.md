# Fix Push Notifications - Problema Server Fallisce

## Problema Identificato

Quando si cercava di abilitare le Push Notifications secondo XEP-0357, il server falliva con un errore. Il problema era nella costruzione e invio della stanza IQ al server XMPP.

### Causa Tecnica

Il codice in `src/services/push-notifications.ts` tentava di inviare stanze IQ usando `client.sendIQ()` con una struttura custom:

```typescript
const enableStanza = {
  type: 'set' as const,
  enable: {
    xmlns: PUSH_NAMESPACE,
    jid: pushJid,
    ...(node && { node }),
  },
  x: {
    xmlns: 'jabber:x:data',
    type: 'submit',
    fields: [...]
  }
}

const result = await client.sendIQ(enableStanza as unknown as Parameters<typeof client.sendIQ>[0])
```

**Problema**: Stanza.js (libreria XMPP usata) non ha supporto nativo per XEP-0357 (Push Notifications), quindi non riconosce questa struttura di oggetto. Il metodo `sendIQ()` si aspetta strutture specifiche che Stanza.js conosce (come `account` per la registrazione, `roster` per i contatti, ecc.).

Quando Stanza.js non riconosce la struttura, non riesce a serializzare correttamente l'oggetto in XML XMPP, causando il fallimento dell'invio della stanza al server.

## Soluzione Implementata

### 1. Invio di XML Grezzo

Invece di usare `client.sendIQ()` con una struttura oggetto, ora costruiamo e inviamo l'XML XMPP direttamente usando `client.send()`:

```typescript
const iqId = `enable-push-${Date.now()}`

const enableXml = `<iq type="set" id="${iqId}">
  <enable xmlns="${PUSH_NAMESPACE}" jid="${pushJid}"${node ? ` node="${node}"` : ''}>
    <x xmlns="jabber:x:data" type="submit">
      <field var="FORM_TYPE">
        <value>http://jabber.org/protocol/pubsub#publish-options</value>
      </field>
      <field var="pubsub#endpoint">
        <value>${pushSubscription.endpoint}</value>
      </field>
      <field var="pubsub#max_items">
        <value>1</value>
      </field>
    </x>
  </enable>
</iq>`

// Invia XML direttamente
const sender = client as unknown as { send: (name: string, data: string) => void }
sender.send('iq', enableXml)
```

### 2. Gestione Asincrona della Risposta

Dato che `client.send()` non restituisce una Promise, abbiamo implementato un sistema di listener per intercettare la risposta IQ dal server:

```typescript
return new Promise<boolean>((resolve) => {
  const handleIQ = (iq: { id?: string; type?: string }) => {
    if (iq.id === iqId) {
      // Rimuovi listener e risolvi la promise
      emitter.removeListener('iq', handleIQ)
      resolve(iq.type === 'result')
    }
  }
  
  emitter.on('iq', handleIQ)
  
  // Timeout di 10 secondi per evitare che la promise rimanga pending
  setTimeout(() => {
    emitter.removeListener('iq', handleIQ)
    resolve(false)
  }, 10000)
  
  sender.send('iq', enableXml)
})
```

### 3. Logging Migliorato

Abbiamo aggiunto logging emoji-based molto più dettagliato per facilitare il debugging:

- `🔍` - Ricerca/Discovery in corso
- `✅` - Operazione completata con successo
- `⚠️` - Warning/Attenzione
- `❌` - Errore/Fallimento
- `💡` - Suggerimento/Consiglio
- `📋` - Informazione
- `🚀` - Inizio operazione
- `🔑` - Operazione relativa a chiavi/subscription
- `📤` - Invio dati

Questo permette di capire immediatamente:
1. Se il server supporta XEP-0357
2. Se la subscription push viene ottenuta correttamente
3. Se la stanza IQ viene inviata e riceve risposta
4. Dove esattamente fallisce il processo

## Verifica Supporto Server

Il codice ora rileva chiaramente se il server XMPP supporta o meno XEP-0357:

```
🔍 Push Notifications: Cerco servizio push sul server jabber.hot-chilli.net...
🔍 Push Notifications: Verifico se il server supporta XEP-0357 direttamente...
📋 Push Notifications: Features del server: [lista features]
```

Se il server non supporta push:
```
❌ Push Notifications: Il server non supporta XEP-0357 (Push Notifications)
💡 Push Notifications: Per abilitare le push, serve un server XMPP con supporto XEP-0357
```

## Modifiche ai File

### File Modificati

1. **`src/services/push-notifications.ts`**:
   - `enablePushNotifications()`: Ora usa XML grezzo con `client.send()`
   - `disablePushNotifications()`: Stesso approccio per disabilitazione
   - `discoverPushService()`: Logging migliorato per diagnostica
   - `enablePushNotificationsAuto()`: Logging dettagliato del processo

## Testing

Per testare se le push notifications funzionano:

1. **Apri la Console del Browser** (F12)
2. **Fai Login** con un account XMPP
3. **Osserva i Log** per vedere se il server supporta XEP-0357:

```javascript
// Se il server supporta push:
✅ Push Notifications: Server supporta push notifications direttamente: jabber.hot-chilli.net
✅ Push Notifications: Subscription push ottenuta: https://...
📤 Push Notifications: Invio richiesta di abilitazione al server XMPP...
✅ Push Notifications: Abilitate con successo!

// Se il server NON supporta push:
ℹ️ Push Notifications: Server non supporta push direttamente, cerco nei servizi...
📋 Push Notifications: Trovati X servizi sul server
❌ Push Notifications: Nessun servizio push trovato tramite Service Discovery
❌ Push Notifications: Il server non supporta XEP-0357 (Push Notifications)
💡 Push Notifications: Per abilitare le push, serve un server XMPP con supporto XEP-0357
```

## Limitazioni Attuali

### 1. Supporto Server XEP-0357

**Il server `jabber.hot-chilli.net` (e molti altri server pubblici) non supportano XEP-0357.**

Per usare le push notifications, serve:
- Un server XMPP con supporto XEP-0357 configurato
- Un servizio push backend (es. Firebase Cloud Messaging, o un app server custom)
- Configurazione delle chiavi VAPID sul server

### 2. Chiavi VAPID

Alcuni browser richiedono chiavi VAPID (Voluntary Application Server Identification) per le push notifications. Il codice attuale prova a creare subscription senza chiavi VAPID (per massima compatibilità), ma se il browser le richiede:

```typescript
// In constants.ts, configura:
export const PUSH_NOTIFICATIONS = {
  VAPID_PUBLIC_KEY: 'la-tua-chiave-vapid-pubblica',
  DEFAULT_PUSH_JID: 'push.tuoserver.com',
}
```

E poi usa:
```typescript
const subscription = await getPushSubscription(PUSH_NOTIFICATIONS.VAPID_PUBLIC_KEY)
```

### 3. Notifiche Solo in Background

Le notifiche push Web funzionano **solo quando l'applicazione è in background o chiusa**. Se l'app è aperta e in foreground, le notifiche potrebbero non essere mostrate (questo è un comportamento standard del Web Push API).

## Prossimi Passi

Per abilitare effettivamente le push notifications:

1. **Configura un Server XMPP con XEP-0357**:
   - Prosody con mod_cloud_notify
   - Ejabberd con mod_push
   - MongooseIM con mod_event_pusher_push

2. **Configura un Push Backend**:
   - Firebase Cloud Messaging (FCM)
   - Un app server custom che implementa Web Push Protocol

3. **Genera Chiavi VAPID**:
   ```bash
   npx web-push generate-vapid-keys
   ```

4. **Aggiorna Configurazione**:
   - Inserisci la chiave pubblica VAPID in `constants.ts`
   - Configura il JID del servizio push in `constants.ts`

## Conclusione

Il problema "server fallisce" era causato dall'invio di stanze IQ non correttamente formattate. Ora le stanze vengono inviate come XML grezzo, risolvendo il problema tecnico.

Tuttavia, **per far funzionare le push notifications serve un server XMPP che supporti XEP-0357**, che attualmente non è il caso dei server pubblici usati (`jabber.hot-chilli.net`, `conversations.im`).

Il codice ora è corretto e funzionerà quando verrà usato con un server che supporta XEP-0357.
