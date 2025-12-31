const CACHE_NAME = "kanban-static-v3.1";
const STATIC_ASSETS = [
	"./",
	"./index.html",
	"./css/style.css",
	"./js/main.js",
	"./manifest.json",
	"./assets/icons/logo-no-bg.png",
	"./assets/icons/plus.svg",
	"./assets/icons/clock-countdown-fill.svg",
	"./assets/icons/check-circle-fill.svg",
	"./assets/icons/trash.svg",
];

// Install: precache
self.addEventListener("install", (event) => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS);
		})
	);
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
			);
			await self.clients.claim();
		})()
	);
});

// Fetch: cache-first strategy
self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			return (
				cachedResponse ||
				fetch(event.request).then((networkResponse) => {
					return caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, networkResponse.clone());
						return networkResponse;
					});
				})
			);
		})
	);
});
