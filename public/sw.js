// NightMind Service Worker — handles push notifications and offline caching

const CACHE_NAME = 'nightmind-v2'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install: cache core assets, activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  )
  self.skipWaiting()
})

// Activate: clean old caches, take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first strategy — always try fresh content, fall back to cache offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/functions/v1/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the fresh response for offline use
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || '🌙 NightMind — Dream Reminder'
  const options = {
    body: data.body || 'What did you dream last night? Record it before it fades...',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'morning-dream-reminder',
    requireInteraction: true,
    actions: [
      { action: 'record', title: '📝 Record Dream' },
      { action: 'dismiss', title: 'Later' },
    ],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  // Open the app to the interpret page
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus()
        }
      }
      // Otherwise open new window
      return clients.openWindow('/?record=true')
    })
  )
})
