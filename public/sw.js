const CACHE_NAME = 's40g-v1';
const OFFLINE_URL = '/offline';

// Static assets to cache on install
const PRECACHE_ASSETS = ['/icons/icon-192.png', '/icons/icon-512.png'];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache static assets
      await cache.addAll(PRECACHE_ASSETS);
      // Try to cache offline page (may fail in dev)
      try {
        await cache.add(OFFLINE_URL);
      } catch (e) {
        console.log('Offline page will be cached on first visit');
      }
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API routes - always fetch from network
  if (request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const networkResponse = await fetch(request);

        // Cache successful navigation responses
        if (networkResponse.ok && request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());

          // Also ensure offline page is cached
          const url = new URL(request.url);
          if (url.pathname !== OFFLINE_URL) {
            cache.add(OFFLINE_URL).catch(() => {});
          }
        }

        return networkResponse;
      } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        // For navigation requests, show offline page
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }

        // Nothing in cache, return error
        throw error;
      }
    })()
  );
});
