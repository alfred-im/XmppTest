/**
 * Servizio per gestire le Push Notifications secondo XEP-0357
 * 
 * XEP-0357: Push Notifications
 * https://xmpp.org/extensions/xep-0357.html
 * 
 * Questo servizio gestisce:
 * - Registrazione endpoint push con il server XMPP
 * - Abilitazione/disabilitazione push notifications
 * - Gestione delle chiavi VAPID
 */

import type { Agent } from 'stanza'

export interface PushNotificationConfig {
  /** JID del servizio push (es. push.example.com) */
  pushJid: string
  /** Endpoint URL del servizio push (es. Firebase Cloud Messaging) */
  endpoint: string
  /** Chiave pubblica VAPID */
  publicKey?: string
  /** Chiave privata VAPID (solo lato server, non esposta al client) */
  privateKey?: string
  /** Node ID per PubSub (opzionale, per XEP-0060) */
  node?: string
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Namespace XEP-0357
 */
const PUSH_NAMESPACE = 'urn:xmpp:push:0'

/**
 * Verifica se le Push Notifications sono supportate dal browser
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Verifica se le notifiche sono permesse dall'utente
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Richiede il permesso per le notifiche
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Le notifiche non sono supportate dal browser')
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    throw new Error('Il permesso per le notifiche è stato negato')
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Converte una chiave pubblica VAPID da base64url a ArrayBuffer
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Ottiene o crea una subscription push
 * Se applicationServerKey non è fornita, tenta di creare una subscription senza chiave
 * (alcuni servizi push non richiedono VAPID)
 */
export async function getPushSubscription(
  applicationServerKey?: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('Push Notifications non supportate dal browser')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Abbiamo già una subscription
      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      }
    }

    // Non abbiamo una subscription, creiamola
    // Se abbiamo la chiave, usala; altrimenti prova senza (per servizi che non richiedono VAPID)
    try {
      let newSubscription: PushSubscription
      
      if (applicationServerKey) {
        const key = urlBase64ToUint8Array(applicationServerKey)
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key as BufferSource,
        })
        newSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
            auth: arrayBufferToBase64(sub.getKey('auth')!),
          },
        }
      } else {
        // Prova senza chiave (per servizi push che non richiedono VAPID)
        // Nota: molti browser richiedono comunque una chiave, quindi questo potrebbe fallire
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
        })
        newSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
            auth: arrayBufferToBase64(sub.getKey('auth')!),
          },
        }
      }

      return newSubscription
    } catch (error) {
      console.warn('Impossibile creare subscription push senza chiave VAPID:', error)
      console.warn('Alcuni browser richiedono una chiave VAPID per le push notifications')
      return null
    }
  } catch (error) {
    console.error('Errore nella gestione push subscription:', error)
    return null
  }
}

/**
 * Converte ArrayBuffer a base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Scopre automaticamente il servizio push dal server XMPP usando Service Discovery (XEP-0030)
 * 
 * Secondo XEP-0357, il client può usare Service Discovery per chiedere al server
 * quali servizi push sono disponibili.
 * 
 * Processo:
 * 1. Fa disco.info sul server per vedere se supporta push direttamente
 * 2. Se non lo supporta direttamente, fa disco.items per vedere i servizi disponibili
 * 3. Per ogni servizio, fa disco.info per verificare se supporta push
 * 4. Restituisce il primo servizio che supporta XEP-0357
 */
export async function discoverPushService(client: Agent): Promise<{ jid: string; node?: string } | null> {
  try {
    const serverJid = client.jid?.split('/')[0]
    if (!serverJid) {
      console.warn('⚠️ Push Notifications: Impossibile determinare JID del server')
      return null
    }

    console.log(`🔍 Push Notifications: Cerco servizio push sul server ${serverJid}...`)

    // Verifica che il plugin disco sia disponibile
    if (!client.getDiscoInfo || !client.getDiscoItems) {
      console.warn('⚠️ Push Notifications: Service Discovery non disponibile - il plugin disco potrebbe non essere caricato')
      return null
    }

    // 1. Verifica se il server stesso supporta push direttamente
    try {
      console.log(`🔍 Push Notifications: Verifico se il server supporta XEP-0357 direttamente...`)
      const serverDiscoInfo = await client.getDiscoInfo(serverJid)
      
      console.log(`📋 Push Notifications: Features del server:`, serverDiscoInfo.features)
      
      if (serverDiscoInfo.features && serverDiscoInfo.features.includes(PUSH_NAMESPACE)) {
        console.log('✅ Push Notifications: Server supporta push notifications direttamente:', serverJid)
        return { jid: serverJid }
      } else {
        console.log('ℹ️ Push Notifications: Server non supporta push direttamente, cerco nei servizi...')
      }
    } catch (error) {
      console.debug('⚠️ Push Notifications: Errore nel disco.info sul server:', error)
      // Continua con la ricerca nei servizi
    }

    // 2. Il server non supporta push direttamente, cerca nei servizi disponibili
    try {
      console.log(`🔍 Push Notifications: Cerco servizi disponibili sul server...`)
      const serverDiscoItems = await client.getDiscoItems(serverJid)
      
      if (!serverDiscoItems.items || serverDiscoItems.items.length === 0) {
        console.warn('⚠️ Push Notifications: Nessun servizio disponibile sul server')
        console.warn('❌ Push Notifications: Il server non supporta XEP-0357 (Push Notifications)')
        console.warn('💡 Push Notifications: Per abilitare le push, serve un server XMPP con supporto XEP-0357')
        return null
      }

      console.log(`📋 Push Notifications: Trovati ${serverDiscoItems.items.length} servizi sul server`)

      // 3. Per ogni servizio, verifica se supporta push
      for (const item of serverDiscoItems.items) {
        if (!item.jid) {
          continue
        }

        try {
          console.log(`🔍 Push Notifications: Verifico servizio ${item.jid}...`)
          const itemDiscoInfo = await client.getDiscoInfo(item.jid, item.node)
          
          // Verifica se questo servizio supporta XEP-0357
          if (itemDiscoInfo.features && itemDiscoInfo.features.includes(PUSH_NAMESPACE)) {
            console.log('✅ Push Notifications: Servizio push trovato tramite Service Discovery:', item.jid, item.node)
            return { 
              jid: item.jid.toString(), 
              node: item.node 
            }
          }
        } catch (error) {
          // Ignora errori per singoli servizi e continua con il prossimo
          console.debug(`⚠️ Push Notifications: Errore nel disco.info sul servizio ${item.jid}:`, error)
          continue
        }
      }

      console.warn('❌ Push Notifications: Nessun servizio push trovato tramite Service Discovery')
      console.warn('❌ Push Notifications: Il server non supporta XEP-0357 (Push Notifications)')
      console.warn('💡 Push Notifications: Per abilitare le push, serve un server XMPP con supporto XEP-0357')
      return null
    } catch (error) {
      console.warn('⚠️ Push Notifications: Errore nel disco.items sul server:', error)
      return null
    }
  } catch (error) {
    console.error('❌ Push Notifications: Errore nella discovery del servizio push:', error)
    return null
  }
}

/**
 * Abilita le push notifications sul server XMPP secondo XEP-0357
 * 
 * Invia una IQ stanza per registrare l'endpoint push con il server
 * 
 * Formato stanza secondo XEP-0357:
 * <iq type='set' id='enable1'>
 *   <enable xmlns='urn:xmpp:push:0' jid='push.example.com' node='mynode'>
 *     <x xmlns='jabber:x:data' type='submit'>
 *       <field var='FORM_TYPE'><value>http://jabber.org/protocol/pubsub#publish-options</value></field>
 *       <field var='pubsub#endpoint'><value>https://push.example.com/push/abc123</value></field>
 *       <field var='pubsub#max_items'><value>1</value></field>
 *     </x>
 *   </enable>
 * </iq>
 */
/**
 * Abilita automaticamente le push notifications
 * Scopre il servizio push e abilita senza configurazione manuale
 */
export async function enablePushNotificationsAuto(client: Agent): Promise<boolean> {
  try {
    console.log('🚀 Push Notifications: Inizio abilitazione automatica...')
    
    // 1. Scopri il servizio push
    const pushService = await discoverPushService(client)
    if (!pushService) {
      console.warn('⚠️ Push Notifications: Servizio push non trovato sul server XMPP')
      console.warn('💡 Push Notifications: Il server non supporta XEP-0357. Le notifiche push non saranno disponibili.')
      return false
    }

    console.log(`✅ Push Notifications: Servizio push trovato: ${pushService.jid}`)

    // 2. Ottieni subscription push (senza chiave VAPID se possibile)
    console.log('🔑 Push Notifications: Ottengo subscription push dal browser...')
    const subscription = await getPushSubscription()
    if (!subscription) {
      console.warn('⚠️ Push Notifications: Impossibile ottenere subscription push dal browser')
      console.warn('💡 Push Notifications: Verifica che il browser supporti Web Push API')
      return false
    }

    console.log(`✅ Push Notifications: Subscription push ottenuta: ${subscription.endpoint.substring(0, 50)}...`)

    // 3. Abilita push notifications
    console.log('📤 Push Notifications: Invio richiesta di abilitazione al server XMPP...')
    const result = await enablePushNotifications(client, pushService.jid, subscription, pushService.node)
    
    if (result) {
      console.log('✅ Push Notifications: Abilitate con successo!')
    } else {
      console.warn('⚠️ Push Notifications: Abilitazione fallita')
    }
    
    return result
  } catch (error) {
    console.error('❌ Push Notifications: Errore nell\'abilitazione automatica:', error)
    return false
  }
}

/**
 * Abilita le push notifications sul server XMPP secondo XEP-0357
 */
export async function enablePushNotifications(
  client: Agent,
  pushJid: string,
  pushSubscription: PushSubscription,
  node?: string
): Promise<boolean> {
  try {
    // Verifica che il server supporti XEP-0357
    // Nota: Stanza.js potrebbe non avere un metodo diretto per discoverFeatures
    // Tentiamo comunque di abilitare le push - il server risponderà con errore se non supportato
    // In alternativa, possiamo fare una disco.info manuale se necessario

    // Costruisci la stanza IQ per abilitare push usando XML grezzo
    // Stanza.js non ha supporto nativo per XEP-0357, quindi inviamo XML direttamente
    const iqId = `enable-push-${Date.now()}`
    
    // Costruisci l'XML della stanza secondo XEP-0357
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

    // Invia la stanza XML grezzo e aspetta la risposta
    return new Promise<boolean>((resolve) => {
      // Handler per la risposta IQ
      const handleIQ = (iq: { id?: string; type?: string }) => {
        if (iq.id === iqId) {
          // Rimuovi il listener dopo aver ricevuto la risposta
          const emitter = client as unknown as { 
            removeListener: (name: string, cb: (data: { id?: string; type?: string }) => void) => void 
          }
          emitter.removeListener('iq', handleIQ)

          if (iq.type === 'result') {
            console.log('Push Notifications abilitate con successo')
            resolve(true)
          } else {
            console.error('Errore nell\'abilitazione push notifications:', iq)
            resolve(false)
          }
        }
      }

      // Registra il listener per la risposta IQ
      const emitter = client as unknown as { 
        on: (name: string, cb: (data: { id?: string; type?: string }) => void) => void 
      }
      emitter.on('iq', handleIQ)

      // Timeout per evitare che la promise rimanga pending per sempre
      setTimeout(() => {
        const emitterTimeout = client as unknown as { 
          removeListener: (name: string, cb: (data: { id?: string; type?: string }) => void) => void 
        }
        emitterTimeout.removeListener('iq', handleIQ)
        console.error('Timeout nell\'abilitazione push notifications')
        resolve(false)
      }, 10000)

      // Invia la stanza XML
      const sender = client as unknown as { send: (name: string, data: string) => void }
      sender.send('iq', enableXml)
    })
  } catch (error) {
    console.error('Errore nell\'abilitazione push notifications:', error)
    return false
  }
}

/**
 * Disabilita le push notifications sul server XMPP
 * 
 * Formato stanza secondo XEP-0357:
 * <iq type='set' id='disable1'>
 *   <disable xmlns='urn:xmpp:push:0' jid='push.example.com' node='mynode'/>
 * </iq>
 */
export async function disablePushNotifications(
  client: Agent,
  pushJid: string,
  node?: string
): Promise<boolean> {
  try {
    // Costruisci la stanza IQ per disabilitare push usando XML grezzo
    const iqId = `disable-push-${Date.now()}`
    
    // Costruisci l'XML della stanza secondo XEP-0357
    const disableXml = `<iq type="set" id="${iqId}">
  <disable xmlns="${PUSH_NAMESPACE}" jid="${pushJid}"${node ? ` node="${node}"` : ''}/>
</iq>`

    // Invia la stanza XML grezzo e aspetta la risposta
    return new Promise<boolean>((resolve) => {
      // Handler per la risposta IQ
      const handleIQ = (iq: { id?: string; type?: string }) => {
        if (iq.id === iqId) {
          // Rimuovi il listener dopo aver ricevuto la risposta
          const emitter = client as unknown as { 
            removeListener: (name: string, cb: (data: { id?: string; type?: string }) => void) => void 
          }
          emitter.removeListener('iq', handleIQ)

          if (iq.type === 'result') {
            console.log('Push Notifications disabilitate con successo')
            resolve(true)
          } else {
            console.error('Errore nella disabilitazione push notifications:', iq)
            resolve(false)
          }
        }
      }

      // Registra il listener per la risposta IQ
      const emitter = client as unknown as { 
        on: (name: string, cb: (data: { id?: string; type?: string }) => void) => void 
      }
      emitter.on('iq', handleIQ)

      // Timeout per evitare che la promise rimanga pending per sempre
      setTimeout(() => {
        const emitterTimeout = client as unknown as { 
          removeListener: (name: string, cb: (data: { id?: string; type?: string }) => void) => void 
        }
        emitterTimeout.removeListener('iq', handleIQ)
        console.error('Timeout nella disabilitazione push notifications')
        resolve(false)
      }, 10000)

      // Invia la stanza XML
      const sender = client as unknown as { send: (name: string, data: string) => void }
      sender.send('iq', disableXml)
    })
  } catch (error) {
    console.error('Errore nella disabilitazione push notifications:', error)
    return false
  }
}

/**
 * Verifica se le push notifications sono abilitate sul server
 */
export async function checkPushNotificationsStatus(
  _client: Agent
): Promise<{ enabled: boolean; jid?: string; node?: string }> {
  try {
    // XEP-0357 non specifica un modo diretto per verificare lo stato
    // Verifichiamo se abbiamo una configurazione salvata come indicatore
    // In futuro, potremmo fare una disco.info per verificare lo stato sul server
    const config = loadPushConfig()
    
    return {
      enabled: config !== null,
      jid: config?.pushJid,
      node: config?.node,
    }
  } catch (error) {
    console.error('Errore nella verifica stato push notifications:', error)
    return { enabled: false }
  }
}

/**
 * Salva la configurazione push nel localStorage
 */
export function savePushConfig(config: PushNotificationConfig): void {
  try {
    localStorage.setItem('push_config', JSON.stringify(config))
  } catch (error) {
    console.error('Errore nel salvataggio configurazione push:', error)
  }
}

/**
 * Carica la configurazione push dal localStorage
 */
export function loadPushConfig(): PushNotificationConfig | null {
  try {
    const stored = localStorage.getItem('push_config')
    if (!stored) {
      return null
    }
    return JSON.parse(stored) as PushNotificationConfig
  } catch (error) {
    console.error('Errore nel caricamento configurazione push:', error)
    return null
  }
}

/**
 * Rimuove la configurazione push dal localStorage
 */
export function clearPushConfig(): void {
  try {
    localStorage.removeItem('push_config')
  } catch (error) {
    console.error('Errore nella rimozione configurazione push:', error)
  }
}
