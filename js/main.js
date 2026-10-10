// Default texts
const DEFAULT_TASK_TITLE = "Nueva tarea";
const DEFAULT_COLUMN_NAME = "Nueva lista";

// Delay before a completed task moves
const REORDER_DELAY = 600;

// Main elements
const board = document.querySelector(".task-board");
const listTabs = document.getElementById("listTabs");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const statTiles = document.querySelectorAll(".task-stat");

// Default data for first-time users
let columnList = [
	{ id: "pending", name: "PENDIENTES" },
	{ id: "inprogress", name: "EN PROGRESO" },
	{ id: "completed", name: "COMPLETADAS" },
];

let taskList = [
	{
		id: "task1",
		title: "Revisar el informe de presupuesto",
		columnId: "pending",
		completed: false,
	},
	{
		id: "task2",
		title: "Diseñar la nueva página de inicio",
		columnId: "inprogress",
		completed: false,
	},
	{
		id: "task3",
		title: "Lanzar la campaña de correo",
		columnId: "completed",
		completed: true,
	},
];

// View state (not saved)
let searchQuery = "";
let filterMode = "all";
let activeColumnId = null;
let scrollingToId = null;
let lastCreatedTaskId = null;

// Closer of the swiped-open card
let closeOpenCard = null;

// Reorder timers by task id
const reorderTimers = new Map();

// Update task counters
function updateTaskCounters() {
	const pendingCount = taskList.filter((t) => !t.completed).length;
	const completedCount = taskList.filter((t) => t.completed).length;

	document.querySelector(".tasks-pending-number").textContent = pendingCount;
	document.querySelector(".tasks-completed-number").textContent = completedCount;
}

// Generate unique IDs
function generateId() {
	if (crypto.randomUUID) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Save data to localStorage
function saveToStorage() {
	localStorage.setItem("columns", JSON.stringify(columnList));
	localStorage.setItem("tasks", JSON.stringify(taskList));
}

// Load data from localStorage
function loadFromStorage() {
	try {
		const savedColumns = localStorage.getItem("columns");
		const savedTasks = localStorage.getItem("tasks");
		if (savedColumns) columnList = JSON.parse(savedColumns);
		if (savedTasks) taskList = JSON.parse(savedTasks);
	} catch (err) {
		console.error("Could not read saved data:", err);
	}
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

// Normalize text for searching
function normalizeText(text) {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

// Check if a search or filter is active
function isFiltering() {
	return searchQuery !== "" || filterMode !== "all";
}

// Get the visible tasks of a column
function getVisibleTasks(columnId) {
	return taskList.filter((task) => {
		if (task.columnId !== columnId) return false;
		if (filterMode === "pending" && task.completed) return false;
		if (filterMode === "completed" && !task.completed) return false;
		return !searchQuery || normalizeText(task.title).includes(searchQuery);
	});
}

// Highlight the active filter tile
function updateFilterUI() {
	statTiles.forEach((tile) => {
		tile.classList.toggle("active", tile.dataset.filter === filterMode);
	});
}

// Clear search and filter
function resetViewFilters() {
	searchQuery = "";
	filterMode = "all";
	searchInput.value = "";
	searchClear.hidden = true;
	updateFilterUI();
}

// Close editing with Enter and restore default if empty
function setupEditableText(element, defaultText, onSave) {
	element.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			element.blur();
		}
	});

	element.addEventListener("blur", () => {
		const value = element.textContent.trim() || defaultText;
		element.textContent = value;
		onSave(value);
	});
}

// Close the swiped card on outside touch
document.addEventListener("pointerdown", (e) => {
	if (closeOpenCard && !e.target.closest(".task-card.open")) closeOpenCard();
});

// Swipe a card to reveal delete
function setupSwipe(card, content, deleteBtn, title) {
	let startX = 0;
	let startY = 0;
	let baseX = 0;
	let currentX = 0;
	let axis = null;
	let tracking = false;
	let swiped = false;

	const revealWidth = () => deleteBtn.offsetWidth;

	function close() {
		setOpen(false);
	}

	// Open or close the delete area, with a springy bounce when it settles open after a stretch
	function setOpen(open, bounce = false) {
		card.classList.remove("swiping");
		card.classList.toggle("open", open);
		content.style.transition = bounce ? "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)" : "";
		content.style.transform = open ? `translateX(-${revealWidth()}px)` : "";

		if (open) {
			if (closeOpenCard && closeOpenCard !== close) closeOpenCard();
			closeOpenCard = close;
		} else if (closeOpenCard === close) {
			closeOpenCard = null;
		}
	}

	card.addEventListener("pointerdown", (e) => {
		if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
		if (e.target.closest(".delete-btn-icon") || document.activeElement === title) return;
		if (e.pointerType === "mouse" && e.target.closest(".task-title")) return;

		startX = e.clientX;
		startY = e.clientY;
		baseX = card.classList.contains("open") ? -revealWidth() : 0;
		currentX = baseX;
		axis = null;
		tracking = true;
	});

	card.addEventListener("pointermove", (e) => {
		if (!tracking) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;

		// Lock gesture direction, diagonal swipes still count as horizontal
		if (!axis) {
			if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
			axis = Math.abs(dx) * 1.2 > Math.abs(dy) ? "x" : "y";
			if (axis === "x") {
				swiped = true;
				content.style.transition = "";
				card.classList.add("swiping");
				try {
					card.setPointerCapture(e.pointerId);
				} catch (err) {
					// Touch pointers are already captured by the card
				}
			}
		}
		if (axis !== "x") return;

		// The card follows the finger all the way, so it stretches past the delete area
		currentX = Math.min(0, Math.max(-card.offsetWidth, baseX + dx));
		content.style.transform = `translateX(${currentX}px)`;
	});

	// Keep the page from scrolling once a horizontal swipe started, even if the finger drifts up or down
	card.addEventListener(
		"touchmove",
		(e) => {
			if (axis === "x" && e.cancelable) e.preventDefault();
		},
		{ passive: false },
	);

	const endGesture = (e) => {
		if (!tracking) return;
		tracking = false;

		// A tap right after a swipe must not toggle the checkbox
		if (swiped) setTimeout(() => (swiped = false), 300);

		if (axis === "x") {
			// Snap open (with a bounce) or closed
			const shouldOpen = currentX < -revealWidth() / 2;
			setOpen(shouldOpen, shouldOpen);
		} else if (axis === null && e.type === "pointerup" && card.classList.contains("open")) {
			// Tapping an opened card closes it
			setOpen(false);
		}
		axis = null;
	};

	card.addEventListener("pointerup", endGesture);
	card.addEventListener("pointercancel", endGesture);

	return { wasSwiped: () => swiped };
}

// Create a task card element
function createTaskCard(task) {
	const card = document.createElement("div");
	card.classList.add("task-card");
	card.dataset.taskId = task.id;
	card.classList.toggle("completed", task.completed);

	// Card structure
	card.innerHTML = `
		<div class="task-content-wrapper">
			<button class="complete-btn-checkbox" aria-label="Completar tarea">
				<img src="./assets/icons/check-bold.svg" alt="">
			</button>
			<div class="task-info-container">
				<p class="task-title" contenteditable="true"></p>
			</div>
		</div>
		<button class="delete-btn-icon" aria-label="Eliminar tarea">
			<img src="./assets/icons/trash.svg" alt="">
		</button>
	`;

	const content = card.querySelector(".task-content-wrapper");
	const title = card.querySelector(".task-title");
	const completeBtn = card.querySelector(".complete-btn-checkbox");
	const deleteBtn = card.querySelector(".delete-btn-icon");

	title.textContent = task.title;
	title.dataset.placeholder = DEFAULT_TASK_TITLE;

	// Toggle the empty title placeholder
	const updatePlaceholder = () => {
		title.classList.toggle("is-empty", title.textContent === "");
	};
	updatePlaceholder();

	// Save the title while typing
	title.addEventListener("input", () => {
		task.title = title.textContent.trimEnd();
		updatePlaceholder();
		saveToStorage();
	});

	// Restore default title if empty
	setupEditableText(title, DEFAULT_TASK_TITLE, (value) => {
		task.title = value;
		updatePlaceholder();
		saveToStorage();
	});

	completeBtn.addEventListener("click", () => {
		if (swipe.wasSwiped()) return;

		// Toggle completed state in place
		task.completed = !task.completed;
		card.classList.toggle("completed", task.completed);
		saveToStorage();
		updateTaskCounters();

		// Move the task after a short delay
		clearTimeout(reorderTimers.get(task.id));
		reorderTimers.set(
			task.id,
			setTimeout(() => {
				reorderTimers.delete(task.id);
				if (!taskList.includes(task)) return;

				reorderTasks(task);
				saveToStorage();
				renderBoardAnimated();
			}, REORDER_DELAY),
		);
	});

	deleteBtn.addEventListener("click", () => deleteTask(task));

	const swipe = setupSwipe(card, content, deleteBtn, title);

	// Play the entrance animation for new tasks
	if (task.id === lastCreatedTaskId) {
		card.classList.add("is-new");
		requestAnimationFrame(() => card.classList.remove("is-new"));
	}

	return card;
}

// Focus a task title with the caret at the end
function focusTaskTitle(taskId) {
	const titleEl = document.querySelector(
		`.task-card[data-task-id="${taskId}"] .task-title`,
	);
	if (!titleEl) return;

	titleEl.focus({ preventScroll: true });

	const range = document.createRange();
	range.selectNodeContents(titleEl);
	range.collapse(false);

	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);

	titleEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Add a new task to a column
function addTaskToColumn(columnId) {
	// Clear search and filter first
	if (isFiltering()) resetViewFilters();

	const newTask = {
		id: generateId(),
		title: "",
		columnId: columnId,
		completed: false,
	};

	taskList.push(newTask);
	lastCreatedTaskId = newTask.id;

	renderBoard();
	saveToStorage();

	lastCreatedTaskId = null;
	focusTaskTitle(newTask.id);
}

// Delete a task and offer to undo it
function deleteTask(task) {
	const index = taskList.indexOf(task);
	if (index === -1) return;

	taskList.splice(index, 1);
	saveToStorage();
	renderBoard();

	showToast("Tarea eliminada", {
		actionText: "Deshacer",
		onAction: () => {
			taskList.splice(Math.min(index, taskList.length), 0, task);
			saveToStorage();
			renderBoard();
		},
	});
}

// Delete a column after asking for confirmation
async function deleteColumn(columnId) {
	const confirmed = await openDialog({
		title: "Eliminar lista",
		message: "Se eliminarán también todas sus tareas. Esta acción no se puede deshacer.",
		confirmText: "Eliminar",
		danger: true,
	});
	if (!confirmed) return;

	const index = columnList.findIndex((col) => col.id === columnId);
	taskList = taskList.filter((task) => task.columnId !== columnId);
	columnList = columnList.filter((col) => col.id !== columnId);

	// Select a neighbour list
	if (activeColumnId === columnId) {
		const next = columnList[Math.min(index, columnList.length - 1)];
		activeColumnId = next ? next.id : null;
	}

	renderBoard();
	renderSettingsLists();
	saveToStorage();
}

// Get scroll position to center a tab
function getTabsScrollTarget(tab) {
	return tab.offsetLeft - (listTabs.clientWidth - tab.offsetWidth) / 2;
}

// Render the list tabs
function renderTabs() {
	listTabs.innerHTML = "";

	columnList.forEach((column) => {
		const tab = document.createElement("button");
		tab.classList.add("list-tab");
		tab.classList.toggle("active", column.id === activeColumnId);
		tab.dataset.columnId = column.id;
		tab.textContent = column.name;

		// Show match count on the tab
		if (isFiltering()) {
			const count = document.createElement("span");
			count.classList.add("tab-count");
			count.textContent = getVisibleTasks(column.id).length;
			tab.appendChild(count);
		}

		tab.addEventListener("click", () => goToColumn(column.id));
		listTabs.appendChild(tab);
	});

	// Add list button
	const addTab = document.createElement("button");
	addTab.classList.add("list-tab", "list-tab-add");
	addTab.setAttribute("aria-label", "Nueva lista");
	addTab.innerHTML = `<img src="./assets/icons/plus.svg" alt="">`;
	addTab.addEventListener("click", createList);
	listTabs.appendChild(addTab);

	const activeTab = listTabs.querySelector(".list-tab.active");
	if (activeTab) listTabs.scrollLeft = getTabsScrollTarget(activeTab);
}

// Set the active list
function setActiveColumn(columnId, scrollBoard) {
	activeColumnId = columnId;

	listTabs.querySelectorAll(".list-tab").forEach((tab) => {
		const isActive = tab.dataset.columnId === columnId;
		tab.classList.toggle("active", isActive);
		if (isActive) {
			listTabs.scrollTo({ left: getTabsScrollTarget(tab), behavior: "smooth" });
		}
	});

	if (scrollBoard) {
		const index = columnList.findIndex((c) => c.id === columnId);
		board.scrollTo({ left: index * board.clientWidth, behavior: "smooth" });
	}
}

// Go to a list from a tab tap
function goToColumn(columnId) {
	scrollingToId = columnId;
	setTimeout(() => (scrollingToId = null), 800);
	setActiveColumn(columnId, true);
}

// Update active list on swipe
let scrollFramePending = false;
board.addEventListener("scroll", () => {
	if (scrollFramePending) return;
	scrollFramePending = true;

	requestAnimationFrame(() => {
		scrollFramePending = false;
		const column = columnList[Math.round(board.scrollLeft / board.clientWidth)];
		if (!column) return;

		// Ignore lists passed during tab scroll
		if (scrollingToId) {
			if (column.id === scrollingToId) scrollingToId = null;
			return;
		}
		if (column.id !== activeColumnId) setActiveColumn(column.id, false);
	});
});

// Render the board
function renderBoard() {
	board.innerHTML = "";
	closeOpenCard = null;

	// Keep the active list valid
	if (!columnList.some((c) => c.id === activeColumnId)) {
		activeColumnId = columnList.length ? columnList[0].id : null;
	}

	if (columnList.length === 0) {
		const emptyBoard = document.createElement("p");
		emptyBoard.classList.add("empty-board");
		emptyBoard.textContent = "No tienes listas. Toca + para crear una.";
		board.appendChild(emptyBoard);
	}

	columnList.forEach((column) => {
		const page = document.createElement("div");
		page.classList.add("column-page");

		const section = document.createElement("section");
		section.classList.add("column");

		const body = document.createElement("div");
		body.classList.add("column-body");
		body.dataset.columnId = column.id;

		const visibleTasks = getVisibleTasks(column.id);
		if (visibleTasks.length === 0) {
			const emptyState = document.createElement("p");
			emptyState.classList.add("empty-state");
			emptyState.textContent = isFiltering() ? "Sin resultados" : "Sin tareas";
			body.appendChild(emptyState);
		} else {
			visibleTasks.forEach((task) => body.appendChild(createTaskCard(task)));
		}

		section.append(body);
		page.appendChild(section);
		board.appendChild(page);
	});

	renderTabs();
	updateTaskCounters();

	// Restore the active list position
	const activeIndex = columnList.findIndex((c) => c.id === activeColumnId);
	board.scrollLeft = Math.max(0, activeIndex) * board.clientWidth;
}

// Render the board animating moved tasks
function renderBoardAnimated() {
	const oldTops = new Map();
	document.querySelectorAll(".task-card").forEach((card) => {
		oldTops.set(card.dataset.taskId, card.getBoundingClientRect().top);
	});

	renderBoard();

	// Animate cards to their new position
	const movedCards = [];
	document.querySelectorAll(".task-card").forEach((card) => {
		const oldTop = oldTops.get(card.dataset.taskId);
		if (oldTop === undefined) return;

		const delta = oldTop - card.getBoundingClientRect().top;
		if (!delta) return;

		card.style.transition = "none";
		card.style.transform = `translateY(${delta}px)`;
		movedCards.push(card);
	});
	if (movedCards.length === 0) return;

	board.getBoundingClientRect();
	requestAnimationFrame(() => {
		movedCards.forEach((card) => {
			card.style.transition = "";
			card.style.transform = "";
		});
	});
}

// Create a new list
async function createList() {
	const name = await openDialog({
		title: "Nueva lista",
		withInput: true,
		confirmText: "Crear",
	});
	if (name === null) return;

	const newColumn = { id: generateId(), name: name || DEFAULT_COLUMN_NAME };
	columnList.push(newColumn);
	activeColumnId = newColumn.id;

	renderBoard();
	saveToStorage();
}

// Floating button adds a task
document.getElementById("addTaskBtn").addEventListener("click", () => {
	if (activeColumnId) {
		addTaskToColumn(activeColumnId);
	} else {
		createList();
	}
});

// Modal dialog elements
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalInput = document.getElementById("modalInput");
const modalConfirm = document.getElementById("modalConfirm");
const modalCancel = document.getElementById("modalCancel");

// Fit the dialog above the keyboard
function syncOverlayToViewport() {
	const viewport = window.visualViewport;
	if (!viewport) return;

	modalOverlay.style.top = `${viewport.offsetTop}px`;
	modalOverlay.style.height = `${viewport.height}px`;
}

// Show an in-app dialog
function openDialog({ title, message = "", withInput = false, confirmText = "Aceptar", danger = false }) {
	return new Promise((resolve) => {
		modalTitle.textContent = title;
		modalMessage.textContent = message;
		modalMessage.hidden = !message;
		modalInput.hidden = !withInput;
		modalInput.value = "";
		modalConfirm.textContent = confirmText;
		modalConfirm.classList.toggle("danger", danger);
		modalOverlay.classList.toggle("with-input", withInput);

		const finish = (result) => {
			modalOverlay.classList.remove("visible");
			modalOverlay.inert = true;
			modalInput.blur();

			window.visualViewport?.removeEventListener("resize", syncOverlayToViewport);
			window.visualViewport?.removeEventListener("scroll", syncOverlayToViewport);
			modalOverlay.style.top = "";
			modalOverlay.style.height = "";

			resolve(result);
		};

		const confirm = () => finish(withInput ? modalInput.value.trim() : true);
		const cancel = () => finish(withInput ? null : false);

		modalConfirm.onclick = confirm;
		modalCancel.onclick = cancel;
		modalOverlay.onclick = (e) => {
			if (e.target === modalOverlay) cancel();
		};
		modalOverlay.onkeydown = (e) => {
			if (e.key === "Escape") cancel();
			if (e.key === "Enter" && e.target === modalInput) confirm();
		};

		window.visualViewport?.addEventListener("resize", syncOverlayToViewport);
		window.visualViewport?.addEventListener("scroll", syncOverlayToViewport);

		// Show the dialog and focus the input
		modalOverlay.inert = false;
		modalOverlay.classList.add("visible");
		if (withInput) modalInput.focus();
	});
}

// Toast elements
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");
const toastAction = document.getElementById("toastAction");
let toastTimer = null;

// Show a toast message
function showToast(message, { actionText = "", onAction = null } = {}) {
	toastText.textContent = message;
	toastAction.textContent = actionText;
	toastAction.hidden = !actionText;
	toast.classList.toggle("has-action", Boolean(actionText));

	toastAction.onclick = () => {
		toast.classList.remove("visible");
		clearTimeout(toastTimer);
		if (onAction) onAction();
	};

	toast.classList.add("visible");
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => toast.classList.remove("visible"), actionText ? 5000 : 2200);
}

// Export data as a JSON file
function exportTasks() {
	const json = JSON.stringify({ columns: columnList, tasks: taskList }, null, 2);
	const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));

	const a = document.createElement("a");
	a.href = url;
	a.download = "kuic_tasks.json";
	document.body.appendChild(a);
	a.click();
	a.remove();

	// Release the file URL
	setTimeout(() => URL.revokeObjectURL(url), 1000);

	showToast("Exportación completa");
}

// Validate imported data
function parseImportData(data) {
	if (!data || !Array.isArray(data.columns) || !Array.isArray(data.tasks)) {
		return null;
	}

	const validColumns = data.columns.every(
		(c) => c && typeof c.id === "string" && c.id && typeof c.name === "string",
	);
	if (!validColumns) return null;

	const columnIds = new Set(data.columns.map((c) => c.id));
	const validTasks = data.tasks.every(
		(t) =>
			t &&
			typeof t.id === "string" &&
			t.id &&
			typeof t.title === "string" &&
			columnIds.has(t.columnId),
	);
	if (!validTasks) return null;

	return {
		columns: data.columns.map((c) => ({ id: c.id, name: c.name })),
		tasks: data.tasks.map((t) => ({
			id: t.id,
			title: t.title,
			columnId: t.columnId,
			completed: t.completed === true,
		})),
	};
}

// Import data from a JSON file
function importTasks(file) {
	const reader = new FileReader();

	reader.onload = async (e) => {
		let imported = null;
		try {
			imported = parseImportData(JSON.parse(e.target.result));
		} catch (err) {
			showToast("Error leyendo el archivo");
			return;
		}

		if (!imported) {
			showToast("Archivo inválido");
			return;
		}

		const confirmed = await openDialog({
			title: "Importar datos",
			message: "Esto reemplazará todas tus listas y tareas actuales.",
			confirmText: "Importar",
			danger: true,
		});
		if (!confirmed) return;

		columnList = imported.columns;
		taskList = imported.tasks;
		saveToStorage();
		renderBoard();
		showToast("Importación completa");
	};

	reader.onerror = () => showToast("Error leyendo el archivo");
	reader.readAsText(file);
}

const fileInput = document.getElementById("fileInput");

document.getElementById("importBtn").addEventListener("click", () => fileInput.click());
document.getElementById("exportBtn").addEventListener("click", exportTasks);

fileInput.addEventListener("change", (e) => {
	const file = e.target.files[0];

	// Reset the file input
	e.target.value = "";

	if (file) importTasks(file);
});

// Settings screen elements
const settingsScreen = document.getElementById("settingsScreen");
const settingsLists = document.getElementById("settingsLists");

// Let a list row be dragged up or down by its handle, the new order is saved when it is dropped
function setupListReorder(row, handle) {
	handle.addEventListener("pointerdown", (e) => {
		if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
		e.preventDefault();
		handle.setPointerCapture(e.pointerId);

		let startY = e.clientY;
		row.classList.add("dragging");
		settingsLists.classList.add("reordering");

		const onMove = (ev) => {
			row.style.transform = `translateY(${ev.clientY - startY}px)`;

			// Swap places with a neighbour when the dragged row crosses its middle
			const center = row.getBoundingClientRect().top + row.offsetHeight / 2;
			const prev = row.previousElementSibling;
			const next = row.nextElementSibling;
			let neighbour = null;

			if (prev) {
				const rect = prev.getBoundingClientRect();
				if (center < rect.top + rect.height / 2) neighbour = prev;
			}
			if (!neighbour && next) {
				const rect = next.getBoundingClientRect();
				if (center > rect.top + rect.height / 2) neighbour = next;
			}
			if (!neighbour) return;

			const rowTop = row.getBoundingClientRect().top;
			const neighbourTop = neighbour.getBoundingClientRect().top;

			if (neighbour === prev) {
				settingsLists.insertBefore(row, prev);
			} else {
				settingsLists.insertBefore(row, next.nextElementSibling);
			}

			// Keep the dragged row under the finger after the layout shifted
			startY += row.getBoundingClientRect().top - rowTop;
			row.style.transform = `translateY(${ev.clientY - startY}px)`;

			// Slide the neighbour into its new place instead of jumping
			const delta = neighbourTop - neighbour.getBoundingClientRect().top;
			neighbour.style.transition = "none";
			neighbour.style.transform = `translateY(${delta}px)`;
			neighbour.getBoundingClientRect();
			neighbour.style.transition = "";
			neighbour.style.transform = "";
		};

		const onEnd = () => {
			handle.removeEventListener("pointermove", onMove);
			handle.removeEventListener("pointerup", onEnd);
			handle.removeEventListener("pointercancel", onEnd);

			// Glide the row into its slot
			row.classList.remove("dragging");
			row.style.transform = "";
			setTimeout(() => settingsLists.classList.remove("reordering"), 300);

			// Apply the new order to the lists and the main screen
			const order = [...settingsLists.querySelectorAll(".settings-row")].map((r) => r.dataset.columnId);
			columnList.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
			saveToStorage();
			renderBoard();
		};

		handle.addEventListener("pointermove", onMove);
		handle.addEventListener("pointerup", onEnd);
		handle.addEventListener("pointercancel", onEnd);
	});
}

// Render the list rows in settings
function renderSettingsLists() {
	settingsLists.innerHTML = "";

	if (columnList.length === 0) {
		const empty = document.createElement("p");
		empty.classList.add("settings-empty");
		empty.textContent = "No tienes listas";
		settingsLists.appendChild(empty);
		return;
	}

	columnList.forEach((column) => {
		const row = document.createElement("div");
		row.classList.add("settings-row", "settings-reorder-row");
		row.dataset.columnId = column.id;

		const handle = document.createElement("button");
		handle.classList.add("settings-handle");
		handle.setAttribute("aria-label", "Reordenar lista");
		handle.innerHTML = `<img src="./assets/icons/dots-six-vertical.svg" alt="">`;
		setupListReorder(row, handle);

		const input = document.createElement("input");
		input.classList.add("settings-input");
		input.type = "text";
		input.maxLength = 40;
		input.value = column.name;
		input.setAttribute("aria-label", "Nombre de la lista");

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") input.blur();
		});

		// Rename the list
		input.addEventListener("blur", () => {
			const value = input.value.trim() || DEFAULT_COLUMN_NAME;
			input.value = value;
			column.name = value;
			saveToStorage();
			renderTabs();
		});

		const deleteBtn = document.createElement("button");
		deleteBtn.classList.add("settings-icon-btn");
		deleteBtn.setAttribute("aria-label", "Eliminar lista");
		deleteBtn.innerHTML = `<img src="./assets/icons/trash.svg" alt="">`;
		deleteBtn.addEventListener("click", () => deleteColumn(column.id));

		row.append(handle, input, deleteBtn);
		settingsLists.appendChild(row);
	});
}

// Slide the settings screen in
function openSettings() {
	renderSettingsLists();
	settingsScreen.scrollTop = 0;
	settingsScreen.inert = false;
	settingsScreen.classList.add("open");
	document.body.classList.add("settings-open");
}

// Slide the settings screen out
function closeSettings() {
	document.activeElement?.blur();
	settingsScreen.inert = true;
	settingsScreen.classList.remove("open");
	document.body.classList.remove("settings-open");
}

document.getElementById("settingsBtn").addEventListener("click", openSettings);
document.getElementById("settingsBack").addEventListener("click", closeSettings);

document.addEventListener("keydown", (e) => {
	const dialogOpen = modalOverlay.classList.contains("visible");
	if (e.key === "Escape" && !dialogOpen && settingsScreen.classList.contains("open")) {
		closeSettings();
	}
});

// Search tasks while typing
searchInput.addEventListener("input", () => {
	searchQuery = normalizeText(searchInput.value.trim());
	searchClear.hidden = !searchInput.value;
	renderBoard();
});

searchInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter") searchInput.blur();
});

searchClear.addEventListener("click", () => {
	searchInput.value = "";
	searchQuery = "";
	searchClear.hidden = true;
	renderBoard();
	searchInput.focus();
});

// Counter tiles filter the board
statTiles.forEach((tile) => {
	tile.addEventListener("click", () => {
		filterMode = filterMode === tile.dataset.filter ? "all" : tile.dataset.filter;
		updateFilterUI();
		renderBoard();
	});
});

// Count one anonymous visit in Supabase
async function trackProjectActivity(projectName) {
	try {
		const { error } = await _supabase.rpc("increment_visit", {
			name_param: projectName,
		});

		if (error) throw error;
	} catch (err) {
		// Ignore tracking errors
	}
}

// Load data and render on page load
loadFromStorage();
renderBoard();
trackProjectActivity("Kuic");

// Register the service worker for offline use
if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("./sw.js").catch(console.error);
}
