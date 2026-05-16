/// <reference lib="webworker" />
// Custom KitchenLovers service worker. Built by vite-plugin-pwa (injectManifest).
// Handles: precache via Workbox, runtime caching for images/api, push notifications.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

const sw = /** @type {ServiceWorkerGlobalScope} */ (self);

// Workbox injectManifest plugin replaces `self.__WB_MANIFEST` literally — keep this exact token.
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Explicit no-op fetch listener — some Chrome installability checks look for a
// top-level fetch handler, separate from Workbox's internal routing.
sw.addEventListener('fetch', () => {});

// Navigation fallback for SPA routes
registerRoute(new NavigationRoute(async ({ event }) => {
  try { return await fetch(event.request); }
  catch { return caches.match('/index.html'); }
}));

// Cloudinary images — CacheFirst, long TTL (URLs are content-addressed)
registerRoute(
  ({ url }) => url.hostname.includes('res.cloudinary.com'),
  new CacheFirst({
    cacheName: 'cloudinary-images',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// Local /uploads — NetworkFirst so stale 404s are never served from cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads'),
  new NetworkFirst({ cacheName: 'local-uploads' })
);

// Other images (icons, brand assets, etc.)
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    !url.hostname.includes('res.cloudinary.com') &&
    !url.pathname.startsWith('/uploads'),
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// Public API caching (products / categories / banners)
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/products') ||
    url.pathname.startsWith('/api/categories') ||
    url.pathname.startsWith('/api/banners'),
  new StaleWhileRevalidate({
    cacheName: 'api-public',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 })],
  })
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
