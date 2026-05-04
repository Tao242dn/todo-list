const STORAGE_KEY = "todo-list-items";
const DRAGGED_TASK_ID = "dragged-task";

const state = {
  editingId: null,
  todos: loadTodos(),
  filter: "all",
  search: "",
};

const elements = {
  todoList: document.getElementById("todoList"),
  emptyState: document.getElementById("emptyState"),
  totalCount: document.getElementById("totalCount"),
  pendingCount: document.getElementById("pendingCount"),
  completedCount: document.getElementById("completedCount"),
  searchInput: document.getElementById("searchInput"),
  filterButtons: document.querySelectorAll(".filter-btn"),
  filterGroup: document.querySelector(".filter-group"),
  modal: document.getElementById("todoModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalCaption: document.getElementById("modalCaption"),
  form: document.getElementById("todoForm"),
  todoId: document.getElementById("todoId"),
  title: document.getElementById("todoTitle"),
  description: document.getElementById("todoDescription"),
  submitBtn: document.getElementById("submitTodoBtn"),
  openAddModalBtn: document.getElementById("openAddModalBtn"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
};

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
}

function getFilteredTodos() {
  return state.todos.filter((todo) => {
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "completed" && todo.completed) ||
      (state.filter === "pending" && !todo.completed);

    const keyword = state.search.trim().toLowerCase();
    const query = `${todo.title} ${todo.description}`.toLowerCase();
    const matchesSearch = !keyword || query.includes(keyword);

    return matchesFilter && matchesSearch;
  });
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoString));
}

function renderStats() {
  const total = state.todos.length;
  const completed = state.todos.filter((todo) => todo.completed).length;
  const pending = total - completed;

  elements.totalCount.textContent = total;
  elements.pendingCount.textContent = pending;
  elements.completedCount.textContent = completed;
}

function renderTodos() {
  const todos = getFilteredTodos();
  elements.todoList.innerHTML = "";

  todos.forEach((todo) => {
    const item = document.createElement("article");
    item.className = `todo-item${todo.completed ? " is-completed" : ""}`;
    item.dataset.id = todo.id;
    item.draggable = true;
    item.innerHTML = `
      <input
        class="todo-check"
        type="checkbox"
        aria-label="Mark ${todo.title} as completed"
        ${todo.completed ? "checked" : ""}
        data-action="toggle"
        data-id="${todo.id}"
      />
      <div class="todo-content">
        <h3>${todo.title}</h3>
        <p>${todo.description || "No description added."}</p>
        <div class="todo-meta">
          <span class="badge ${todo.completed ? "completed" : ""}">
            ${todo.completed ? "Completed" : "Pending"}
          </span>
          <span class="badge">Created ${formatDate(todo.createdAt)}</span>
        </div>
      </div>
      <div class="todo-actions">
        <button
          class="icon-btn"
          type="button"
          data-action="edit"
          data-id="${todo.id}"
          aria-label="Edit ${todo.title}"
        >
          <i class="fa-regular fa-pen-to-square"></i>
        </button>
        <button
          class="icon-btn delete-btn"
          type="button"
          data-action="delete"
          data-id="${todo.id}"
          aria-label="Delete ${todo.title}"
        >
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;

    elements.todoList.appendChild(item);
  });

  elements.emptyState.classList.toggle("hidden", todos.length > 0);
  renderStats();
}

function makePlaceholder(draggedTask) {
  const placeholder = document.createElement("article");
  placeholder.className = "placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.style.height = `${draggedTask.offsetHeight}px`;
  return placeholder;
}

function removePlaceholder() {
  elements.todoList.querySelector(".placeholder")?.remove();
}

function syncTodosFromRenderedOrder() {
  const orderedVisibleIds = [
    ...elements.todoList.querySelectorAll(".todo-item"),
  ].map((item) => item.dataset.id);
  const visibleIds = new Set(orderedVisibleIds);
  const visibleTodoMap = new Map(
    state.todos
      .filter((todo) => visibleIds.has(todo.id))
      .map((todo) => [todo.id, todo]),
  );

  let nextVisibleIndex = 0;
  state.todos = state.todos.map((todo) =>
    visibleIds.has(todo.id)
      ? visibleTodoMap.get(orderedVisibleIds[nextVisibleIndex++])
      : todo,
  );
}

function openModal(mode, todo = null) {
  const isEdit = mode === "edit" && todo;
  state.editingId = isEdit ? todo.id : null;

  elements.form.reset();
  elements.todoId.value = isEdit ? todo.id : "";
  elements.title.value = isEdit ? todo.title : "";
  elements.description.value = isEdit ? todo.description : "";
  elements.modalTitle.textContent = isEdit ? "Edit Todo" : "Add Todo";
  elements.modalCaption.textContent = isEdit ? "Update task" : "New task";
  elements.submitBtn.textContent = isEdit ? "Update Todo" : "Save Todo";

  elements.modal.classList.remove("hidden");
  elements.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => elements.title.focus());
}

function closeModal() {
  state.editingId = null;
  elements.modal.classList.add("hidden");
  elements.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function addTodo({ title, description }) {
  state.todos.unshift({
    id: crypto.randomUUID(),
    title,
    description,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  saveTodos();
  renderTodos();
}

function updateTodo({ id, title, description }) {
  state.todos = state.todos.map((todo) =>
    todo.id === id
      ? {
          ...todo,
          title,
          description,
        }
      : todo,
  );

  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  state.todos = state.todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  state.todos = state.todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo,
  );

  saveTodos();
  renderTodos();
}

function handleFormSubmit(event) {
  event.preventDefault();

  const payload = {
    id: elements.todoId.value,
    title: elements.title.value.trim(),
    description: elements.description.value.trim(),
  };

  if (!payload.title) {
    elements.title.focus();
    return;
  }

  if (state.editingId) {
    updateTodo(payload);
  } else {
    addTodo(payload);
  }

  closeModal();
}

function handleTodoActions(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    return;
  }

  const { action, id } = actionTarget.dataset;
  const todo = state.todos.find((item) => item.id === id);

  if (action === "toggle") {
    toggleTodo(id);
    return;
  }

  if (action === "edit" && todo) {
    openModal("edit", todo);
    return;
  }

  if (action === "delete" && todo) {
    deleteTodo(id);
  }
}

function handleFilterClick(event) {
  const button = event.target.closest(".filter-btn");
  if (!button) {
    return;
  }

  state.filter = button.dataset.filter;
  elements.filterButtons.forEach((item) =>
    item.classList.toggle("active", item === button),
  );
  renderTodos();
}

function handleDragStart(event) {
  const item = event.target.closest(".todo-item");
  if (!item) {
    return;
  }

  item.id = DRAGGED_TASK_ID;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("task", "");
  }
}

function movePlaceholder(event) {
  if (!event.dataTransfer?.types.includes("task")) {
    return;
  }

  event.preventDefault();
  const draggedTask = document.getElementById(DRAGGED_TASK_ID);
  if (!draggedTask) {
    return;
  }

  const tasks = event.currentTarget;
  const existingPlaceholder = tasks.querySelector(".placeholder");

  if (existingPlaceholder) {
    const placeholderRect = existingPlaceholder.getBoundingClientRect();
    if (
      placeholderRect.top <= event.clientY &&
      placeholderRect.bottom >= event.clientY
    ) {
      return;
    }
  }

  for (const task of tasks.children) {
    if (task.getBoundingClientRect().bottom >= event.clientY) {
      if (task === existingPlaceholder) {
        return;
      }

      existingPlaceholder?.remove();
      if (task === draggedTask || task.previousElementSibling === draggedTask) {
        return;
      }

      tasks.insertBefore(existingPlaceholder ?? makePlaceholder(draggedTask), task);
      return;
    }
  }

  existingPlaceholder?.remove();
  if (tasks.lastElementChild === draggedTask) {
    return;
  }

  tasks.append(existingPlaceholder ?? makePlaceholder(draggedTask));
}

function handleDrop(event) {
  if (!event.dataTransfer?.types.includes("task")) {
    return;
  }

  event.preventDefault();
  const draggedTask = document.getElementById(DRAGGED_TASK_ID);
  const placeholder = elements.todoList.querySelector(".placeholder");
  if (!draggedTask || !placeholder) {
    return;
  }

  elements.todoList.insertBefore(draggedTask, placeholder);
  placeholder.remove();
  syncTodosFromRenderedOrder();
  saveTodos();
  renderTodos();
}

function handleDragEnd() {
  removePlaceholder();
  document.getElementById(DRAGGED_TASK_ID)?.removeAttribute("id");
}

function initializeEvents() {
  elements.openAddModalBtn.addEventListener("click", () => openModal("add"));
  elements.closeModalBtn.addEventListener("click", closeModal);
  elements.cancelModalBtn.addEventListener("click", closeModal);
  elements.form.addEventListener("submit", handleFormSubmit);
  elements.todoList.addEventListener("click", handleTodoActions);
  elements.todoList.addEventListener("change", handleTodoActions);
  elements.todoList.addEventListener("dragstart", handleDragStart);
  elements.todoList.addEventListener("dragover", movePlaceholder);
  elements.todoList.addEventListener("drop", handleDrop);
  elements.todoList.addEventListener("dragend", handleDragEnd);
  elements.todoList.addEventListener("dragleave", (event) => {
    if (elements.todoList.contains(event.relatedTarget)) {
      return;
    }

    removePlaceholder();
  });
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderTodos();
  });
  elements.filterGroup.addEventListener("click", handleFilterClick);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

initializeEvents();
renderTodos();
