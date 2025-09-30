const CACHE_NAME = 'offline-first-v2';

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    })()
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-form-data') {
    console.log('[Service Worker] Sync event triggered for tag: sync-form-data');
    event.waitUntil(syncFormData());
  }
});

async function syncFormData() {
  console.log('[Service Worker] Starting form data sync...');
  
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('offline-first-db', 1);
      request.onerror = () => reject("Error opening DB for sync");
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('submissions')) {
          db.createObjectStore('submissions', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  };

  try {
    const db = await openDB();
    const transaction = db.transaction(['submissions'], 'readwrite');
    const store = transaction.objectStore('submissions');
    const submissions = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject("Error getting all submissions for sync");
    });

    if (submissions.length === 0) {
      console.log('[Service Worker] No submissions to sync.');
      return;
    }

    console.log(`[Service Worker] Found ${submissions.length} submissions to sync.`);

    const syncPromises = submissions.map(async (submission) => {
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formData: submission.formData }),
        });

        if (response.ok) {
          console.log(`[Service Worker] Successfully synced submission ID: ${submission.id}`);
          const deleteTransaction = db.transaction(['submissions'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('submissions');
          deleteStore.delete(submission.id);
        } else {
          console.error(`[Service Worker] Failed to sync submission ID: ${submission.id}`, await response.text());
        }
      } catch (error) {
        console.error(`[Service Worker] Network error syncing submission ID: ${submission.id}`, error);
      }
    });

    await Promise.all(syncPromises);
    console.log('[Service Worker] Sync process finished.');
  } catch (error) {
    console.error('[Service Worker] Error during sync process:', error);
  }
}
