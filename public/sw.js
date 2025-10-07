/**
 * SERVICE WORKER
 *
 * This file is the heart of the PWA functionality. It controls caching strategies
 * and ensures the app works offline and loads the latest content.
 */

const CACHE_NAME = 'udhar-pay-cache-v1'; // Change version to force update
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo.png',
  // Add other critical static assets here if needed
];

// Install the service worker and cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Clean up old caches when a new service worker is activated
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
  // Take control of the page immediately
  return self.clients.claim();
});


// --- Network First Strategy ---
// This strategy ensures users always get the latest version of the app if they are online.
// It only falls back to the cache if the network request fails (i.e., they are offline).

self.addEventListener('fetch', (event) => {
  // We only apply this strategy to navigation requests (i.e., opening pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If the network request is successful, clone it and cache it for offline use.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If the network request fails, try to serve the page from the cache.
          return caches.match(event.request)
            .then((response) => {
              // If we find it in the cache, return it.
              // If not, you might want a generic offline fallback page here.
              return response || caches.match('/'); 
            });
        })
    );
  } else {
    // For non-navigation requests (images, CSS, JS), use a cache-first strategy for speed,
    // as these assets don't change as frequently as page content.
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Cache hit - return response
          if (response) {
            return response;
          }
          // Not in cache - fetch from network, then cache it for next time.
          return fetch(event.request).then(
            (response) => {
              if(!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              return response;
            }
          );
        })
    );
  }
});
