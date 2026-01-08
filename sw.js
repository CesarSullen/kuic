const CACHE_NAME = "kanban-static-v5";
const DATA_CACHE_NAME = "kanban-data-v2";

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

// Receive updated task list from main
self.addEventListener("message", async (event) => {
	if (event.data && event.data.type === "SYNC_TASKS") {
		const cache = await caches.open(DATA_CACHE_NAME);

		const existingResponse = await cache.match("./tasks-data");
		let existingTasks = [];

		if (existingResponse) {
			const existingData = await existingResponse.json();
			existingTasks = existingData.tasks || [];
		}

		// Merge tasks
		const mergedTasks = event.data.tasks.map((task) => {
			const cachedTask = existingTasks.find((t) => t.id === task.id);
			if (cachedTask && cachedTask.notified) {
				return { ...task, notified: true };
			}
			return task;
		});

		await cache.put(
			"./tasks-data",
			new Response(JSON.stringify({ tasks: mergedTasks }))
		);
	}
});

// Check deadlines every minute
setInterval(async () => {
	try {
		const cache = await caches.open(DATA_CACHE_NAME);
		const response = await cache.match("./tasks-data");
		if (!response) return;

		const fullData = await response.json();
		const tasks = fullData.tasks;
		const now = Date.now();

		let updated = false;

		// Loop through all tasks and notify if deadline reached
		for (const task of tasks) {
			if (task && task.deadline && !task.completed && !task.notified) {
				if (new Date(task.deadline).getTime() <= now) {
					try {
						await self.registration.showNotification("Kuic Tasks", {
							body: task.title,
							icon: "./assets/icons/logo-no-bg.png",
							badge: "./assets/icons/logo-no-bg.png",
							tag: `task-${task.id}`,
							renotify: false,
							requireInteraction: true,
						});

						task.notified = true;
						updated = true;
					} catch (notifyErr) {
						// Notification skipped silently (normal when no tab is open)
						// No action needed
					}
				}
			}
		}

		// Save all tasks back to cache if any were updated
		if (updated) {
			await cache.put("./tasks-data", new Response(JSON.stringify({ tasks })));
		}
	} catch (err) {
		console.error("Error checking deadlines:", err);
	}
}, 60000);
