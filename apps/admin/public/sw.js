const CACHE_NAME = 'openPress-pwa-cache-v7';

// Keep this list intentionally small — only files reliably served from the site root.
// Missing files should NOT prevent the service worker from installing, because a
// failed install means Lighthouse/App Store PWA checks will report no service worker.
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/openpress-logo-full-nobg-trim.png',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png'
];

const cacheCoreAsset = async (cache, url) => {
  try {
    const response = await fetch(url, { cache: 'reload' });
    if (response && response.ok) {
      await cache.put(url, response);
    }
  } catch (error) {
    // Do not fail the install if one optional asset is unavailable.
    console.warn('[ServiceWorker] Core asset was not cached:', url, error);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(CORE_ASSETS.map((url) => cacheCoreAsset(cache, url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

const cacheSuccessfulSameOriginResponse = async (request, responseForCache) => {
  if (!responseForCache || !responseForCache.ok || responseForCache.type !== 'basic') {
    return;
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, responseForCache);
};

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker entirely in local development or for Vite internals
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/node_modules/') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t')
  ) {
    return;
  }

  // Only handle GET requests from the same origin.
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');
  const isNavigationRequest = event.request.mode === 'navigate' || acceptsHtml;

  if (isNavigationRequest) {
    // Network-first for HTML pages: try fresh from network, fall back to cache.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseForCache = response.clone();
          event.waitUntil(cacheSuccessfulSameOriginResponse(event.request, responseForCache));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;

          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;

          return Response.error();
        })
    );
    return;
  }

  // Cache-first for static assets: serve from cache, update in background.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        const responseForCache = response.clone();
        event.waitUntil(cacheSuccessfulSameOriginResponse(event.request, responseForCache));
        return response;
      });
    })
  );
});