const CACHE_NAME = 'openPress-pwa-cache-v6';

// Keep this list intentionally small and limited to files that are expected at
// the site root on S3. Missing files should not prevent the service worker from
// installing, because a failed install means Lighthouse/App Store PWA checks will
// report that the page does not have a working service worker.
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/openpress-logo-full-nobg-trim.png',
  '/pwa-icon-192-v4.png',
  '/pwa-icon-512-v4.png'
];

const cacheCoreAsset = async (cache, url) => {
  try {
    const response = await fetch(url, { cache: 'reload' });

    if (response && response.ok) {
      await cache.put(url, response);
    }
  } catch (error) {
    // Do not fail the install if one optional asset is unavailable on S3.
    console.warn('[ServiceWorker] Core asset was not cached:', url, error);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(
      CORE_ASSETS.map((url) => cacheCoreAsset(cache, url))
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME) {
          return caches.delete(cacheName);
        }

        return undefined;
      })
    ))
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
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');
  const isNavigationRequest = event.request.mode === 'navigate' || acceptsHtml;

  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseForCache = response.clone();
          event.waitUntil(cacheSuccessfulSameOriginResponse(event.request, responseForCache));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }

          const rootFallback = await caches.match('/');
          if (rootFallback) {
            return rootFallback;
          }

          const homeFallback = await caches.match('/home.html');
          return homeFallback || Response.error();
        })
    );
    return;
  }

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
