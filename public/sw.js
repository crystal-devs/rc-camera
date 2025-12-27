const CACHE_NAME = 'rc-media-cache-v1';

// Add whichever assets you want to pre-cache here:
const PRECACHE_ASSETS = [
  // '/offline',
  // '/icon-192x192.png',
  // '/icon-512x512.png', 
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            // console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Cache-First Strategy for S3 Images
  if (url.hostname === 'rc-media-bucket.s3.ap-south-1.amazonaws.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response immediately
            return cachedResponse;
          }

          // Fetch from network, cache it, and return
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate for Other Images (Optional but good for PWA)
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Default: Network Only for everything else (APIs, HTML, etc.)
  // We do NOT want to cache API calls or HTML heavily to avoid stale app state
  // event.respondWith(fetch(event.request)); 
});
