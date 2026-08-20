/// <reference lib="webworker" />
// Custom KitchenLovers service worker. Built by vite-plugin-pwa (injectManifest).
// Handles: precache via Workbox, runtime caching for images/api, push notifications.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

const sw = /** @type {ServiceWorkerGlobalScope} */ (self);

// Workbox injectManifest plugin replaces `self.__WB_MANIFEST` literally — keep this exact token.
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Activate new SW immediately so users see fresh content on first visit after deploy,
// no manual refresh required. Pairs with cleanupOutdatedCaches() above to evict stale precache.
sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (event) => event.waitUntil(sw.clients.claim()));

// Explicit no-op fetch listener — some Chrome installability checks look for a
// top-level fetch handler, separate from Workbox's internal routing.
sw.addEventListener('fetch', () => {});

// Navigation fallback for SPA routes
registerRoute(new NavigationRoute(async ({ event }) => {
  try { return await fetch(event.request); }
  catch { return caches.match('/index.html'); }
}));

// When a Workbox strategy throws, the FetchEvent's respondWith() rejects and the
// browser reports a hard network error — a permanently broken <img> with no retry.
// Wrap every strategy so any handler failure (CSP, quota, cache corruption, offline)
// degrades to a plain network request instead of a broken response.
// `transform` optionally rewrites the request the strategy sees; the network fallback
// always replays the ORIGINAL request so a rewrite can never be the thing that fails.
const failOpen = (strategy, transform) => async (params) => {
  try {
    const request = transform ? transform(params.request) : params.request;
    const response = await strategy.handle({ ...params, request });
    if (response) return response;
  } catch {
    // fall through to the network below
  }
  return fetch(params.request);
};

// Cross-origin <img> requests are `no-cors`, which yields an *opaque* response:
// status 0, indistinguishable from a 404 or a 500. Caching those poisons the cache
// with broken images for the full TTL. Cloudinary sends `Access-Control-Allow-Origin: *`,
// so re-issue the request as CORS to get a real, inspectable status we can trust.
const asCors = (request) => new Request(request.url, { mode: 'cors', credentials: 'omit' });

// Cloudinary images — CacheFirst, long TTL (URLs are content-addressed & versioned).
// Only genuine 200s are cached; anything else falls through to the network next time.
const cloudinaryStrategy = new CacheFirst({
  cacheName: 'cloudinary-images',
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
  ],
});

registerRoute(
  ({ url }) => url.hostname.includes('res.cloudinary.com'),
  failOpen(cloudinaryStrategy, asCors)
);

// Local /uploads — NetworkFirst so stale 404s are never served from cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads'),
  failOpen(new NetworkFirst({ cacheName: 'local-uploads' }))
);

// Other images (icons, brand assets, etc.)
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    !url.hostname.includes('res.cloudinary.com') &&
    !url.pathname.startsWith('/uploads'),
  failOpen(
    new CacheFirst({
      cacheName: 'images',
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      ],
    })
  )
);

// Public API caching: NetworkFirst so the storefront always shows the latest
// products/categories/banners (with their current image URLs). Cache is only
// used as an offline fallback. StaleWhileRevalidate caused stale image refs
// to render on first visit, requiring a manual refresh.
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/products') ||
    url.pathname.startsWith('/api/categories') ||
    url.pathname.startsWith('/api/banners'),
  failOpen(
    new NetworkFirst({
      cacheName: 'api-public',
      networkTimeoutSeconds: 8,
      plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 })],
    })
  )
);

// --- Push notifications --------------------------------------------------

sw.addEventListener('push', (event) => {
  let payload = { title: 'KitchenLovers', body: 'You have a new update.' };
  if (event.data) {
    try { payload = { ...payload, ...event.data.json() }; }
    catch { payload.body = event.data.text(); }
  }
  const { title, body, url } = payload;

  event.waitUntil(
    sw.registration.showNotification(title, {
      body,
      icon: '/brand/logo.jpg',
      badge: '/brand/logo.jpg',
      data: { url: url || '/' },
      vibrate: [80, 40, 80],
      tag: 'kitchenlovers',
      renotify: true,
    })
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const all = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        client.navigate(targetUrl).catch(() => {});
        return client.focus();
      }
    }
    return sw.clients.openWindow(targetUrl);
  })());
});

// Allow the page to skip the waiting SW immediately
sw.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') sw.skipWaiting();
});
