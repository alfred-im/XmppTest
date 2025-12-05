# Problema: Notifiche Push Non Arrivano

## Problema Identificato

Le notifiche push non arrivano quando si riceve un messaggio.

## Fix Applicati

### 1. Path Service Worker Corretto
**Problema**: Il Service Worker veniva registrato con il path `/sw.js` ma l'app usa il base path `/XmppTest/`.

**Fix**: Modificato `main.tsx` per usare `import.meta.env.BASE_URL + 'sw.js'` invece di `/sw.js`.

```typescript
// Prima:
navigator.serviceWorker.register('/sw.js')

// Dopo:
const swPath = import.meta.env.BASE_URL + 'sw.js'
navigator.serviceWorker.register(swPath)
```

## Verifica Manuale

### Step 1: Verifica Service Worker
1. Apri l'app in un browser
2. Apri la console (F12)
3. Esegui:
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registrato:', reg !== null);
  if (reg) console.log('Scope:', reg.scope);
});
```

Dovresti vedere `SW registrato: true` e lo scope dovrebbe essere `/XmppTest/`.

### Step 2: Verifica Push Subscription
```javascript
navigator.serviceWorker.getRegistration().then(async reg => {
  if (reg) {
    const sub = await reg.pushManager.getSubscription();
    console.log('Subscription:', sub ? 'Presente' : 'Assente');
    if (sub) console.log('Endpoint:', sub.endpoint.substring(0, 50) + '...');
  }
});
```

### Step 3: Verifica Configurazione Push
```javascript
const config = localStorage.getItem('push_config');
console.log('Push Config:', config ? JSON.parse(config) : 'Nessuna');
```

### Step 4: Test Invio Messaggio
1. Apri due schede:
   - Scheda 1: Login con `testardo@conversations.im`
   - Scheda 2: Login con `testarda@conversations.im`
2. Nella scheda 2, minimizza o nascondi la finestra
3. Nella scheda 1, invia un messaggio a `testarda@conversations.im`
4. Verifica se appare una notifica

## Possibili Cause

### 1. Server Non Supporta XEP-0357
Il server `conversations.im` potrebbe non supportare XEP-0357 (Push Notifications).

**Verifica**: Controlla nella console se vedi:
- `Servizio push trovato tramite Service Discovery`
- Oppure `Servizio push non trovato sul server XMPP`

Se vedi il secondo messaggio, il server non supporta push notifications.

### 2. Push Abilitate Ma Server Non Invia Notifiche
Anche se le push sono abilitate, il server potrebbe non inviare notifiche quando arrivano i messaggi.

**Verifica**: 
- Controlla che la subscription sia presente
- Controlla che il server abbia effettivamente un servizio push configurato
- Le notifiche vengono inviate solo quando l'app è in background o chiusa

### 3. Permesso Notifiche Non Concesso
```javascript
console.log('Permission:', Notification.permission);
```

Deve essere `'granted'`. Se è `'default'`, l'utente deve concedere il permesso manualmente.

## Debug Avanzato

### Verifica Log Console
Cerca nella console per:
- `Push Notifications abilitate automaticamente con successo`
- `Push notification ricevuta:` (nel Service Worker)
- Errori relativi a `push`, `XEP-0357`, `enablePush`

### Verifica Service Worker Logs
1. Apri DevTools → Application → Service Workers
2. Clicca su "Inspect" sul Service Worker
3. Controlla i log per vedere se arrivano eventi `push`

### Test Manuale Push Event
Puoi simulare un evento push per testare se il Service Worker funziona:

```javascript
navigator.serviceWorker.getRegistration().then(async reg => {
  if (reg) {
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      // Simula un evento push (questo richiede un server push reale)
      console.log('Subscription valida:', sub.endpoint);
    }
  }
});
```

## Prossimi Passi

1. **Verifica se `conversations.im` supporta XEP-0357**
   - Se non supporta, serve un server XMPP con supporto push configurato
   - Potresti dover configurare un server push separato (es. Firebase Cloud Messaging)

2. **Aggiungi più logging**
   - Aggiungi log quando le push vengono abilitate
   - Aggiungi log quando arrivano eventi push
   - Aggiungi log quando le notifiche vengono mostrate

3. **Test con server che supporta XEP-0357**
   - Se possibile, testa con un server XMPP che supporta effettivamente push notifications

## Note Importanti

- Le notifiche push funzionano **solo quando l'app è in background o chiusa**
- Se l'app è aperta e in foreground, le notifiche potrebbero non essere mostrate
- Il server XMPP deve avere un servizio push configurato e deve inviare le notifiche quando arrivano i messaggi
- Il Service Worker deve essere registrato correttamente per ricevere gli eventi push
