// Service Worker per funzionalità offline base
const CACHE_NAME = 'alfred-chat-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Le risorse statiche verranno cachate automaticamente durante l'installazione
]

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aperto')
        return cache.addAll(urlsToCache)
      })
      .catch((err) => {
        console.log('Service Worker: Errore durante cache', err)
      })
  )
  // Forza l'attivazione immediata del nuovo service worker
  self.skipWaiting()
})

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Rimuovi cache vecchie
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Rimozione cache vecchia', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Prendi il controllo di tutte le pagine immediatamente
  return self.clients.claim()
})

// Strategia: Network First, fallback a Cache
self.addEventListener('fetch', (event) => {
  // Ignora richieste non GET
  if (event.request.method !== 'GET') {
    return
  }

  // Ignora richieste XMPP/WebSocket
  if (event.request.url.includes('ws://') || 
      event.request.url.includes('wss://') ||
      event.request.url.includes('/xmpp') ||
      event.request.url.includes('/bosh')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona la risposta perché può essere consumata solo una volta
        const responseToCache = response.clone()

        // Cache solo risposte valide
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }

        return response
      })
      .catch(() => {
        // Se la rete fallisce, prova a servire dalla cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Se non c'è cache, restituisci una pagina offline base
            if (event.request.destination === 'document') {
              return caches.match('/index.html')
            }
          })
      })
  )
})

// Gestione messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
