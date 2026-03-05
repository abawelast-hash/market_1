/**
 * Service Worker - دليل الرقة
 * Offline-first strategy with Background Sync for Syrian internet conditions
 */

const CACHE_NAME = 'dalil-raqqa-v3';
const STATIC_CACHE = 'dalil-static-v3';
const API_CACHE = 'dalil-api-v3';
const IMAGE_CACHE = 'dalil-images-v3';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/db.js',
  '/js/api.js',
  '/js/router.js',
  '/js/ui.js',
  '/js/wishlist.js',
  '/js/share.js',
  '/js/qr.js',
  '/js/loyalty.js',
  '/js/packs.js',
  '/js/pages.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v3...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v3...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => 
          key !== STATIC_CACHE && key !== API_CACHE && key !== IMAGE_CACHE
        ).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (let POST/PUT pass through)
  if (request.method !== 'GET') return;

  // Strategy based on request type
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (
    request.destination === 'image' || 
    url.pathname.endsWith('.webp') || 
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.png')
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

/**
 * Background Sync - replay offline actions when connection restores
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'dalil-sync') {
    console.log('[SW] Background Sync triggered');
    event.waitUntil(replaySyncQueue());
  }
});

async function replaySyncQueue() {
  // Open IndexedDB in service worker context
  const db = await openIDB();
  if (!db) return;

  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const allItems = await idbGetAll(store);

  for (const item of allItems) {
    if (item.status !== 'pending') continue;
    try {
      const response = await fetch(item.url, {
        method: item.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined
      });
      if (response.ok) {
        item.status = 'synced';
        item.synced_at = Date.now();
      } else {
        item.retries = (item.retries || 0) + 1;
        if (item.retries >= 5) item.status = 'failed';
      }
    } catch (e) {
      item.retries = (item.retries || 0) + 1;
      if (item.retries >= 5) item.status = 'failed';
    }
    const updateTx = db.transaction('sync_queue', 'readwrite');
    updateTx.objectStore('sync_queue').put(item);
  }
  db.close();

  // Notify clients that sync is done
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'sync-complete' }));
}

function openIDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('dalil-raqqa-db', 3);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => resolve(null);
  });
}

function idbGetAll(store) {
  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

/**
 * Network-first strategy
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    return new Response(JSON.stringify({ error: 'غير متصل' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f0f0f0" width="200" height="200"/><text fill="#999" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">📷</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    return new Response('Offline', { status: 503 });
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
