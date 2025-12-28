// Data structures for columns and tasks
let columnList = [
	{ id: "pending", name: "PENDING" },
	{ id: "inprogress", name: "IN PROGRESS" },
	{ id: "completed", name: "COMPLETED" },
];

let taskList = [
	{ id: "task1", title: "Review Q4 budget report", columnId: "pending" },
	{ id: "task2", title: "Design new landing page", columnId: "inprogress" },
	{ id: "task3", title: "Launch email campaign", columnId: "completed" },
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

// Create a task card element
function createTaskCard(task) {
	const card = document.createElement("div");
	card.classList.add("task-card", task.columnId);
	card.dataset.taskId = task.id;
	card.draggable = true;

	const title = document.createElement("p");
	title.classList.add("task-title");
	title.contentEditable = true;
	title.textContent = task.title;
	title.addEventListener("input", () => {
		task.title = title.textContent;
		saveToStorage();
	});

	const actionRow = document.createElement("div");
	actionRow.classList.add("action-row");

	const customSelect = document.createElement("div");
	customSelect.classList.add("custom-select", "action-btn");
	customSelect.innerHTML = `
    <div class="selected">Move</div>
    <ul class="options"></ul>
  `;

	const deleteBtn = document.createElement("button");
	deleteBtn.classList.add("action-btn");
	deleteBtn.textContent = "Delete";
	deleteBtn.addEventListener("click", () => {
		taskList = taskList.filter((t) => t.id !== task.id);
		renderBoard();
		saveToStorage();
	});

	actionRow.append(customSelect, deleteBtn);
	card.append(title, actionRow);
	return card;
}

// Add a new task to a column
function addTaskToColumn(columnId) {
	const newTask = {
		id: generateId("task"),
		title: "New Task",
		columnId: columnId,
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

	// Initialize drag and drop and custom selects after rendering
	initDragAndDrop();
	initCustomSelects();
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

// Initialize custom selects
function initCustomSelects() {
	document.querySelectorAll(".custom-select").forEach((select) => {
		const selected = select.querySelector(".selected");
		const optionsContainer = select.querySelector(".options");
		optionsContainer.innerHTML = "";

		// Populate options dynamically from columnList
		columnList.forEach((column) => {
			const option = document.createElement("li");
			option.dataset.value = column.id;
			option.textContent = column.name;
			optionsContainer.appendChild(option);
		});

		// Toggle dropdown
		selected.addEventListener("click", (e) => {
			e.stopPropagation();
			document
				.querySelectorAll(".custom-select")
				.forEach((el) => el.classList.remove("open"));
			select.classList.toggle("open");
		});

		// Handle option click
		optionsContainer.querySelectorAll("li").forEach((option) => {
			option.addEventListener("click", () => {
				const value = option.dataset.value;
				select.classList.remove("open");
				const card = select.closest(".task-card");
				const taskId = card.dataset.taskId;
				const task = taskList.find((t) => t.id === taskId);
				if (task) {
					task.columnId = value;
					renderBoard();
					saveToStorage();
				}
			});
		});
	});

	// Close dropdowns on outside click
	document.addEventListener("click", () => {
		document
			.querySelectorAll(".custom-select")
			.forEach((el) => el.classList.remove("open"));
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
