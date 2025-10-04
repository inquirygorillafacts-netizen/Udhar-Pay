// This is a basic service worker that enables offline access and caching.

const CACHE_NAME = 'udhar-pay-cache-v1';
const OFFLINE_URL = 'offline.html';

// Add the files you want to cache to this array
const urlsToCache = [
  '/',
  '/offline.html',
  '/logo.png',
  '/favicon.ico',
  '/styles/globals.css', // Adjust this path if your global css is elsewhere
];

// Install the service worker and cache the static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add all the assets to the cache
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to open cache or cache some files:', err);
      })
  );
});


// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request to use it in the cache and for the network request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
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
      .catch(() => {
         // If both the cache and network fail, show the offline fallback page.
         // This is especially useful for navigation requests (i.e., for different HTML pages).
         if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
         }
      })
  );
});


// Update the service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});