const CACHE_NAME = "kanban-static-v4.1";
const DATA_CACHE_NAME = "kanban-data-v1";

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

// Install: precache static assets
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
				keys
					.filter((k) => k !== CACHE_NAME && k !== DATA_CACHE_NAME)
					.map((k) => caches.delete(k))
			);
			await self.clients.claim();
		})()
	);
});

// Fetch: cache-first strategy for static assets
self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			return (
				cachedResponse ||
				fetch(event.request)
					.then((networkResponse) => {
						return caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, networkResponse.clone());
							return networkResponse;
						});
					})
					.catch(() => cachedResponse) // offline fallback
			);
		})
	);
});

// === DEADLINE NOTIFICATIONS ===

// Receive updated task list from main thread
self.addEventListener("message", async (event) => {
	if (event.data && event.data.type === "SYNC_TASKS") {
		const cache = await caches.open(DATA_CACHE_NAME);
		await cache.put(
			"../tasks-data",
			new Response(JSON.stringify({ tasks: event.data.tasks }))
		);
	}
});

// Check deadlines every minute
setInterval(async () => {
	try {
		const cache = await caches.open(DATA_CACHE_NAME);
		const response = await cache.match("./tasks-data");
		if (!response) return;

		let { tasks } = await response.json();
		const now = Date.now();

		// Detect user language
		let language = "en";
		const clients = await self.clients.matchAll();
		if (clients.length > 0) {
			language = clients[0]?.navigator?.language?.slice(0, 2) || "en";
		}
		const isSpanish = language === "es";

		let updated = false;

		tasks = tasks.filter(
			(task) => task && task.deadline && !task.completed && !task.notified
		);

		for (const task of tasks) {
			if (new Date(task.deadline).getTime() <= now) {
				try {
					await self.registration.showNotification(
						isSpanish ? "¡Tarea vencida!" : "Task overdue!",
						{
							body: task.title,
							icon: "./assets/icons/logo-no-bg.png",
							badge: "./assets/icons/logo-no-bg.png",
							tag: `task-${task.id}`,
							renotify: false,
							requireInteraction: false,
						}
					);

					task.notified = true;
					updated = true;
				} catch (notifyErr) {
					// Notification skipped silently (normal when no tab is open)
					// No action needed
				}
			}
		}

		if (updated) {
			const fullResponse = await cache.match("./tasks-data");
			if (fullResponse) {
				const fullData = await fullResponse.json();
				fullData.tasks = fullData.tasks.map((t) => {
					const notifiedTask = tasks.find((nt) => nt.id === t.id);
					if (notifiedTask) return notifiedTask;
					return t;
				});
				await cache.put("./tasks-data", new Response(JSON.stringify(fullData)));
			}
		}
	} catch (err) {
		console.error("Error checking deadlines:", err);
	}
}, 60000);
