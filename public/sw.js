const CACHE_NAME = 'reading-tracker-v2';
const API_CACHE = 'reading-tracker-api-v1';
const STATIC_ASSETS = [
  '/',
  '/books',
  '/notes',
  '/reports',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
];

// Read-only API endpoints that are safe to serve stale-while-revalidate.
// Anything auth-sensitive or write-heavy stays network-only.
const CACHEABLE_API_PREFIXES = [
  '/api/books',
  '/api/notes',
  '/api/stats',
  '/api/goals',
  '/api/reports',
];

function isCacheableApi(url) {
  return CACHEABLE_API_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(prefix + '/')
  );
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const keep = [CACHE_NAME, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !keep.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Stale-while-revalidate for read-only API GETs: serve cached immediately,
// refresh the cache in the background. Falls back to cache when offline.
function staleWhileRevalidate(request) {
  return caches.open(API_CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
}

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Same-origin read-only API: stale-while-revalidate (instant on mobile,
  // works offline); all other API calls stay network-only.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    if (isCacheableApi(url)) {
      event.respondWith(staleWhileRevalidate(event.request));
    }
    return;
  }

  // Pages/static assets: network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('Offline', { status: 503 });
        });
      })
  );
});
