/**
 * Iron Lab — Service Worker
 * Network-first strategy: always tries network, falls back to cache.
 * Bumping CACHE_VERSION forces all clients to update immediately.
 */
const CACHE_VERSION = "ironlab-v8";

// Install: skip waiting immediately so new SW takes over right away
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate: delete ALL old caches and claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for everything
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always bypass SW for API calls
  if (url.pathname.startsWith("/api/")) return;

  // Network-first: try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET responses
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached ?? fetch(event.request))
      )
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
