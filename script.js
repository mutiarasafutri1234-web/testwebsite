/**
 * script.js — Task List App
 *
 * Architecture: pure Vanilla JS, zero dependencies.
 * State is kept in a single `tasks` array and persisted to
 * localStorage so data survives page refreshes.
 *
 * Data shape for each task object:
 * {
 *   id        : string  — unique identifier (Date.now + random)
 *   text      : string  — task description
 *   completed : boolean — completion status
 *   color     : string  — one of COLOUR_NAMES (assigned round-robin)
 *   createdAt : number  — Unix timestamp for ordering
 * }
 */

/* ============================================================
   1. DOM REFERENCES
   ============================================================ */

const taskForm          = document.getElementById("task-form");
const taskInput         = document.getElementById("task-input");
const formError         = document.getElementById("form-error");
const taskList          = document.getElementById("task-list");
const emptyState        = document.getElementById("empty-state");
const taskCount         = document.getElementById("task-count");
const taskProgress      = document.getElementById("task-progress");
const clearCompletedBtn = document.getElementById("clear-completed-btn");

// Filter buttons (NodeList → Array)
const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));

// Edit modal elements
const editModal       = document.getElementById("edit-modal");
const editInput       = document.getElementById("edit-input");
const saveEditBtn     = document.getElementById("save-edit-btn");
const cancelEditBtn   = document.getElementById("cancel-edit-btn");

/* ============================================================
   2. COLOUR PALETTE
   ============================================================ */

/**
 * The 6 colour names — must match CSS classes: .color-red, etc.
 * and dot classes: .dot-red, etc.
 * Tasks are assigned colours round-robin based on their insertion order.
 */
const COLOUR_NAMES = ["red", "yellow", "green", "blue", "purple", "pink"];

/**
 * Determine the next colour index based on how many tasks exist.
 * Uses modulo so it cycles through all 6 colours infinitely.
 * @returns {string}
 */
function nextColour() {
  return COLOUR_NAMES[tasks.length % COLOUR_NAMES.length];
}

/* ============================================================
   3. APPLICATION STATE
   ============================================================ */

/**
 * The master list of task objects.
 * Loaded from localStorage on startup; saved on every mutation.
 * @type {Array<{id:string, text:string, completed:boolean, color:string, createdAt:number}>}
 */
let tasks = loadTasksFromStorage();

/**
 * Currently active filter: "all" | "active" | "completed"
 * @type {string}
 */
let currentFilter = "all";

/**
 * ID of the task currently being edited (null when modal is closed).
 * @type {string|null}
 */
let editingTaskId = null;

/* ============================================================
   4. STORAGE HELPERS
   ============================================================ */

/**
 * Persist the current `tasks` array to localStorage.
 */
function saveTasksToStorage() {
  localStorage.setItem("taskList_tasks", JSON.stringify(tasks));
}

/**
 * Load tasks from localStorage.
 * Returns an empty array if nothing is stored yet.
 * @returns {Array}
 */
function loadTasksFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("taskList_tasks")) || [];
  } catch {
    return [];
  }
}

/* ============================================================
   5. UTILITY HELPERS
   ============================================================ */

/**
 * Generate a simple unique ID string.
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Sanitise user text to prevent XSS when inserted via innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Filter the tasks array based on `currentFilter`.
 * @returns {Array}
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case "active":
      return tasks.filter((t) => !t.completed);
    case "completed":
      return tasks.filter((t) => t.completed);
    default: // "all"
      return [...tasks];
  }
}

/* ============================================================
   6. RENDER — re-draw the task list and update UI stats
   ============================================================ */

/**
 * Main render function.
 * Called after every state change to keep the UI in sync.
 */
function render() {
  const filtered = getFilteredTasks();

  // Clear list
  taskList.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");

    // Build a document fragment for performance
    const fragment = document.createDocumentFragment();

    filtered.forEach((task) => {
      const li = createTaskElement(task);
      fragment.appendChild(li);
    });

    taskList.appendChild(fragment);
  }

  updateStats();
}

/**
 * Build a single <li> element for the given task object.
 * The colour class (e.g. "color-blue") drives border-left and checkbox colour.
 * @param {{id:string, text:string, completed:boolean, color:string}} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const colorClass = `color-${task.color || "blue"}`;
  const dotClass   = `dot-${task.color || "blue"}`;

  const li = document.createElement("li");
  li.className = `task-item task-enter ${colorClass}`;
  li.dataset.id = task.id;
  li.setAttribute("role", "listitem");

  li.innerHTML = `
    <!-- Checkbox -->
    <input
      type="checkbox"
      class="task-checkbox"
      id="chk-${task.id}"
      aria-label="Mark task as ${task.completed ? "active" : "completed"}"
      ${task.completed ? "checked" : ""}
    />

    <!-- Colour dot badge -->
    <span class="color-dot ${dotClass}" aria-hidden="true"></span>

    <!-- Task label (click also toggles) -->
    <label
      for="chk-${task.id}"
      class="task-label ${task.completed ? "completed" : ""}"
      title="${escapeHtml(task.text)}"
    >${escapeHtml(task.text)}</label>

    <!-- Action buttons -->
    <div class="flex items-center gap-1" role="group" aria-label="Task actions">
      <!-- Edit button -->
      <button
        class="action-btn edit-btn"
        data-action="edit"
        aria-label="Edit task"
        title="Edit"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      <!-- Delete button -->
      <button
        class="action-btn delete-btn"
        data-action="delete"
        aria-label="Delete task"
        title="Delete"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    </div>
  `;

  return li;
}

/**
 * Update footer stats: tasks-left count, progress text,
 * and "Clear completed" button visibility.
 */
function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const remaining = total - completed;

  // "X task(s) left"
  taskCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;

  // Progress: "X / Y completed"
  if (total > 0) {
    taskProgress.textContent = `${completed} / ${total} completed`;
  } else {
    taskProgress.textContent = "";
  }

  // Show "Clear completed" only when there are completed tasks
  if (completed > 0) {
    clearCompletedBtn.classList.remove("hidden");
  } else {
    clearCompletedBtn.classList.add("hidden");
  }
}

/* ============================================================
   7. CRUD OPERATIONS
   ============================================================ */

/**
 * CREATE — add a new task to the list.
 * Colour is assigned round-robin from the 6-colour palette.
 * @param {string} text — validated, trimmed task text
 */
function addTask(text) {
  const newTask = {
    id:        generateId(),
    text:      text.trim(),
    completed: false,
    color:     nextColour(), // assign before unshift so index is correct
    createdAt: Date.now(),
  };

  tasks.unshift(newTask); // prepend so newest appears at top
  saveTasksToStorage();
  render();
}

/**
 * TOGGLE — flip the completed status of a task by ID.
 * @param {string} id
 */
function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasksToStorage();
  render();
}

/**
 * UPDATE — save edited text for a task by ID.
 * Colour is preserved (not changed on edit).
 * @param {string} id
 * @param {string} newText
 */
function updateTask(id, newText) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.text = newText.trim();
  saveTasksToStorage();
  render();
}

/**
 * DELETE — remove a single task by ID.
 * @param {string} id
 */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasksToStorage();
  render();
}

/**
 * CLEAR COMPLETED — remove all completed tasks at once.
 */
function clearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  saveTasksToStorage();
  render();
}

/* ============================================================
   8. EDIT MODAL HELPERS
   ============================================================ */

/**
 * Open the edit modal pre-filled with the task's current text.
 * The modal header border colour matches the task's colour.
 * @param {string} id
 */
function openEditModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  editingTaskId   = id;
  editInput.value = task.text;

  // Tint the modal's Save button to match task colour
  const colorMap = {
    red:    ["#ef4444", "#dc2626"],
    yellow: ["#eab308", "#ca8a04"],
    green:  ["#22c55e", "#16a34a"],
    blue:   ["#3b82f6", "#2563eb"],
    purple: ["#a855f7", "#9333ea"],
    pink:   ["#ec4899", "#db2777"],
  };
  const [from, to] = colorMap[task.color] || colorMap.blue;
  saveEditBtn.style.background = `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;

  editModal.classList.remove("hidden");
  editModal.classList.add("flex");

  // Focus input for accessibility
  requestAnimationFrame(() => editInput.focus());
}

/**
 * Close the edit modal and reset state.
 */
function closeEditModal() {
  editingTaskId = null;
  editModal.classList.add("hidden");
  editModal.classList.remove("flex");
  editInput.value = "";
  // Reset save button back to default gradient
  saveEditBtn.style.background = "";
}

/**
 * Save the edit if the new text is valid.
 */
function saveEdit() {
  const newText = editInput.value.trim();
  if (!newText) {
    editInput.focus();
    editInput.classList.add("ring-2", "ring-red-400");
    return;
  }
  editInput.classList.remove("ring-2", "ring-red-400");
  updateTask(editingTaskId, newText);
  closeEditModal();
}

/* ============================================================
   9. FILTER LOGIC
   ============================================================ */

/**
 * Switch the active filter and update button styles.
 * @param {string} filter — "all" | "active" | "completed"
 */
function setFilter(filter) {
  currentFilter = filter;

  // Update aria-selected and visual active class on filter buttons
  filterButtons.forEach((btn) => {
    const isActive = btn.dataset.filter === filter;
    btn.setAttribute("aria-selected", String(isActive));
    btn.classList.toggle("active-filter", isActive);
  });

  render();
}

/* ============================================================
   10. EVENT LISTENERS
   ============================================================ */

// ── Add task form submit ──────────────────────────────────────
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();

  if (!text) {
    // Show inline validation error
    formError.classList.remove("hidden");
    taskInput.focus();
    return;
  }

  formError.classList.add("hidden");
  addTask(text);
  taskInput.value = "";
  taskInput.focus(); // keep focus for quick sequential adds
});

// Hide validation error as soon as user types
taskInput.addEventListener("input", () => {
  if (taskInput.value.trim()) {
    formError.classList.add("hidden");
  }
});

// ── Task list — event delegation ─────────────────────────────
// One listener handles toggle, edit, and delete for all tasks
taskList.addEventListener("click", (e) => {
  // Find the closest task-item ancestor from the click target
  const li = e.target.closest("[data-id]");
  if (!li) return;

  const id = li.dataset.id;

  // Toggle checkbox
  if (e.target.classList.contains("task-checkbox")) {
    toggleTask(id);
    return;
  }

  // Toggle via label click is handled natively by <label for="chk-...">
  // so we only need to handle action buttons below.

  const actionBtn = e.target.closest("[data-action]");
  if (!actionBtn) return;

  if (actionBtn.dataset.action === "edit") {
    openEditModal(id);
  } else if (actionBtn.dataset.action === "delete") {
    deleteTask(id);
  }
});

// ── Filter buttons ────────────────────────────────────────────
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

// ── Clear completed ───────────────────────────────────────────
clearCompletedBtn.addEventListener("click", clearCompleted);

// ── Edit modal — save ─────────────────────────────────────────
saveEditBtn.addEventListener("click", saveEdit);

// ── Edit modal — cancel ───────────────────────────────────────
cancelEditBtn.addEventListener("click", closeEditModal);

// ── Edit modal — Enter key to save ───────────────────────────
editInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveEdit();
  if (e.key === "Escape") closeEditModal();
});

// ── Edit modal — close on backdrop click ─────────────────────
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

// ── Global Escape key to close modal ─────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !editModal.classList.contains("hidden")) {
    closeEditModal();
  }
});

/* ============================================================
   11. INITIALISE
   ============================================================ */

/**
 * Boot the app: render whatever tasks exist in storage.
 */
(function init() {
  render();
})();
