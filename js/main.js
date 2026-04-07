// Detect user language
const userLang = navigator.language || navigator.userLanguage;
const lang = userLang.slice(0, 2); // "es" or "en"

// i18n dictionary
const i18n = {
	en: {
		newColumn: "New list",
		pendingTasks: "Pending",
		completedTasks: "Completed",
		deleteColumn: "Delete this column? Tasks will be permanently deleted.",
		newTask: "New Task",
		complete: "Complete",
		delete: "Delete",
		completed: "Completed",
		deadlinePlaceholder: "Due date",
		import: "Import",
		export: "Export",
		exportSuccess: "Export complete",
		importSuccess: "Import complete",
		invalidFile: "Invalid file",
		fileReadError: "Error reading file: ",
	},
	es: {
		newColumn: "Nueva lista",
		pendingTasks: "Pendientes",
		completedTasks: "Completadas",
		deleteColumn:
			"¿Eliminar esta columna? Las tareas se eliminarán permanentemente.",
		newTask: "Nueva tarea",
		complete: "Completar",
		delete: "Eliminar",
		completed: "Completada",
		deadlinePlaceholder: "Fecha límite",
		import: "Importar",
		export: "Exportar",
		exportSuccess: "Exportación completa",
		importSuccess: "Importación completa",
		invalidFile: "Archivo inválido",
		fileReadError: "Error leyendo el archivo: ",
	},
};

// Select texts for current language
const texts = i18n[lang] || i18n.en;

// Data structures for columns and tasks
let columnList = [
	{ id: "pending", name: "PENDING" },
	{ id: "inprogress", name: "IN PROGRESS" },
	{ id: "completed", name: "COMPLETED" },
];

let taskList = [
	{
		id: "task1",
		title: "Review Q4 budget report",
		columnId: "pending",
		completed: false,
		deadline: "",
		notified: false,
	},
	{
		id: "task2",
		title: "Design new landing page",
		columnId: "inprogress",
		completed: false,
		deadline: "",
		notified: false,
	},
	{
		id: "task3",
		title: "Launch email campaign",
		columnId: "completed",
		completed: true,
		deadline: "",
		notified: false,
	},
];

let lastCreatedTaskId = null;

// Update task counters
function updateTaskCounters() {
	const pendingCount = taskList.filter((t) => !t.completed).length;
	const completedCount = taskList.filter((t) => t.completed).length;

	const pendingNumEl = document.querySelector(".tasks-pending-number");
	const completedNumEl = document.querySelector(".tasks-completed-number");

	if (pendingNumEl) pendingNumEl.textContent = pendingCount;
	if (completedNumEl) completedNumEl.textContent = completedCount;

	console.log("pending: " + pendingCount + ", completed: " + completedCount);
}

// Update static HTML buttons with current language
window.addEventListener("load", () => {
	const importBtnText = document.getElementById("importBtnText");
	const exportBtnText = document.getElementById("exportBtnText");

	if (importBtnText) importBtnText.textContent = texts.import;
	if (exportBtnText) exportBtnText.textContent = texts.export;
});

// Generate unique IDs
function generateId(prefix = "id") {
	return `${prefix}-${Date.now()}`;
}

// Save/load data to localStorage
function saveToStorage() {
	localStorage.setItem("columns", JSON.stringify(columnList));
	localStorage.setItem("tasks", JSON.stringify(taskList));
	syncTasksToSW(taskList);
}

function loadFromStorage() {
	const savedColumns = localStorage.getItem("columns");
	const savedTasks = localStorage.getItem("tasks");
	if (savedColumns) columnList = JSON.parse(savedColumns);
	if (savedTasks) taskList = JSON.parse(savedTasks);
}

// Reorder tasks when toggling completed state
function reorderTasks(task) {
	taskList = taskList.filter((t) => t.id !== task.id);
	if (task.completed) {
		taskList.push(task);
	} else {
		const index = taskList.findIndex((t) => t.columnId === task.columnId);
		if (index === -1) {
			taskList.push(task);
		} else {
			taskList.splice(index, 0, task);
		}
	}
}

// Create a task card element
function createTaskCard(task) {
	const card = document.createElement("div");
	card.classList.add("task-card", task.columnId);
	card.dataset.taskId = task.id;

	card.classList.toggle("completed", task.completed);

	// Container for center content (Title + Deadline)
	const contentWrapper = document.createElement("div");
	contentWrapper.classList.add("task-content-wrapper");

	const title = document.createElement("p");
	title.classList.add("task-title");
	title.contentEditable = true;
	title.textContent = task.title;
	title.addEventListener("input", () => {
		task.title = title.textContent.trimEnd();
		saveToStorage();
	});

	// Deadline
	const deadlineWrapper = document.createElement("div");
	deadlineWrapper.classList.add("deadline-wrapper");

	const deadlineView = document.createElement("span");
	deadlineView.classList.add("deadline-view");

	const deadlineInput = document.createElement("input");
	deadlineInput.type = "datetime-local";
	deadlineInput.classList.add("deadline-input");

	deadlineWrapper.append(deadlineView, deadlineInput);

	function formatDeadline(dateString) {
		if (!dateString) return "";

		const date = new Date(dateString);

		return new Intl.DateTimeFormat("default", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		}).format(date);
	}

	function updateDeadlineView() {
		deadlineView.classList.remove("placeholder", "expired");

		if (!task.deadline) {
			deadlineView.textContent = texts.deadlinePlaceholder;
			deadlineView.classList.add("placeholder");
			return;
		}

		deadlineView.textContent = formatDeadline(task.deadline);

		const deadlineTime = new Date(task.deadline).getTime();
		if (deadlineTime < Date.now()) {
			deadlineView.classList.add("expired");
		}
	}

	let initialDeadlineValue = "";
	const isMobile = "ontouchstart" in window;

	deadlineView.addEventListener("click", async () => {
		deadlineView.style.display = "none";
		deadlineInput.style.display = "inline-block";

		initialDeadlineValue = task.deadline || "";
		deadlineInput.value = initialDeadlineValue;

		deadlineInput.focus();

		if (deadlineInput.showPicker) {
			deadlineInput.showPicker();
		}

		await notificationPermission();
	});

	function saveDeadline() {
		if (deadlineInput.value === initialDeadlineValue) return;

		if (deadlineInput.value) {
			task.deadline = deadlineInput.value + ":00";
		} else {
			task.deadline = "";
		}

		saveToStorage();
		renderBoard();
	}

	if (isMobile) {
		deadlineInput.addEventListener("blur", saveDeadline);

		deadlineInput.addEventListener("change", () => {
			if (initialDeadlineValue && !deadlineInput.value) {
				saveDeadline();
			}
		});
	} else {
		deadlineInput.addEventListener("change", saveDeadline);
	}

	deadlineInput.addEventListener("blur", () => {
		deadlineInput.style.display = "none";
		deadlineView.style.display = "inline-block";
	});

	updateDeadlineView();

	contentWrapper.append(title, deadlineWrapper);

	// Complete button
	const completeBtn = document.createElement("button");
	completeBtn.classList.add("complete-btn-checkbox");

	if (task.completed) {
		const checkIcon = document.createElement("img");
		checkIcon.src = "./assets/icons/check-bold.svg";
		completeBtn.appendChild(checkIcon);
	}

	completeBtn.addEventListener("click", () => {
		task.completed = !task.completed;
		reorderTasks(task);
		saveToStorage();
		renderBoard();
	});

	// Delete button
	const deleteBtn = document.createElement("button");
	deleteBtn.classList.add("delete-btn-icon");
	const trashIcon = document.createElement("img");
	trashIcon.src = "./assets/icons/trash-duotone.svg";
	deleteBtn.appendChild(trashIcon);

	deleteBtn.addEventListener("click", () => {
		taskList = taskList.filter((t) => t.id !== task.id);
		saveToStorage();
		renderBoard();
	});

	// New task animation
	if (task.id === lastCreatedTaskId) {
		card.classList.add("is-new");
		requestAnimationFrame(() => {
			card.classList.remove("is-new");
		});
	}

	card.append(completeBtn, contentWrapper, deleteBtn);
	return card;
}

// Add a new task to a column
function addTaskToColumn(columnId) {
	const newTask = {
		id: generateId("task"),
		title: texts.newTask,
		columnId: columnId,
		completed: false,
		deadline: "",
		notified: false,
	};

	taskList.push(newTask);
	lastCreatedTaskId = newTask.id;

	renderBoard();
	saveToStorage();
}

// Delete a column
function deleteColumn(columnId) {
	if (!confirm(texts.deleteColumn)) return;

	taskList = taskList.filter((task) => task.columnId !== columnId);
	columnList = columnList.filter((col) => col.id !== columnId);

	renderBoard();
	saveToStorage();
}

// Render the board
function renderBoard() {
	const board = document.querySelector(".kanban-board");
	board.innerHTML = "";

	columnList.forEach((column) => {
		const section = document.createElement("section");
		section.classList.add("column", `${column.id}-column`);

		const header = document.createElement("div");
		header.classList.add("column-header");

		const title = document.createElement("h2");
		title.classList.add("column-title");
		title.contentEditable = true;
		title.textContent = column.name;
		title.addEventListener("input", () => {
			column.name = title.textContent.trimEnd();
			saveToStorage();
		});

		const plusIcon = document.createElement("img");
		plusIcon.src = "./assets/icons/plus.svg";
		plusIcon.classList.add("column-action");
		plusIcon.addEventListener("click", () => addTaskToColumn(column.id));

		const trashIcon = document.createElement("img");
		trashIcon.src = "./assets/icons/trash.svg";
		trashIcon.classList.add("column-action");
		trashIcon.addEventListener("click", () => deleteColumn(column.id));

		header.append(title, plusIcon, trashIcon);

		const body = document.createElement("div");
		body.classList.add("column-body");
		body.dataset.columnId = column.id;

		taskList
			.filter((task) => task.columnId === column.id)
			.forEach((task) => body.appendChild(createTaskCard(task)));

		section.append(header, body);
		board.appendChild(section);

		// Focus newly created task
		if (lastCreatedTaskId) {
			requestAnimationFrame(() => {
				const titleEl = document.querySelector(
					`.task-card[data-task-id="${lastCreatedTaskId}"] .task-title`,
				);
				if (!titleEl) return;

				titleEl.scrollIntoView({ behavior: "smooth", block: "center" });
				titleEl.focus({ preventScroll: true });

				const range = document.createRange();
				range.selectNodeContents(titleEl);
				range.collapse(false);

				const selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange(range);

				lastCreatedTaskId = null;
			});
		}
	});
	updateTaskCounters();
}

// Add a new column
document.getElementById("newColumnBtn").addEventListener("click", () => {
	const newId = generateId("col");
	const newName = prompt(texts.newColumn) || texts.newColumn;
	columnList.push({ id: newId, name: newName });
	renderBoard();
	saveToStorage();
});

// Notifications
async function notificationPermission() {
	if (Notification.permission === "granted") {
		return true;
	}
	if (Notification.permission === "denied") {
		const permission = await Notification.requestPermission();
		return permission === "granted";
	}
	if (Notification.permission === "default") {
		const permission = await Notification.requestPermission();
		return permission === "granted";
	}
	return false;
}

// Export & Import Data
function exportTasks() {
	const data = {
		columns: columnList,
		tasks: taskList,
	};

	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = "kuic_tasks.json";

	a.click();
	URL.revokeObjectURL(url);

	alert(texts.exportSuccess);
}

const importBtn = document.getElementById("importBtn");
const fileInput = document.getElementById("fileInput");

document.getElementById("importBtnText").textContent = texts.import;
document.getElementById("exportBtnText").textContent = texts.export;

importBtn.addEventListener("click", () => {
	fileInput.click();
});
function importTasks(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function (e) {
		try {
			const data = JSON.parse(e.target.result);

			if (!data.columns || !data.tasks) {
				alert(texts.invalidFile);
				return;
			}

			columnList = data.columns;
			taskList = data.tasks;

			saveToStorage();
			renderBoard();

			alert(texts.importSuccess);
		} catch (err) {
			alert(texts.fileReadError + err.message);
		}
	};
	reader.readAsText(file);
}

// Load data and render on page load
loadFromStorage();
renderBoard();
syncTasksToSW(taskList);

async function trackProjectActivity(projectName) {
	try {
		const { error } = await _supabase.rpc("increment_visit", {
			name_param: projectName,
		});

		if (error) throw error;
	} catch (err) {
		console.warn("Offline mode");
	}
}

trackProjectActivity("Kuic");

// Service Worker setup
if ("serviceWorker" in navigator) {
	navigator.serviceWorker
		.register("./sw.js")
		.then(() => navigator.serviceWorker.ready)
		.then((registration) => {
			if (registration.active) {
				registration.active.postMessage({
					type: "CHECK_DEADLINES",
				});
			}
		})
		.catch(console.error);
}

// Sync tasks to Service Worker
function syncTasksToSW(taskList) {
	if (!("serviceWorker" in navigator)) return;

	navigator.serviceWorker.ready.then((registration) => {
		if (registration.active) {
			registration.active.postMessage({
				type: "SYNC_TASKS",
				tasks: taskList,
			});
		}
	});
}
