/**
 * Retirement worker for the former browser PWA cache.
 * It clears cached bundles and unregisters itself so Safari always loads Iron
 * Lab's current HTML and JavaScript directly from the network.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((client) => client.navigate(client.url)))
  );
});
