// Leerhuis XL — Service Worker
// Versie ophogen bij elke deploy om cache te verversen
const CACHE_NAME = "leerhuis-xl-v1";

// Bestanden die altijd offline beschikbaar moeten zijn
const STATIC_ASSETS = [
  "/",
  "/index.html",
];

// Installatie: statische bestanden cachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activatie: oude caches opruimen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: netwerk eerst, dan cache als fallback
self.addEventListener("fetch", (event) => {
  // Supabase API calls nooit cachen
  if (event.request.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Succesvolle responses ook in cache opslaan
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Geen internet: serveer vanuit cache
        return caches.match(event.request).then(
          (cached) => cached || caches.match("/index.html")
        );
      })
  );
});
