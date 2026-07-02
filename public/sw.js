/*
 * The Last Line — minimal, conservative service worker.
 * Design goals on a live auth + payment site:
 *   - NEVER cache HTML pages, API, auth or anything cross-origin (Supabase,
 *     Stripe, Turnstile) → no stale logged-in pages, no broken payments.
 *   - Cache only content-hashed static assets + images/fonts (safe forever).
 *   - Serve an offline fallback page when navigation fails with no network.
 * Bump VERSION to invalidate the static cache on a new deploy.
 */
const VERSION = "v1";
const STATIC_CACHE = `tll-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const STATIC_ASSET = /\.(?:png|jpg|jpeg|svg|webp|avif|ico|woff2?|css|js)$/;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only — let Supabase / Stripe / Turnstile / any 3rd party pass.
  if (url.origin !== self.location.origin) return;

  // Never touch API or auth endpoints.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Static, content-hashed or immutable assets: cache-first + refresh.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/favicons/") ||
    url.pathname.startsWith("/logos/") ||
    url.pathname.startsWith("/og/") ||
    url.pathname.startsWith("/fonts/") ||
    STATIC_ASSET.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Page navigations: always network-first (never cache HTML → no stale auth
  // state), with the offline page as a last resort.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
  }
});
