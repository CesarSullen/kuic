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
	},
	{
		id: "task2",
		title: "Design new landing page",
		columnId: "inprogress",
		completed: false,
	},
	{
		id: "task3",
		title: "Launch email campaign",
		columnId: "completed",
		completed: true,
	},
];

// Generate unique IDs
function generateId(prefix = "id") {
	return `${prefix}-${Date.now()}`;
}

// Save data to localStorage
function saveToStorage() {
	localStorage.setItem("columns", JSON.stringify(columnList));
	localStorage.setItem("tasks", JSON.stringify(taskList));
}

// Load data from localStorage
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

	if (task.completed) {
		card.classList.add("completed");
	} else {
		card.classList.remove("completed");
	}

	const title = document.createElement("p");
	title.classList.add("task-title");
	title.contentEditable = true;
	title.textContent = task.title;
	title.addEventListener("input", () => {
		task.title = title.textContent.trimEnd();
		saveToStorage();
	});

	const actionRow = document.createElement("div");
	actionRow.classList.add("action-row");

	const completeBtn = document.createElement("button");
	completeBtn.classList.add("action-btn", "complete-btn");
	completeBtn.textContent = task.completed ? "Completed" : "Complete";

	completeBtn.addEventListener("click", () => {
		task.completed = !task.completed;

		reorderTasks(task);
		saveToStorage();
		renderBoard();
	});

	const deleteBtn = document.createElement("button");
	deleteBtn.classList.add("action-btn", "delete-btn");
	deleteBtn.textContent = "Delete";
	deleteBtn.addEventListener("click", () => {
		taskList = taskList.filter((t) => t.id !== task.id);
		renderBoard();
		saveToStorage();
	});

	if (task.completed) card.classList.add("completed");

	actionRow.append(completeBtn, deleteBtn);
	card.append(title, actionRow);
	return card;
}

// Add a new task to a column
function addTaskToColumn(columnId) {
	const newTask = {
		id: generateId("task"),
		title: "New Task",
		columnId: columnId,
		completed: false,
	};
	taskList.push(newTask);
	renderBoard();
	saveToStorage();
}

// Delete a column
function deleteColumn(columnId) {
	if (confirm("Delete this column? Tasks will be moved to the first column.")) {
		// Move tasks to the first column
		const firstColumnId = columnList[0]?.id;
		if (firstColumnId) {
			taskList.forEach((task) => {
				if (task.columnId === columnId) task.columnId = firstColumnId;
			});
		} else {
			// If no other columns, delete tasks
			taskList = taskList.filter((task) => task.columnId !== columnId);
		}
		columnList = columnList.filter((col) => col.id !== columnId);
		renderBoard();
		saveToStorage();
	}
}

// Function to render the entire board
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
			column.name = title.textContent;
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

		// Add tasks to this column
		taskList
			.filter((task) => task.columnId === column.id)
			.forEach((task) => {
				body.appendChild(createTaskCard(task));
			});

		section.append(header, body);
		board.appendChild(section);
	});

	// Initialize drag and drop
	initDragAndDrop();
}

// Function to initialize drag and drop events
function initDragAndDrop() {
	const columns = document.querySelectorAll(".column-body");
	let draggedCard = null;

	// Make cards draggable
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

	// Column events
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
	const newName = prompt("Type the name for your new column:") || "New Column";
	columnList.push({ id: newId, name: newName });
	renderBoard();
	saveToStorage();
});

// Load data and render on page load
loadFromStorage();
renderBoard();

// Cache Storage Implementation
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("./sw.js");
	});
}
