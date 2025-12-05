# Debug Push Notifications - XEP-0357

## Problema
Le notifiche push non arrivano quando si riceve un messaggio.

## Verifica Manuale

### 1. Verifica Supporto Browser
Apri la console del browser (F12) ed esegui:
```javascript
console.log('Service Worker:', 'serviceWorker' in navigator);
console.log('Push Manager:', 'PushManager' in window);
console.log('Notification:', 'Notification' in window);
console.log('Permission:', Notification.permission);
```

Tutti dovrebbero essere `true` e la permission dovrebbe essere `'granted'`.

### 2. Verifica Service Worker
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker registrato:', reg !== null);
  if (reg) {
    console.log('Scope:', reg.scope);
    console.log('Active:', reg.active !== null);
  }
});
```

### 3. Verifica Configurazione Push
```javascript
// Verifica localStorage
const pushConfig = localStorage.getItem('push_config');
console.log('Push Config:', pushConfig ? JSON.parse(pushConfig) : 'Nessuna configurazione');

// Verifica subscription
navigator.serviceWorker.getRegistration().then(async reg => {
  if (reg) {
    const subscription = await reg.pushManager.getSubscription();
    console.log('Push Subscription:', subscription ? {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      keys: subscription.getKey ? {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
      } : 'N/A'
    } : 'Nessuna subscription');
  }
});
```

### 4. Verifica Log Console
Cerca nella console per:
- `Push Notifications abilitate automaticamente con successo`
- `Push notification ricevuta:` (nel Service Worker)
- Errori relativi a `push`, `XEP-0357`, `enablePush`

### 5. Verifica Server XMPP
Il server `conversations.im` potrebbe non supportare XEP-0357. Verifica:
- Se il server supporta Service Discovery per push (XEP-0030)
- Se il server ha un servizio push configurato
- Se il server invia effettivamente le notifiche push quando arrivano i messaggi

## Possibili Problemi

### Problema 1: Server non supporta XEP-0357
**Sintomo**: Le push vengono abilitate ma non arrivano notifiche.

**Verifica**:
```javascript
// Dopo il login, verifica se il server supporta push
// (Questo richiede accesso al client XMPP)
```

**Soluzione**: Il server `conversations.im` potrebbe non supportare XEP-0357. Serve un server XMPP con supporto push configurato.

### Problema 2: Service Worker non registrato
**Sintomo**: `navigator.serviceWorker.getRegistration()` ritorna `null`.

**Verifica**: Controlla la console per errori durante la registrazione del Service Worker.

**Soluzione**: Verifica che `/sw.js` sia accessibile e che il Service Worker sia registrato correttamente in `main.tsx`.

### Problema 3: Permesso notifiche negato
**Sintomo**: `Notification.permission === 'denied'`.

**Verifica**: Controlla le impostazioni del browser.

**Soluzione**: L'utente deve concedere il permesso manualmente nelle impostazioni del browser.

### Problema 4: Push abilitate ma server non invia notifiche
**Sintomo**: Tutto è configurato correttamente ma non arrivano notifiche.

**Verifica**: 
- Verifica che il server XMPP abbia effettivamente un servizio push configurato
- Verifica che il server invii le notifiche quando arrivano i messaggi (non quando l'app è in foreground)

**Soluzione**: Le notifiche push vengono inviate solo quando l'app è in background o chiusa. Se l'app è aperta e in foreground, le notifiche potrebbero non essere mostrate.

### Problema 5: Endpoint push non valido
**Sintomo**: La subscription viene creata ma il server non può inviare notifiche.

**Verifica**: Controlla che l'endpoint della subscription sia valido e accessibile.

**Soluzione**: Verifica che il servizio push (es. Firebase Cloud Messaging) sia configurato correttamente sul server XMPP.

## Test Manuale Completo

1. **Apri due schede del browser**:
   - Scheda 1: Login con `testardo@conversations.im`
   - Scheda 2: Login con `testarda@conversations.im`

2. **Nella scheda 2 (testarda)**:
   - Apri la console (F12)
   - Verifica che il Service Worker sia registrato
   - Verifica che ci sia una push subscription
   - Verifica che `Notification.permission === 'granted'`
   - **Minimizza o nascondi la scheda** (le notifiche push funzionano solo quando l'app è in background)

3. **Nella scheda 1 (testardo)**:
   - Invia un messaggio a `testarda@conversations.im`

4. **Verifica**:
   - Dovrebbe apparire una notifica nella scheda 2 (anche se minimizzata)
   - Controlla la console della scheda 2 per vedere se il Service Worker ha ricevuto l'evento `push`

## Debug nel Codice

### Verifica Abilitazione Automatica
Il codice in `XmppContext.tsx` abilita automaticamente le push dopo 2 secondi dalla connessione:

```typescript
// Linea ~532-536
if (!status.enabled && pushPermission === 'granted') {
  await enablePushAuto()
}
```

Verifica nella console se vedi:
- `Push Notifications abilitate automaticamente con successo`
- Oppure errori relativi all'abilitazione

### Verifica Service Discovery
Il codice in `push-notifications.ts` usa Service Discovery (XEP-0030) per trovare il servizio push:

```typescript
// discoverPushService usa client.getDiscoInfo e client.getDiscoItems
```

Se il server non supporta push, questa funzione potrebbe non trovare nessun servizio.

## Prossimi Passi

1. Verifica se `conversations.im` supporta effettivamente XEP-0357
2. Se non supporta, serve un server XMPP con supporto push configurato
3. Verifica che le notifiche vengano mostrate solo quando l'app è in background
4. Aggiungi più logging per capire dove si interrompe il flusso
