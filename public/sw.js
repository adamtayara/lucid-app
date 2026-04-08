// Lucid Service Worker — handles push notifications and offline caching

const CACHE_NAME = 'lucid-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || '🌙 Lucid — Dream Reminder'
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
