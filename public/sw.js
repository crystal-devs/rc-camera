const CACHE_NAME = 'rc-media-cache-v2';

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
  // We rely on HTTP Cache-Control headers set by the backend for signed URLs.
  // This avoids Service Worker quota limits and signature validity issues.
});
