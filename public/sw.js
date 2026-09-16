/* SATMAT PWA Service Worker
 *
 * Safe for Next.js content-hash builds:
 *  - `/_next/static/*` immutable chunks are NOT cached by the SW — their
 *    URL contains a content hash, so the browser's own HTTP cache handles
 *    them correctly. Cache-first for these caused stale chunks -> 404 /
 *    MIME-type ('text/plain') errors after every deploy.
 *  - Navigation is network-first with cache fallback for offline.
 *  - API calls are network-first with cache fallback (never throws).
 *  - Cache name is versioned and stale caches from older builds are purged
 *    on activate, so a cached HTML never points at chunks that no longer
 *    exist in the deployed build.
 */
const CACHE_NAME = 'satmat-v2';
const OFFLINE_URL = '/';

const PRECACHE = [
  '/',
  '/manifest.json',
  '/background.webp',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // Use individual fetches so a single failure (e.g. /manifest.json
        // 302 to vercel.com/sso-api on protected preview deployments) does
        // not abort the whole install. Each entry is fetched with
        // cache:'reload' to bypass HTTP cache and failures are ignored.
        Promise.allSettled(
          PRECACHE.map((url) =>
            cache.add(new Request(url, { cache: 'reload', credentials: 'same-origin' })).catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never intercept immutable `_next/static` chunks (content-hashed CSS/JS).
  // Served straight from the browser/network — prevents stale 404 + MIME errors.
  if (url.pathname.startsWith('/_next/static/')) return;

  // API: network-first, fallback to cache, then offline (never throw).
  //
  // PRIVACY: only PUBLIC, unauthenticated GET endpoints are ever cached.
  // Authenticated/private endpoints (/api/v1/wallet, /bids, /transactions,
  // /auth/*, /bank-details, /winnings, /referral, /notifications, /orders,
  // /admin/*, …) must NEVER be cached — the cache is shared storage that
  // survives logout and could serve one user's private data to another user
  // of a shared device, or paint stale balances after a fresh login.
  // Private calls go straight to the network and fail honestly offline.
  const PUBLIC_API_PREFIXES = [
    '/api/v1/markets',
    '/api/v1/results',
    '/api/v1/charts',
    '/api/v1/notices',
    '/api/v1/game-rates',
    '/api/v1/game-types',
    '/api/v1/how-to-play',
    '/api/v1/stats',
    '/api/v1/lucky-number',
    '/api/v1/server-time',
  ];
  if (url.pathname.startsWith('/api/')) {
    const isPublicGet =
      PUBLIC_API_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
    if (!isPublicGet) return; // private API: never intercept, never cache
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached || Response.json({ error: 'offline' }, { status: 503 }))
        )
    );
    return;
  }

  // Navigation: network-first, fallback to cache, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Other static assets (manifest, icons, fonts): stale-while-revalidate so
  // the latest is always fetched from the network in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
