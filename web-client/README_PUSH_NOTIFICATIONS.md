# Push Notifications - Guida Completa

## 🎯 Stato Attuale

✅ **Fix Tecnico Completato** (5 Dicembre 2025)

Il problema "server fallisce" è stato **RISOLTO**. Le stanze IQ per XEP-0357 ora vengono inviate correttamente al server XMPP.

### Cosa Funziona

- ✅ Invio corretto delle stanze IQ per abilitare/disabilitare push
- ✅ Rilevamento automatico del supporto XEP-0357 sul server
- ✅ Logging dettagliato per debugging
- ✅ Service Worker configurato per ricevere notifiche
- ✅ Gestione permessi browser per notifiche

### Cosa Serve Per Funzionare

⚠️ **Per far funzionare le push notifications serve un server XMPP che supporti XEP-0357**

I server pubblici attualmente configurati **NON** supportano XEP-0357:
- ❌ `jabber.hot-chilli.net`
- ❌ `conversations.im`

## 🔍 Come Verificare il Supporto del Server

### Metodo 1: Console del Browser

1. Apri l'app e fai login
2. Apri la Console (F12)
3. Cerca i log con emoji:

```
✅ Push Notifications: Server supporta push notifications direttamente
```

Oppure:

```
❌ Push Notifications: Il server non supporta XEP-0357 (Push Notifications)
💡 Push Notifications: Per abilitare le push, serve un server XMPP con supporto XEP-0357
```

### Metodo 2: Script di Test

Esegui lo script di test fornito:

```bash
cd web-client
node test-xep-0357-support.mjs testardo@conversations.im password123
```

Output:
```
🧪 Test Supporto XEP-0357 (Push Notifications)
ℹ JID: testardo@conversations.im
ℹ Server: conversations.im

✓ Connesso al server XMPP
🔍 Verifico supporto XEP-0357...

❌ XEP-0357 NON supportato
```

## 🚀 Come Abilitare le Push Notifications

### Requisiti

Per far funzionare le push notifications servono:

1. **Server XMPP con XEP-0357**
   - Prosody con `mod_cloud_notify`
   - Ejabberd con `mod_push`
   - MongooseIM con `mod_event_pusher_push`

2. **Servizio Push Backend**
   - Firebase Cloud Messaging (FCM)
   - App server custom con Web Push Protocol

3. **Chiavi VAPID** (opzionali ma consigliate)

### Configurazione Server XMPP

#### Opzione 1: Prosody con mod_cloud_notify

```lua
-- In prosody.cfg.lua
modules_enabled = {
  "cloud_notify";
  -- altri moduli...
}

-- Configurazione push
push_notification_with_body = true
push_notification_with_sender = true
```

#### Opzione 2: Ejabberd con mod_push

```yaml
# In ejabberd.yml
modules:
  mod_push:
    push_backend: fcm
    api_key: "YOUR_FCM_API_KEY"
```

#### Opzione 3: MongooseIM

```toml
[modules.mod_event_pusher.backend.push]
  backend = "fcm"
  api_key = "YOUR_FCM_API_KEY"
```

### Configurazione Client Web

1. **Genera chiavi VAPID**:

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa...
Private Key: 6oT3VWwTzEp4t1pEJLWzArF...
```

2. **Configura constants.ts**:

```typescript
// In src/config/constants.ts
export const PUSH_NOTIFICATIONS = {
  VAPID_PUBLIC_KEY: 'BEl62iUYgUivxIkv69yViEuiBIa...', // La tua chiave pubblica
  DEFAULT_PUSH_JID: 'push.tuoserver.com', // JID del servizio push
} as const;
```

3. **Riavvia l'app**:

```bash
npm run dev
```

## 📝 Come Funzionano le Push Notifications

### Flusso Completo

```
1. User fa login
   ↓
2. App richiede permesso notifiche al browser
   ↓
3. Browser crea PushSubscription (endpoint + chiavi)
   ↓
4. App fa Service Discovery (XEP-0030) sul server XMPP
   ↓
5. Se server supporta XEP-0357:
   ↓
6. App invia stanza IQ per abilitare push:
   <iq type='set'>
     <enable xmlns='urn:xmpp:push:0' jid='push.server.com'>
       <x xmlns='jabber:x:data' type='submit'>
         <field var='pubsub#endpoint'>
           <value>https://fcm.googleapis.com/...</value>
         </field>
       </x>
     </enable>
   </iq>
   ↓
7. Server XMPP registra l'endpoint push
   ↓
8. Quando arriva un messaggio:
   - Server XMPP invia notifica push al servizio backend
   - Servizio backend (FCM) invia notifica al browser
   - Service Worker riceve evento 'push'
   - Service Worker mostra notifica
```

### Quando Vengono Mostrate le Notifiche

Le notifiche push vengono mostrate **SOLO** quando:

- ✅ L'app è chiusa
- ✅ L'app è in background (tab non attiva)
- ✅ L'app è minimizzata

Le notifiche **NON** vengono mostrate quando:

- ❌ L'app è in foreground (tab attiva)
- ❌ L'utente sta attivamente usando l'app

Questo è il comportamento standard del Web Push API.

## 🐛 Troubleshooting

### "Server fallisce" o "Push non abilitate"

✅ **RISOLTO** - Questo errore è stato fixato. Se lo vedi ancora, assicurati di avere l'ultima versione del codice.

### "Il server non supporta XEP-0357"

❌ Il server XMPP non ha il supporto push configurato.

**Soluzioni**:
1. Usa un server XMPP diverso con XEP-0357
2. Configura il tuo server XMPP con supporto push
3. Contatta l'admin del server per abilitare XEP-0357

### "Permesso notifiche negato"

L'utente ha negato il permesso notifiche nel browser.

**Soluzione**:
1. Clicca sull'icona del lucchetto nella barra degli indirizzi
2. Vai nelle Impostazioni del sito
3. Imposta "Notifiche" su "Consenti"
4. Ricarica la pagina

### "Service Worker non registrato"

Il Service Worker non si è registrato correttamente.

**Verifica**:
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW:', reg ? 'Registrato' : 'Non registrato');
});
```

**Soluzione**:
1. Verifica che `sw.js` sia accessibile
2. Controlla la console per errori
3. In DevTools → Application → Service Workers, verifica lo stato

### Le notifiche non arrivano

Verifica in ordine:

1. ✅ Server supporta XEP-0357? → Esegui test script
2. ✅ Permesso notifiche concesso? → Controlla impostazioni browser
3. ✅ Service Worker registrato? → DevTools → Application → Service Workers
4. ✅ Push subscription creata? → Controlla localStorage 'push_config'
5. ✅ App in background? → Le notifiche arrivano solo in background
6. ✅ Chiavi VAPID configurate? → Verifica constants.ts
7. ✅ Backend push funzionante? → Verifica FCM o servizio push

## 📚 Documentazione di Riferimento

### File Creati/Modificati

- ✅ `src/services/push-notifications.ts` - Servizio push notifications
- ✅ `src/components/PushNotificationsSettings.tsx` - UI per configurare push
- ✅ `src/components/PushNotificationStatus.tsx` - Status indicator
- ✅ `public/sw.js` - Service Worker
- ✅ `test-xep-0357-support.mjs` - Script per testare supporto server

### Documentazione

- 📄 `PUSH_NOTIFICATIONS_FIX.md` - Dettagli tecnici della fix
- 📄 `PUSH_NOTIFICATIONS_ISSUE.md` - Storia del problema
- 📄 `DEBUG_PUSH_NOTIFICATIONS.md` - Guida al debugging
- 📄 `README_PUSH_NOTIFICATIONS.md` - Questa guida

### Standard XMPP

- [XEP-0357: Push Notifications](https://xmpp.org/extensions/xep-0357.html)
- [XEP-0030: Service Discovery](https://xmpp.org/extensions/xep-0030.html)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID](https://datatracker.ietf.org/doc/html/rfc8292)

## 🎓 Per Sviluppatori

### Struttura del Codice

```
src/
├── services/
│   └── push-notifications.ts      # Servizio principale
├── components/
│   ├── PushNotificationsSettings.tsx  # UI settings
│   └── PushNotificationStatus.tsx     # Status indicator
├── contexts/
│   └── XmppContext.tsx             # Abilitazione automatica push
└── config/
    └── constants.ts                # Configurazione VAPID

public/
└── sw.js                           # Service Worker
```

### API Principali

```typescript
// Verifica supporto browser
isPushSupported(): boolean

// Richiedi permesso notifiche
requestNotificationPermission(): Promise<NotificationPermission>

// Ottieni/Crea subscription push
getPushSubscription(vapidKey?: string): Promise<PushSubscription | null>

// Scopri servizio push sul server
discoverPushService(client: Agent): Promise<{ jid: string; node?: string } | null>

// Abilita push (automatico)
enablePushNotificationsAuto(client: Agent): Promise<boolean>

// Abilita push (manuale)
enablePushNotifications(
  client: Agent,
  pushJid: string,
  subscription: PushSubscription,
  node?: string
): Promise<boolean>

// Disabilita push
disablePushNotifications(
  client: Agent,
  pushJid: string,
  node?: string
): Promise<boolean>
```

### Testing

```bash
# Test supporto server
node test-xep-0357-support.mjs user@server.com password

# Test completo push (richiede Playwright)
npm run test:browser

# Build per verificare errori TypeScript
npm run build
```

## 💡 FAQ

**Q: Perché le notifiche non funzionano su `conversations.im`?**

A: Il server `conversations.im` non supporta XEP-0357 (Push Notifications). Serve un server con supporto push.

---

**Q: Posso testare le push in locale?**

A: Sì, ma serve:
1. Server XMPP locale con XEP-0357 (es. Prosody)
2. Servizio push locale o FCM
3. HTTPS (o localhost per Service Worker)

---

**Q: Le chiavi VAPID sono obbligatorie?**

A: Dipende dal browser. Chrome e Firefox moderni le richiedono. Safari potrebbe funzionare senza.

---

**Q: Posso usare notifiche native invece di Web Push?**

A: Su web no. Le Web Push API sono l'unico modo per notifiche in background. Su mobile nativo (Android/iOS) puoi usare FCM/APNs direttamente.

---

**Q: Quanto costa implementare push notifications?**

A: Firebase Cloud Messaging (FCM) è gratuito fino a milioni di notifiche/mese. Server XMPP self-hosted è gratuito.

---

**Q: Le push funzionano offline?**

A: No. Serve connessione internet per ricevere notifiche push. Il Service Worker può cachare l'app per funzionamento offline, ma le notifiche richiedono rete.

## 🤝 Contributi

Per migliorare il supporto push notifications:

1. Fork del repository
2. Crea branch: `git checkout -b feature/push-improvements`
3. Commit: `git commit -m 'Miglioramento push notifications'`
4. Push: `git push origin feature/push-improvements`
5. Pull Request

## 📧 Support

Per problemi specifici:

1. Controlla la console per log dettagliati (con emoji)
2. Esegui script di test: `node test-xep-0357-support.mjs`
3. Leggi `PUSH_NOTIFICATIONS_FIX.md` per dettagli tecnici
4. Apri issue su GitHub con:
   - Server XMPP usato
   - Log dalla console
   - Risultato dello script di test

---

**Versione**: 1.0.0  
**Data**: 5 Dicembre 2025  
**Autore**: Claude (AI Assistant)  
**Status**: ✅ Fix Completata - ⚠️ Richiede Server con XEP-0357
