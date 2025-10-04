// Define a version for your cache
const CACHE_VERSION = 1;
const CACHE_NAME = `udhar-pay-cache-v${CACHE_VERSION}`;

// List of files to cache on install
const urlsToCache = [
  '/',
  '/offline.html',
  '/logo.png',
  '/manifest.json',
  '/favicon.ico',
  // Add other critical assets like CSS, JS, and main images here
  // Be careful not to cache everything, only the essential shell of your app
];

// Install the service worker and cache the essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: serve from cache first, then network
self.addEventListener('fetch', (event) => {
    // We only want to handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If we found a match in the cache, return it
        if (response) {
          return response;
        }

        // Otherwise, fetch from the network
        return fetch(event.request).then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
                .then((cache) => {
                    // We don't want to cache API calls or Firebase auth requests
                    if (!event.request.url.includes('/api/') && !event.request.url.includes('firebase')) {
                         cache.put(event.request, responseToCache);
                    }
                });

            return networkResponse;
        }).catch(() => {
            // If the network request fails, and we didn't have a cache match,
            // show the offline page for navigation requests.
            if (event.request.mode === 'navigate') {
                 return caches.match('/offline.html');
            }
        });
      })
  );
});

// Sync event for background data synchronization
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-form-data') {
        event.waitUntil(syncFormData());
    }
});


async function syncFormData() {
    // This logic needs to be implemented:
    // 1. Open IndexedDB
    // 2. Get all pending submissions
    // 3. Send them to the server via fetch POST request to '/api/sync'
    // 4. If successful, clear the submissions from IndexedDB
    console.log('Sync event fired for sync-form-data');
    // Actual implementation would involve IndexedDB and fetch calls.
}
