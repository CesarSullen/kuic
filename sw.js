// Cache version
const CACHE_NAME = "kuic-1.0.4";

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
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
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
  "./assets/screenshots/desktop-wide.png",

  // Typography
  "./typography/GoogleSans-Regular.ttf",
  "./typography/GoogleSans-Bold.ttf",
  "./typography/Lora-Regular.ttf",
  "./typography/Lora-Bold.ttf",
];

// Max time to wait for the network before giving up
const NETWORK_TIMEOUT = 6000;

// Core files needed to render the app: if these fail, the install fails
const CORE_ASSETS = STATIC_ASSETS.slice(0, 6);

// Install
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);

      // The rest is best effort, one missing file must not block the update
      await Promise.allSettled(
        STATIC_ASSETS.slice(CORE_ASSETS.length).map((url) => cache.add(url)),
      );
    })(),
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

// Fetch with a timeout so a hanging connection never blocks the app
async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Fetch (cache-first, same-origin only)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Never touch third-party requests (CDN scripts, Supabase...)
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      // ignoreSearch lets "./?action=new" and share links open from cache
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const response = await fetchWithTimeout(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        // Offline or too slow: fall back to the app shell for page loads
        if (request.mode === "navigate") {
          const shell = await caches.match("./index.html");
          if (shell) return shell;
        }
        return Response.error();
      }
    })(),
  );
});
