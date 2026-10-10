// Cache version
const CACHE_NAME = "kuic-1.0.2";

const STATIC_ASSETS = [
  // Page
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./js/supabase-config.js",
  "./manifest.json",

  // Assets
  "./assets/icons/check-bold.svg",
  "./assets/icons/check-circle-fill.svg",
  "./assets/icons/clock-countdown-fill.svg",
  "./assets/icons/cloud-arrow-down-fill.svg",
  "./assets/icons/cloud-arrow-up-fill.svg",
  "./assets/icons/logo-no-bg.png",
  "./assets/icons/logo.png",
  "./assets/icons/plus.svg",
  "./assets/icons/search.svg",
  "./assets/icons/gear-six.svg",
  "./assets/icons/caret-left.svg",
  "./assets/icons/caret-right.svg",
  "./assets/icons/dots-six-vertical.svg",
  "./assets/icons/x-circle-fill.svg",
  "./assets/icons/trash.svg",

  // Screenshots
  "./assets/screenshots/mobile-1.png",
  "./assets/screenshots/mobile-2.png",
  "./assets/screenshots/desktop-1.png",

  // Typography
  "./typography/GoogleSans-Regular.ttf",
  "./typography/GoogleSans-Bold.ttf",
  "./typography/Lora-Regular.ttf",
  "./typography/Lora-Bold.ttf",
];

// Install
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      );

      await self.clients.claim();
    })(),
  );
});

// Fetch (cache-first)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((networkResponse) => {
          // Cache only successful responses
          if (!networkResponse.ok) return networkResponse;

          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
      );
    }),
  );
});
