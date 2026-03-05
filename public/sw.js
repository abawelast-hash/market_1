/**
 * Service Worker - دليل الرقة
 * Offline-first strategy for Syrian internet conditions
 */

const CACHE_NAME = 'dalil-raqqa-v1';
const STATIC_CACHE = 'dalil-static-v1';
const API_CACHE = 'dalil-api-v1';
const IMAGE_CACHE = 'dalil-images-v1';

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
  '/js/pages.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
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

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Strategy based on request type
  if (url.pathname.startsWith('/api/')) {
    // API requests: Network-first, fallback to cache
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (
    request.destination === 'image' || 
    url.pathname.endsWith('.webp') || 
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.png')
  ) {
    // Images: Cache-first (images don't change often)
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/')) {
    // Static assets: Cache-first
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else {
    // HTML/other: Network-first for fresh content
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

/**
 * Network-first strategy
 * Try network, fall back to cache, respond
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
    
    // If it's a navigation request, return the cached index.html
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
 * Try cache, fall back to network
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
    // Return a placeholder for images
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
