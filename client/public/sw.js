/**
 * Iron Lab — Service Worker
 * Provides offline shell caching and background sync for PWA.
 */
const CACHE_NAME = "ironlab-v1";
const STATIC_ASSETS = ["/", "/login", "/manifest.json"];

// Install: cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always go to network for API calls
  if (url.pathname.startsWith("/api/")) return;

  // For navigation requests, try network then fall back to cached shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((r) => r ?? fetch(event.request))
      )
    );
    return;
  }

  // For other requests: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      });
      return cached ?? networkFetch;
    })
  );
});

// Push notifications (rest timer alerts)
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Iron Lab", {
      body: data.body ?? "Time to lift!",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "ironlab-timer",
      renotify: true,
    })
  );
});
