// Define a unique cache name for this version of the app.
// By changing the version number, we can ensure that the service worker updates
// and previous caches are cleared.
const CACHE_NAME = 'udhar-pay-cache-v1';

// A list of essential files to be pre-cached when the service worker is installed.
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
  // Add other critical assets here if needed, like main CSS or JS bundles.
  // Be mindful not to cache too much, as it can slow down the initial install.
];

// Event listener for the 'install' event.
// This is where we pre-cache the core assets of the app.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Event listener for the 'activate' event.
// This is where we clean up old, unused caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If a cache is found that is not in our whitelist, delete it.
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Event listener for the 'fetch' event.
// This is where we implement the "Network First, falling back to Cache" strategy.
self.addEventListener('fetch', (event) => {
  // We only want to intercept navigation requests (i.e., for HTML pages)
  // and other GET requests. We let other requests (like POST) pass through.
  if (event.request.method !== 'GET') {
    return;
  }

  // For Firebase and other API calls, always go to the network.
  // Never cache these to ensure data is always fresh.
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    // 1. Try to fetch the resource from the network.
    fetch(event.request)
      .then((networkResponse) => {
        // If the network request is successful, we should cache the new response.
        return caches.open(CACHE_NAME).then((cache) => {
          // Clone the response because a response can only be consumed once.
          cache.put(event.request, networkResponse.clone());
          // Return the fresh response from the network.
          return networkResponse;
        });
      })
      .catch(() => {
        // 2. If the network request fails (i.e., user is offline),
        // try to find a matching response in the cache.
        return caches.match(event.request).then((cachedResponse) => {
          // If a cached response is found, return it.
          // Otherwise, the request will fail, which is the expected behavior when offline
          // and the resource is not cached.
          return cachedResponse || Response.error();
        });
      })
  );
});

// Background Sync Logic
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-form-data') {
    event.waitUntil(syncFormData());
  }
});

async function syncFormData() {
  const db = await openDb();
  const transaction = db.transaction('submissions', 'readonly');
  const store = transaction.objectStore('submissions');
  const submissions = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!submissions || submissions.length === 0) {
    return;
  }

  for (const submission of submissions) {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (response.ok) {
        // If sync is successful, remove it from IndexedDB
        const deleteTransaction = db.transaction('submissions', 'readwrite');
        const deleteStore = deleteTransaction.objectStore('submissions');
        deleteStore.delete(submission.id);
      } else {
        console.error('Failed to sync submission:', submission.id, response.statusText);
      }
    } catch (error) {
      console.error('Error syncing submission:', submission.id, error);
      // If one fails, we stop and try again on the next sync event.
      return; 
    }
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('offline-first-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
