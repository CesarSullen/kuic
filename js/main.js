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
		deadlinePlaceholder: "Due date (optional)",
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
		deadlinePlaceholder: "Fecha límite (opcional)",
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

	const pendingEl = document.querySelector(".tasks-pending");
	const completedEl = document.querySelector(".tasks-completed");

	if (pendingEl)
		pendingEl.textContent = `${texts.pendingTasks}: ${pendingCount}`;
	if (completedEl)
		completedEl.textContent = `${texts.completedTasks}: ${completedCount}`;

	console.log("pending: " + pendingCount + ", completed: " + completedCount);
}

// Update static HTML buttons with current language
window.addEventListener("load", () => {
	const newColumnBtn = document.querySelector(".btn");
	if (newColumnBtn) {
		newColumnBtn.textContent = texts.newColumn;
	}
});

// Generate unique IDs
function generateId(prefix = "id") {
	return `${prefix}-${Date.now()}`;
}

// Save/load data to localStorage
function saveToStorage() {
	localStorage.setItem("columns", JSON.stringify(columnList));
	localStorage.setItem("tasks", JSON.stringify(taskList));
	syncTasksToSW();
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
	card.draggable = true;

	if (task.completed) card.classList.add("completed");

	const title = document.createElement("p");
	title.classList.add("task-title");
	title.contentEditable = true;
	title.textContent = task.title;
	title.addEventListener("input", () => {
		task.title = title.textContent.trimEnd();
		saveToStorage();
	});

	// Deadlines
	const deadlineInput = document.createElement("input");

	deadlineInput.type = "text";
	deadlineInput.classList.add("deadline-input");
	deadlineInput.placeholder = texts.deadlinePlaceholder;

	if (task.deadline) {
		deadlineInput.value = task.deadline.slice(0, 16); // YYYY-MM-DDTHH:MM
		deadlineInput.type = "datetime-local";
	}

	deadlineInput.addEventListener("focus", async () => {
		if (deadlineInput.type !== "datetime-local") {
			deadlineInput.type = "datetime-local";
			deadlineInput.focus();
		}

		await notificationPermission();
	});

	deadlineInput.addEventListener("blur", () => {
		if (!deadlineInput.value) {
			deadlineInput.type = "text";
		}
	});

	deadlineInput.addEventListener("change", () => {
		if (deadlineInput.type === "datetime-local" && deadlineInput.value) {
			task.deadline = deadlineInput.value + ":00";
		}
		saveToStorage();
		renderBoard();
	});

	function updateDeadlineColor() {
		const deadlineTime = new Date(task.deadline).getTime();
		const now = Date.now();

		if (deadlineTime < now) {
			deadlineInput.style.color = "red";
			deadlineInput.style.borderColor = "red";
		}
	}

	updateDeadlineColor();

	const actionRow = document.createElement("div");
	actionRow.classList.add("action-row");

	// Complete button
	const completeBtn = document.createElement("button");
	completeBtn.classList.add("action-btn", "complete-btn");

	if (task.completed) {
		card.classList.add("completed");
		completeBtn.textContent = texts.completed;
	} else {
		card.classList.remove("completed");
		completeBtn.textContent = texts.complete;
	}

	completeBtn.addEventListener("click", () => {
		task.completed = !task.completed;
		reorderTasks(task);
		saveToStorage();
		renderBoard();
	});

	// Delete button
	const deleteBtn = document.createElement("button");
	deleteBtn.classList.add("action-btn", "delete-btn");
	deleteBtn.textContent = `${texts.delete}`;
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

	actionRow.append(completeBtn, deleteBtn);
	card.append(title, deadlineInput, actionRow);
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
					`.task-card[data-task-id="${lastCreatedTaskId}"] .task-title`
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
	initDragAndDrop();
}

// Drag and drop
function initDragAndDrop() {
	const columns = document.querySelectorAll(".column-body");
	let draggedCard = null;

	document.querySelectorAll(".task-card").forEach((card) => {
		card.addEventListener("dragstart", () => {
			draggedCard = card;
			card.style.opacity = "0.5";
		});
		card.addEventListener("dragend", () => {
			draggedCard = null;
			card.style.opacity = "1";
		});
	});

	columns.forEach((column) => {
		column.addEventListener("dragover", (e) => {
			e.preventDefault();
			column.style.background = "rgba(255, 255, 255, 0.1)";
		});
		column.addEventListener("dragleave", () => {
			column.style.background = "transparent";
		});
		column.addEventListener("drop", () => {
			if (!draggedCard) return;
			const newColumnId = column.dataset.columnId;
			const taskId = draggedCard.dataset.taskId;
			const task = taskList.find((t) => t.id === taskId);
			if (task) {
				task.columnId = newColumnId;
				renderBoard();
				saveToStorage();
			}
			column.style.background = "transparent";
		});
	});
}

// Event for adding new column
document.querySelector(".btn").addEventListener("click", () => {
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

// Load data and render on page load
loadFromStorage();
renderBoard();
syncTasksToSW();

// Service Worker Implementation
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("./sw.js");
	});
}

function syncTasksToSW() {
	if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			type: "SYNC_TASKS",
			tasks: taskList,
		});
	}
}
