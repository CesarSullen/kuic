const CACHE_NAME = "kanban-static-v6.7.6";
const DATA_CACHE_NAME = "kanban-data-v5.1";

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
				keys
					.filter((k) => k !== CACHE_NAME && k !== DATA_CACHE_NAME)
					.map((k) => caches.delete(k)),
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
					return caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, networkResponse.clone());
						return networkResponse;
					});
				})
			);
		}),
	);
});

// Receive tasks from app
self.addEventListener("message", async (event) => {
	if (!event.data) return;

	if (event.data.type === "SYNC_TASKS") {
		const cache = await caches.open(DATA_CACHE_NAME);
		await cache.put(
			"./tasks-data",
			new Response(JSON.stringify({ tasks: event.data.tasks })),
		);
	}

	if (event.data.type === "CHECK_DEADLINES") {
		await checkTaskDeadlines();
	}
});

// Check deadlines & notify
async function checkTaskDeadlines() {
	try {
		const cache = await caches.open(DATA_CACHE_NAME);
		const response = await cache.match("./tasks-data");
		if (!response) return;

		const { tasks } = await response.json();
		const now = Date.now();

		let updated = false;

		for (const task of tasks) {
			if (
				task &&
				task.deadline &&
				!task.completed &&
				!task.notified &&
				new Date(task.deadline).getTime() <= now
			) {
				await self.registration.showNotification("Kuic Tasks", {
					body: task.title,
					icon: "./assets/icons/logo-no-bg.png",
					badge: "./assets/icons/logo-no-bg.png",
					tag: `task-${task.id}`,
					requireInteraction: true,
				});

				task.notified = true;
				updated = true;
			}
		}

		if (updated) {
			await cache.put("./tasks-data", new Response(JSON.stringify({ tasks })));
		}
	} catch (err) {
		console.error("Deadline check error:", err);
	}
}
