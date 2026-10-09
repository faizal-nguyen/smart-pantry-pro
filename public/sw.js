// V10-01: cache the application shell only. Private reads and all writes require the network.
const STATIC_CACHE_NAME = 'smart-grocery-static-v10-01';
const STATIC_ASSETS = ['/', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];
async function purgeOldCaches() {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith('smart-grocery-') && name !== STATIC_CACHE_NAME).map(name => caches.delete(name)));
}
self.addEventListener('install',event => {
  event.waitUntil(caches.open(STATIC_CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate',event => {
  event.waitUntil(purgeOldCaches().then(() => self.clients.claim()));
});
self.addEventListener('message',event => {
  if (event.data?.type === 'PURGE_PRIVATE_DATA') event.waitUntil(purgeOldCaches());
});
self.addEventListener('fetch',event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin
    || request.headers.has('authorization') || /^\/(api|rest|auth|functions|storage)\//.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.open(STATIC_CACHE_NAME)).match('/')
      .then(response => response ?? new Response('Connexion requise', { status: 503 }))));
    return;
  }
  // Only versioned build assets and public bundled icons belong in this cache.
  if (!url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/icons/') && url.pathname !== '/manifest.json') return;
  event.respondWith(caches.open(STATIC_CACHE_NAME).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request,response.clone());
    return response;
  }));
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'Certains produits vont bientôt expirer !',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'expiry-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Voir l\'inventaire'
      },
      {
        action: 'dismiss',
        title: 'Ignorer'
      }
    ],
    data: {
      url: '/pantry/inventory'
    }
  };
  
  if (event.data) {
    const payload = event.data.json();
    options.body = payload.message || options.body;
    options.data = { ...options.data, ...payload.data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Smart Grocery', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});
