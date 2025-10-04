// The version of the cache.
const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `udhar-pay-cache-${CACHE_VERSION}`;

// A list of all the essential files to be cached.
const urlsToCache = [
  '/',
  '/offline.html',
  '/logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

// 1. Installation: Cache the essential files.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache files during install:', err);
      })
  );
});

// 2. Activation: Clean up old caches.
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


// 3. Fetch: Intercept network requests and serve from cache if possible.
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For navigation requests (loading a page), use a network-first strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If the network is available, cache the new page and return it.
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request.url, response.clone());
            return response;
          });
        })
        .catch(() => {
          // If the network fails, try to serve from cache, or show the offline page.
          return caches.match(event.request.url)
            .then(response => response || caches.match('/offline.html'));
        })
    );
    return;
  }

  // For all other assets (CSS, JS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the resource is in the cache, return it.
        if (response) {
          return response;
        }

        // If not in cache, fetch from the network, cache it, and then return it.
        return fetch(event.request).then(
          (networkResponse) => {
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
          }
        );
      })
      .catch(() => {
          // If both cache and network fail (for non-navigation requests),
          // we can optionally return a placeholder for images, etc.
          // For now, we let the browser handle the error.
      })
  );
});


// Logic for handling background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-form-data') {
    event.waitUntil(syncFormData());
  }
});

async function syncFormData() {
  const db = await openDB();
  const transaction = db.transaction(['submissions'], 'readonly');
  const store = transaction.objectStore('submissions');
  const submissions = await getAllFromStore(store);

  for (const submission of submissions) {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: submission.formData }),
      });

      if (response.ok) {
        const deleteTransaction = db.transaction(['submissions'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('submissions');
        deleteStore.delete(submission.id);
      }
    } catch (error) {
      console.error('Failed to sync submission:', submission.id, error);
      // If one fails, we stop and try again on the next sync event.
      break; 
    }
  }
}

// IndexedDB Helper Functions
function openDB() {
    return new Promise((resolve, reject) => {
        const request = self.indexedDB.open('offline-first-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as any).result;
            if (!db.objectStoreNames.contains('submissions')) {
                db.createObjectStore('submissions', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function getAllFromStore(store: any) {
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}
