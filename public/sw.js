const CACHE_NAME = 'udhar-pay-cache-v1';
const APP_SHELL_URLS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
  // Add other critical shell assets here if needed
];

// 1. Install the service worker and cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch(err => {
        console.error("App Shell caching failed: ", err);
      })
  );
});

// 2. Activate the service worker and clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // CRITICAL FIX: Never cache Firebase Firestore/Auth API calls.
  // Always go to the network for these to ensure live data.
  if (requestUrl.hostname.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For other requests (app shell, static assets), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the request is in the cache, return it.
        if (response) {
          return response;
        }

        // Otherwise, fetch it from the network, cache it, and return it.
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone the response because it's a stream and can only be consumed once.
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        });
      })
      .catch(() => {
        // If both cache and network fail, you can provide a generic fallback
        // This is optional and depends on your app's needs.
        // For example, return an offline page for navigation requests.
      })
  );
});
