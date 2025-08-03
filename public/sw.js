// Smart Grocery Service Worker
const CACHE_NAME = 'smart-grocery-v1.2.0';
const STATIC_CACHE_NAME = 'smart-grocery-static-v1.2.0';
const DATA_CACHE_NAME = 'smart-grocery-data-v1.2.0';

// Cache strategies
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const DATA_URLS = [
  '/functions/v1/recipe-assistant',
  '/rest/v1/inventory',
  '/rest/v1/shopping_list',
  '/rest/v1/products',
  '/rest/v1/recipes'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DATA_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all open pages
  self.clients.claim();
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests (Supabase)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle static assets
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style') {
    event.respondWith(handleStaticAssets(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // Default: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Cache strategies implementation
async function handleAPIRequest(request) {
  const cache = await caches.open(DATA_CACHE_NAME);
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API failures
    return new Response(
      JSON.stringify({
        error: 'Offline mode',
        message: 'Vous êtes hors ligne. Certaines données peuvent être obsolètes.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleStaticAssets(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Try cache first for static assets
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    // Return a fallback for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Image indisponible</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    throw error;
  }
}

async function handleNavigation(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fallback to cached index.html for SPA
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match('/');
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'offline-sync') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await executeOfflineAction(action);
        await removeOfflineAction(action.id);
        console.log('[SW] Synced offline action:', action.type);
      } catch (error) {
        console.error('[SW] Failed to sync action:', action, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

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
      url: '/?tab=inventory'
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

// Helper functions for IndexedDB operations
async function getOfflineActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('smart-grocery-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id' });
      }
    };
  });
}

async function removeOfflineAction(actionId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('smart-grocery-offline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const deleteRequest = store.delete(actionId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

async function executeOfflineAction(action) {
  // Implementation for executing queued offline actions
  const { type, data } = action;
  
  switch (type) {
    case 'ADD_TO_INVENTORY':
      await fetch('/rest/v1/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      break;
    case 'UPDATE_INVENTORY':
      await fetch(`/rest/v1/inventory?id=eq.${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates)
      });
      break;
    case 'ADD_TO_SHOPPING_LIST':
      await fetch('/rest/v1/shopping_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      break;
    default:
      console.warn('[SW] Unknown offline action type:', type);
  }
}