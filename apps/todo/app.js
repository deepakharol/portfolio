const API = '/apps/todo/api';
let token = localStorage.getItem('todo_token');
let isGuest = localStorage.getItem('todo_guest') === '1';
let tasks = [];
let currentTaskId = null;
let currentFilter = 'all';
let currentCategory = 'personal';
let viewMode = 'list';         // 'list' | 'calendar'
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let saveTimer = null;
let pendingFiles = [];
let tables = [];
const taskCache = new Map();   // id → { task, ts }
const CACHE_TTL_MS = 30000;    // 30 seconds

// ===== Auth =====

async function login() {
  const pin = document.getElementById('pin-input').value.trim();
  if (!pin) return;
  const err = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');
  err.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlocking…';
  try {
    const res = await fetch(`${API}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    isGuest = false;
    localStorage.setItem('todo_token', token);
    localStorage.removeItem('todo_guest');
    showApp();
  } catch (e) {
    err.textContent = e.message || 'Incorrect PIN. Try again.';
    err.style.display = 'block';
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-input').focus();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-unlock-alt"></i> Unlock';
  }
}

async function loginAsGuest() {
  const btn = document.getElementById('btn-try-it');
  btn.disabled = true;
  btn.querySelector('strong').textContent = 'Starting demo…';
  try {
    const res = await fetch(`${API}/guest-auth`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    isGuest = true;
    localStorage.setItem('todo_token', token);
    localStorage.setItem('todo_guest', '1');
    showApp();
  } catch (e) {
    document.getElementById('login-error').textContent = e.message || 'Failed to start demo session.';
    document.getElementById('login-error').style.display = 'block';
    btn.disabled = false;
    btn.querySelector('strong').textContent = 'Try the Demo';
  }
}

// Feature 9 — Google Login callback (called by GSI library)
window.handleGoogleCredential = async function(response) {
  const err = document.getElementById('login-error');
  err.style.display = 'none';
  try {
    const res = await fetch(`${API}/google-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    isGuest = false;
    localStorage.setItem('todo_token', token);
    localStorage.removeItem('todo_guest');
    showApp();
  } catch (e) {
    err.textContent = e.message || 'Google sign-in failed.';
    err.style.display = 'block';
  }
};

function clearDetailPanel() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  currentTaskId = null;
  tables = [];
  Object.keys(_blobUrls).forEach(id => revokeBlobUrl(id));
  document.getElementById('detail-content').style.display = 'none';
  document.getElementById('detail-empty').style.display = 'flex';
  document.getElementById('detail-title').value = '';
  document.getElementById('detail-description').value = '';
  document.getElementById('description-preview').innerHTML = '';
  document.getElementById('description-preview').style.display = 'none';
  document.getElementById('detail-description').style.display = '';
  document.getElementById('subtask-list').innerHTML = '';
  document.getElementById('tables-container').innerHTML = '';
  document.getElementById('attachment-grid').innerHTML = '';
}

function logout() {
  localStorage.removeItem('todo_token');
  localStorage.removeItem('todo_guest');
  token = null; isGuest = false; tasks = []; taskCache.clear();
  clearDetailPanel();
  document.getElementById('app').style.display = 'none';
  document.getElementById('demo-banner').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('pin-input').value = '';
}

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('demo-banner').style.display = isGuest ? 'flex' : 'none';
  tasks = [];
  taskCache.clear();
  clearDetailPanel();
  await loadTasks();
}

// ===== API Helpers =====

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, ...(options.headers || {}) }
  });
  if (res.status === 401) { logout(); return null; }
  return res;
}

async function apiJSON(path, options = {}) {
  const res = await apiFetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res) return null;
  return res.json();
}

// ===== Tasks =====

async function loadTasks() {
  const list = document.getElementById('task-list');
  if (!tasks.length) list.innerHTML = '<div class="loading-tasks"><i class="fas fa-spinner fa-spin"></i></div>';
  const data = await apiJSON('/tasks');
  if (!data) return;
  tasks = data;
  renderTaskList();
  renderCalendar();
}

// Feature 7: filter by category first, then by filter tab
function filteredTasks() {
  const byCategory = currentCategory === 'all' ? tasks : tasks.filter(t => t.category === currentCategory);
  const today = new Date().toISOString().split('T')[0];
  switch (currentFilter) {
    case 'today':   return byCategory.filter(t => t.due_date === today && t.status !== 'done');
    case 'overdue': return byCategory.filter(t => t.due_date < today && t.status !== 'done');
    case 'done':    return byCategory.filter(t => t.status === 'done');
    case 'blocked': return byCategory.filter(t => t.status === 'blocked');
    case 'P0': case 'P1': case 'P2': case 'P3':
      return byCategory.filter(t => t.priority === currentFilter && t.status !== 'done');
    default: return byCategory;
  }
}

// Feature 3: status icon helper
function statusBadge(status) {
  if (status === 'in_progress') return '<span class="status-badge status-in-progress" title="In Progress"><i class="fas fa-sync fa-spin-slow"></i></span>';
  if (status === 'blocked')     return '<span class="status-badge status-blocked" title="Blocked"><i class="fas fa-ban"></i></span>';
  if (status === 'done')        return '<span class="status-badge status-done" title="Done"><i class="fas fa-check-circle"></i></span>';
  return '';
}

function renderTaskList() {
  const list = document.getElementById('task-list');
  const visible = filteredTasks();
  const today = new Date().toISOString().split('T')[0];
  if (!visible.length) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No tasks here</p></div>`;
    return;
  }

  // Feature 1: render as DOM nodes so we can attach drag events
  list.innerHTML = '';
  visible.forEach(t => {
    const overdue = t.due_date < today && t.status !== 'done';
    const cls = ['task-card', t.status === 'done' ? 'done' : '', overdue ? 'overdue' : '', t.id === currentTaskId ? 'selected' : ''].filter(Boolean).join(' ');

    const el = document.createElement('div');
    el.className = cls;
    el.dataset.id = t.id;
    el.draggable = true;
    el.innerHTML = `
      <div class="task-card-top">
        <label class="task-done-check" title="Mark done" onclick="event.stopPropagation()">
          <input type="checkbox" class="task-checkbox" ${t.status === 'done' ? 'checked' : ''} onchange="toggleTaskDone(event,'${t.id}','${t.status}')">
          <span class="task-checkmark"></span>
        </label>
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-card-right">
          ${statusBadge(t.status)}
          <span class="priority-badge ${t.priority}">${t.priority}</span>
        </div>
      </div>
      <div class="task-meta">
        <span class="task-due"><i class="fas fa-calendar-alt"></i> ${formatDate(t.due_date)}</span>
        <div class="task-counts">
          ${t.subtask_count > 0 ? `<span class="task-count-item"><i class="fas fa-list-check"></i> ${t.subtask_done}/${t.subtask_count}</span>` : ''}
          ${t.attachment_count > 0 ? `<span class="task-count-item"><i class="fas fa-paperclip"></i> ${t.attachment_count}</span>` : ''}
        </div>
      </div>`;

    // Click to select
    el.addEventListener('click', () => selectTask(t.id));

    // Feature 1: Drag & Drop
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    el.addEventListener('dragend', onDragEnd);

    list.appendChild(el);
  });
}

// Feature 2: toggle done from checkbox in left panel
async function toggleTaskDone(e, id, currentStatus) {
  e.stopPropagation();
  const newStatus = currentStatus === 'done' ? 'pending' : 'done';

  // Optimistic update
  tasks = tasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
  renderTaskList();
  if (currentTaskId === id) {
    document.getElementById('detail-status').value = newStatus;
  }
  taskCache.delete(id);

  await apiJSON(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus })
  });
}

// Feature 1: Drag & drop state + handlers
let dragSrcId = null;

function onDragStart(e) {
  dragSrcId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const el = e.currentTarget;
  if (el.dataset.id !== dragSrcId) el.classList.add('drag-over');
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function onDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove('drag-over');
  if (!dragSrcId || target.dataset.id === dragSrcId) return;

  // Reorder the visible tasks list in memory
  const visible = filteredTasks();
  const srcIdx  = visible.findIndex(t => t.id === dragSrcId);
  const dstIdx  = visible.findIndex(t => t.id === target.dataset.id);
  if (srcIdx === -1 || dstIdx === -1) return;

  const reordered = [...visible];
  const [moved] = reordered.splice(srcIdx, 1);
  reordered.splice(dstIdx, 0, moved);

  // Assign sort_order based on new position
  const updates = reordered.map((t, i) => ({ id: t.id, sort_order: i }));

  // Update in memory
  updates.forEach(u => {
    tasks = tasks.map(t => t.id === u.id ? { ...t, sort_order: u.sort_order } : t);
  });
  renderTaskList();

  // Persist to server
  await apiFetch('/tasks/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.task-card.drag-over').forEach(el => el.classList.remove('drag-over'));
  dragSrcId = null;
}

async function selectTask(id) {
  currentTaskId = id;
  renderTaskList();

  document.getElementById('detail-empty').style.display = 'none';
  document.getElementById('detail-content').style.display = 'block';
  document.getElementById('detail-title').value = '';
  document.getElementById('detail-description').value = '';
  document.getElementById('subtask-list').innerHTML = '<div class="loading-tasks"><i class="fas fa-spinner fa-spin"></i></div>';
  document.getElementById('attachment-grid').innerHTML = '';
  document.getElementById('tables-container').innerHTML = '';

  // Feature 6: use cache
  const cached = taskCache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    renderDetailPanel(cached.task);
    return;
  }

  const res = await apiFetch(`/tasks/${id}`);
  if (!res) return;
  const task = await res.json();
  taskCache.set(id, { task, ts: Date.now() });
  renderDetailPanel(task);
}

function renderDetailPanel(task) {
  document.getElementById('detail-empty').style.display = 'none';
  document.getElementById('detail-content').style.display = 'block';
  document.getElementById('detail-title').value = task.title;
  document.getElementById('detail-description').value = task.description || '';
  const ps = document.getElementById('detail-priority');
  ps.value = task.priority;
  ps.className = `meta-select priority-select ${task.priority}`;
  document.getElementById('detail-due').value = task.due_date;
  document.getElementById('detail-status').value = task.status;
  document.getElementById('detail-category').value = task.category || 'personal';
  tables = JSON.parse(task.table_data || '[]');
  renderSubtasks(task.subtasks || []);
  renderAttachments(task.attachments || []);
  renderTables();

  // Feature 4: show linkified preview on load
  showDescriptionPreview(task.description || '');
}

// ===== CRUD =====

async function createTask() {
  const title = document.getElementById('new-title').value.trim();
  if (!title) { document.getElementById('new-title').focus(); return; }
  const data = await apiJSON('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: document.getElementById('new-description').value,
      priority: document.getElementById('new-priority').value,
      category: document.getElementById('new-category').value,
      due_date: document.getElementById('new-due').value || new Date().toISOString().split('T')[0]
    })
  });
  const filesToUpload = [...pendingFiles];
  closeCreateModal();
  if (data?.id) {
    currentTaskId = data.id;
    await loadTasks();
    await selectTask(data.id);
    if (filesToUpload.length) await uploadFiles(filesToUpload);
  }
}

function scheduleDetailSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDetail, 800);
}

async function saveDetail() {
  if (!currentTaskId) return;
  const priority = document.getElementById('detail-priority').value;
  document.getElementById('detail-priority').className = `meta-select priority-select ${priority}`;

  const body = {
    title: document.getElementById('detail-title').value.trim(),
    description: document.getElementById('detail-description').value,
    priority,
    due_date: document.getElementById('detail-due').value,
    status: document.getElementById('detail-status').value,
    category: document.getElementById('detail-category').value,
    table_data: JSON.stringify(tables)
  };

  // Feature 6: update in-memory tasks without re-fetching full list
  tasks = tasks.map(t => t.id === currentTaskId ? { ...t, ...body } : t);
  taskCache.delete(currentTaskId);
  renderTaskList();
  renderCalendar();

  await apiJSON(`/tasks/${currentTaskId}`, { method: 'PUT', body: JSON.stringify(body) });
}

async function deleteTask() {
  if (!currentTaskId || !confirm('Delete this task and all its data?')) return;
  await apiFetch(`/tasks/${currentTaskId}`, { method: 'DELETE' });
  tasks = tasks.filter(t => t.id !== currentTaskId);
  taskCache.delete(currentTaskId);
  currentTaskId = null;
  tables = [];
  document.getElementById('detail-empty').style.display = 'flex';
  document.getElementById('detail-content').style.display = 'none';
  renderTaskList();
  renderCalendar();
}

// ===== Feature 4: Clickable links in description =====

// URL regex that matches http/https URLs
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

function linkify(text) {
  return esc(text).replace(URL_REGEX.source, url =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
}

// Proper linkify on raw text (escape first, then linkify)
function linkifyText(raw) {
  const escaped = String(raw || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return escaped.replace(URL_REGEX, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function showDescriptionPreview(text) {
  const textarea = document.getElementById('detail-description');
  const preview  = document.getElementById('description-preview');
  if (!text.trim()) {
    preview.innerHTML = '';
    preview.style.display = 'none';
    textarea.style.display = '';
    return;
  }
  preview.innerHTML = linkifyText(text).replace(/\n/g, '<br>');
  preview.style.display = 'block';
  textarea.style.display = 'none';
}

function editDescription() {
  const textarea = document.getElementById('detail-description');
  const preview  = document.getElementById('description-preview');
  preview.style.display = 'none';
  textarea.style.display = '';
  textarea.focus();
}

// ===== Subtasks =====

function renderSubtasks(subtasks) {
  document.getElementById('subtask-list').innerHTML = subtasks.map((s, idx) => `
    <div class="subtask-item" data-id="${s.id}" data-idx="${idx}">
      <input type="checkbox" class="subtask-check" ${s.completed ? 'checked' : ''} onchange="toggleSubtask('${s.id}', this.checked)">
      <input type="text" class="subtask-text ${s.completed ? 'done' : ''}" value="${esc(s.content)}"
        data-id="${s.id}" onblur="updateSubtaskText('${s.id}', this.value)"
        onkeydown="subtaskKeydown(event,'${s.id}')">
      <button class="subtask-delete" onclick="deleteSubtask('${s.id}')"><i class="fas fa-times"></i></button>
    </div>`).join('');
}

async function addSubtask(content) {
  if (!content.trim() || !currentTaskId) return;
  await apiFetch(`/tasks/${currentTaskId}/subtasks`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content.trim() })
  });
  document.getElementById('add-subtask-input').value = '';
  await refreshSubtasks();
}

async function toggleSubtask(id, completed) {
  document.querySelector(`.subtask-text[data-id="${id}"]`)?.classList.toggle('done', completed);
  await batchUpdateSubtasks();
}

async function updateSubtaskText(id, content) {
  if (!content.trim()) { await deleteSubtask(id); return; }
  await batchUpdateSubtasks();
}

async function deleteSubtask(id) {
  await apiFetch(`/tasks/${currentTaskId}/subtasks`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  await refreshSubtasks();
}

// Feature 5: Enter in middle of subtask splits it
async function subtaskKeydown(e, id) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const input  = e.target;
  const cursor = input.selectionStart;
  const before = input.value.slice(0, cursor);
  const after  = input.value.slice(cursor);

  // Update current subtask with text before cursor
  input.value = before;

  // Collect all current subtask elements
  const items = [...document.querySelectorAll('.subtask-item')];
  const srcIdx = items.findIndex(el => el.dataset.id === id);

  // Build new array inserting a new subtask after the current one
  const allSubtasks = items.map((el, i) => ({
    id: el.dataset.id,
    content: el.querySelector('.subtask-text').value,
    completed: el.querySelector('.subtask-check').checked ? 1 : 0,
    order_index: i
  }));

  const newId = crypto.randomUUID();
  const newSubtask = { id: newId, content: after || '', completed: 0, order_index: srcIdx + 1 };

  // Reindex order after insertion
  const merged = [
    ...allSubtasks.slice(0, srcIdx + 1),
    newSubtask,
    ...allSubtasks.slice(srcIdx + 1)
  ].map((s, i) => ({ ...s, order_index: i }));

  // Optimistic render
  renderSubtasks(merged.map(s => ({ ...s, completed: s.completed === 1 })));

  // Persist using INSERT OR REPLACE batch
  await apiFetch(`/tasks/${currentTaskId}/subtasks`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(merged)
  });

  // Focus the new input
  const newInput = document.querySelector(`.subtask-text[data-id="${newId}"]`);
  if (newInput) { newInput.focus(); newInput.setSelectionRange(0, 0); }

  // Update task card subtask counts
  await refreshSubtasks();
}

async function batchUpdateSubtasks() {
  const items = [...document.querySelectorAll('.subtask-item')];
  const subtasks = items.map((el, i) => ({
    id: el.dataset.id,
    content: el.querySelector('.subtask-text').value,
    completed: el.querySelector('.subtask-check').checked ? 1 : 0,
    order_index: i
  }));
  await apiFetch(`/tasks/${currentTaskId}/subtasks`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subtasks)
  });

  // Feature 6: update local task counts, skip loadTasks()
  const done = subtasks.filter(s => s.completed).length;
  tasks = tasks.map(t => t.id === currentTaskId
    ? { ...t, subtask_count: subtasks.length, subtask_done: done }
    : t);
  renderTaskList();
}

async function refreshSubtasks() {
  taskCache.delete(currentTaskId);
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
  taskCache.set(currentTaskId, { task, ts: Date.now() });
  renderSubtasks(task.subtasks || []);
  tasks = tasks.map(t => t.id === currentTaskId
    ? { ...t, subtask_count: task.subtasks.length, subtask_done: task.subtasks.filter(s => s.completed).length }
    : t);
  renderTaskList();
}

// ===== Tables =====

function renderTables() {
  const container = document.getElementById('tables-container');
  if (!tables.length) { container.innerHTML = ''; return; }
  container.innerHTML = `<div class="tables-list">${tables.map((t, ti) => renderTableHTML(t, ti)).join('')}</div>`;
}

function renderTableHTML(t, ti) {
  const colgroup = `<colgroup>${t.columns.map(() => '<col>').join('')}<col style="width:28px"></colgroup>`;

  const colDelCells = t.columns.map((_, ci) =>
    `<td class="col-del-cell"><button class="btn-del-col" onclick="deleteTableCol(${ti},${ci})" title="Delete column"><i class="fas fa-times"></i></button></td>`
  ).join('');

  const headerCells = t.columns.map((col, ci) =>
    `<th><input value="${esc(col)}" placeholder="Column ${ci+1}" onchange="updateTableCol(${ti},${ci},this.value)" onblur="saveDetail()"></th>`
  ).join('');

  const rows = t.rows.map((row, ri) => {
    const cells = row.map((cell, ci) =>
      `<td><input value="${esc(cell)}" onchange="updateTableCell(${ti},${ri},${ci},this.value)" onblur="saveDetail()"></td>`
    ).join('');
    return `<tr>${cells}<td class="row-del-cell"><button class="btn-del-row" onclick="deleteTableRow(${ti},${ri})" title="Delete row"><i class="fas fa-times"></i></button></td></tr>`;
  }).join('');

  return `<div class="task-table-wrapper">
    <div class="task-table-header">
      <input class="task-table-title" value="${esc(t.title || '')}" placeholder="Table title (optional)" onchange="updateTableTitle(${ti},this.value)" onblur="saveDetail()">
      <div class="task-table-controls">
        <button class="btn-table-ctrl" onclick="addTableRow(${ti})"><i class="fas fa-plus"></i> Row</button>
        <button class="btn-table-ctrl" onclick="addTableCol(${ti})"><i class="fas fa-plus"></i> Col</button>
        <button class="btn-table-ctrl del" onclick="deleteTable(${ti})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="task-table-scroll">
      <table class="task-table">
        ${colgroup}
        <thead>
          <tr class="col-del-row">${colDelCells}<td class="row-del-cell"></td></tr>
          <tr>${headerCells}<th class="row-del-cell"></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function createTable(rows, cols) {
  tables.push({
    id: crypto.randomUUID(),
    title: '',
    columns: Array.from({ length: cols }, (_, i) => `Column ${i + 1}`),
    rows: Array.from({ length: rows }, () => Array(cols).fill(''))
  });
  renderTables();
  saveDetail();
}

function deleteTable(ti) { tables.splice(ti, 1); renderTables(); saveDetail(); }
function addTableRow(ti) { tables[ti].rows.push(Array(tables[ti].columns.length).fill('')); renderTables(); saveDetail(); }
function addTableCol(ti) { tables[ti].columns.push(`Column ${tables[ti].columns.length + 1}`); tables[ti].rows.forEach(r => r.push('')); renderTables(); saveDetail(); }
function deleteTableRow(ti, ri) { if (tables[ti].rows.length <= 1) return; tables[ti].rows.splice(ri, 1); renderTables(); saveDetail(); }
function deleteTableCol(ti, ci) { if (tables[ti].columns.length <= 1) return; tables[ti].columns.splice(ci, 1); tables[ti].rows.forEach(r => r.splice(ci, 1)); renderTables(); saveDetail(); }
function updateTableTitle(ti, val) { tables[ti].title = val; }
function updateTableCol(ti, ci, val) { tables[ti].columns[ci] = val; }
function updateTableCell(ti, ri, ci, val) { tables[ti].rows[ri][ci] = val; }

// ===== Table Picker =====

function initTablePicker() {
  const btn = document.getElementById('btn-add-table');
  const picker = document.getElementById('table-picker');
  const grid = document.getElementById('picker-grid');
  const label = document.getElementById('picker-label');
  const ROWS = 8, COLS = 8;

  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'picker-cell';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.addEventListener('mouseenter', () => {
        label.textContent = `${r} × ${c}`;
        document.querySelectorAll('.picker-cell').forEach(el => {
          el.classList.toggle('highlighted', +el.dataset.r <= r && +el.dataset.c <= c);
        });
      });
      cell.addEventListener('click', () => {
        createTable(r, c);
        picker.classList.remove('open');
      });
      grid.appendChild(cell);
    }
  }

  btn.addEventListener('click', (e) => { e.stopPropagation(); picker.classList.toggle('open'); });
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && e.target !== btn) picker.classList.remove('open');
  });
}

// ===== Attachments =====

function isHeicFile(a) {
  return /heic|heif/i.test(a.content_type || '') || /\.(heic|heif)$/i.test(a.filename || '');
}

const _blobUrls = {};
function revokeBlobUrl(id) { if (_blobUrls[id]) { URL.revokeObjectURL(_blobUrls[id]); delete _blobUrls[id]; } }

async function loadImageBlob(id) {
  revokeBlobUrl(id);
  const placeholder = document.getElementById(`img-placeholder-${id}`);
  if (!placeholder) return;
  try {
    const res = await apiFetch(`/attachments/${id}`);
    if (!res) throw new Error();
    const blob = await res.blob();
    let finalBlob = blob;
    if (/heic|heif/i.test(blob.type) || blob.type === '') {
      try {
        if (typeof heic2any !== 'undefined') {
          const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 });
          finalBlob = Array.isArray(result) ? result[0] : result;
        }
      } catch { /* not heic, use original blob */ }
    }
    const url = URL.createObjectURL(finalBlob);
    _blobUrls[id] = url;
    const img = document.createElement('img');
    img.className = 'attachment-thumb';
    img.style.cursor = 'pointer';
    img.alt = '';
    img.onclick = () => openLightbox(url);
    img.onerror = () => placeholder.replaceWith(Object.assign(document.createElement('div'), { className: 'attachment-file-icon', innerHTML: '<i class="fas fa-image"></i><span>Image</span>' }));
    img.src = url;
    placeholder.replaceWith(img);
  } catch {
    if (placeholder) placeholder.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--danger)"></i>';
  }
}

function renderAttachments(attachments) {
  const grid = document.getElementById('attachment-grid');
  if (!attachments.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = attachments.map(a => {
    const heic = isHeicFile(a);
    const isImage = a.content_type?.startsWith('image/') || heic;
    const preview = isImage
      ? `<div class="attachment-heic-zone" id="img-placeholder-${a.id}"><i class="fas fa-spinner fa-spin"></i></div>`
      : `<div class="attachment-file-icon"><i class="${fileIcon(a.content_type)}"></i><span>${esc(fileExt(a.filename))}</span></div>`;

    return `<div class="attachment-item">
      ${preview}
      <div class="attachment-footer">
        <span class="attachment-name" title="${esc(a.filename)}">${esc(a.filename)}</span>
        <div class="attachment-actions">
          <button class="btn-attach-action download" onclick="downloadAttachment('${a.id}','${esc(a.filename)}')" title="Download"><i class="fas fa-download"></i></button>
          <button class="btn-attach-action delete" onclick="deleteAttachment('${a.id}')" title="Remove"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');

  attachments.filter(a => a.content_type?.startsWith('image/') || isHeicFile(a))
    .forEach(a => loadImageBlob(a.id));
}

async function uploadFiles(files) {
  if (!files.length || !currentTaskId) return;
  const progress = document.getElementById('upload-progress');
  progress.style.display = 'block';
  for (const file of files) {
    const form = new FormData();
    form.append('file', file);
    form.append('task_id', currentTaskId);
    await apiFetch('/attachments', { method: 'POST', body: form });
  }
  progress.style.display = 'none';
  taskCache.delete(currentTaskId);
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
  taskCache.set(currentTaskId, { task, ts: Date.now() });
  renderAttachments(task.attachments || []);
  tasks = tasks.map(t => t.id === currentTaskId ? { ...t, attachment_count: task.attachments.length } : t);
  renderTaskList();
}

async function downloadAttachment(id, filename) {
  try {
    const res = await apiFetch(`/attachments/${id}`);
    if (!res) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch { /* silent fail */ }
}

async function deleteAttachment(id) {
  await apiFetch(`/attachments/${id}`, { method: 'DELETE' });
  taskCache.delete(currentTaskId);
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
  taskCache.set(currentTaskId, { task, ts: Date.now() });
  renderAttachments(task.attachments || []);
  tasks = tasks.map(t => t.id === currentTaskId ? { ...t, attachment_count: task.attachments.length } : t);
  renderTaskList();
}

// ===== Lightbox =====
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src.startsWith('blob:') ? src : src + '?t=' + Date.now();
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox-img').src = '';
}

// ===== Feature 8: Calendar View =====

function renderCalendar() {
  if (viewMode !== 'calendar') return;
  const grid = document.getElementById('cal-grid');
  const title = document.getElementById('cal-title');
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  title.textContent = `${monthNames[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  grid.innerHTML = '';

  // Empty cells before month start
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day cal-day--empty';
    grid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = filteredTasks().filter(t => t.due_date === dateStr && t.status !== 'done');
    const isToday = dateStr === today;

    const cell = document.createElement('div');
    cell.className = `cal-day${isToday ? ' cal-day--today' : ''}`;

    cell.innerHTML = `<span class="cal-day-num">${d}</span>`;
    dayTasks.slice(0, 3).forEach(t => {
      const chip = document.createElement('div');
      chip.className = `cal-task-chip priority-chip-${t.priority}`;
      chip.textContent = t.title;
      chip.title = t.title;
      chip.addEventListener('click', () => selectTask(t.id));
      cell.appendChild(chip);
    });
    if (dayTasks.length > 3) {
      const more = document.createElement('div');
      more.className = 'cal-more';
      more.textContent = `+${dayTasks.length - 3} more`;
      cell.appendChild(more);
    }
    grid.appendChild(cell);
  }
}

function switchView(mode) {
  viewMode = mode;
  const listEl = document.getElementById('task-list');
  const calEl  = document.getElementById('calendar-view');
  const btnList = document.getElementById('btn-list-view');
  const btnCal  = document.getElementById('btn-cal-view');
  if (mode === 'calendar') {
    listEl.style.display = 'none';
    calEl.style.display = 'block';
    btnCal.classList.add('active');
    btnList.classList.remove('active');
    renderCalendar();
  } else {
    listEl.style.display = '';
    calEl.style.display = 'none';
    btnList.classList.add('active');
    btnCal.classList.remove('active');
    renderTaskList();
  }
}

// ===== Create Modal =====

function openCreateModal() {
  document.getElementById('new-title').value = '';
  document.getElementById('new-description').value = '';
  document.getElementById('new-priority').value = 'P1';
  document.getElementById('new-category').value = currentCategory !== 'all' ? currentCategory : 'personal';
  document.getElementById('new-due').value = new Date().toISOString().split('T')[0];
  pendingFiles = [];
  renderPendingFiles();
  document.getElementById('create-modal').classList.add('open');
  setTimeout(() => document.getElementById('new-title').focus(), 50);
}

function closeCreateModal() {
  pendingFiles = [];
  renderPendingFiles();
  document.getElementById('create-modal').classList.remove('open');
}

function addPendingFiles(files) { pendingFiles.push(...files); renderPendingFiles(); }
function removePendingFile(index) { pendingFiles.splice(index, 1); renderPendingFiles(); }
function renderPendingFiles() {
  const list = document.getElementById('new-file-list');
  if (!pendingFiles.length) { list.innerHTML = ''; return; }
  list.innerHTML = pendingFiles.map((f, i) => `
    <div class="new-file-item">
      <i class="fas ${fileIcon(f.type)}" style="color:var(--primary);flex-shrink:0"></i>
      <span title="${esc(f.name)}">${esc(f.name)}</span>
      <button class="new-file-remove" onclick="removePendingFile(${i})"><i class="fas fa-times"></i></button>
    </div>`).join('');
}

// ===== Resize Handle =====

function initResizeHandle() {
  const handle = document.getElementById('resize-handle');
  const panel = document.getElementById('task-list-panel');
  if (!handle || !panel) return;

  const saved = localStorage.getItem('todo_panel_width');
  if (saved) panel.style.width = saved;

  let startX, startWidth;
  function startResize(clientX) { startX = clientX; startWidth = parseInt(getComputedStyle(panel).width); handle.classList.add('dragging'); document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }
  function doResize(clientX) { const w = startWidth + (clientX - startX); if (w >= 220 && w <= 560) panel.style.width = w + 'px'; }
  function endResize() { handle.classList.remove('dragging'); document.body.style.cursor = ''; document.body.style.userSelect = ''; localStorage.setItem('todo_panel_width', panel.style.width); }

  handle.addEventListener('mousedown', (e) => { startResize(e.clientX); const onMove = (e) => doResize(e.clientX); const onUp = () => { endResize(); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); });
  handle.addEventListener('touchstart', (e) => { e.preventDefault(); startResize(e.touches[0].clientX); const onMove = (e) => { e.preventDefault(); doResize(e.touches[0].clientX); }; const onUp = () => { endResize(); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp); }; document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onUp); }, { passive: false });
}

// ===== Utils =====

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '';
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (d === today) return 'Today';
  if (d === tomorrow) return 'Tomorrow';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fileExt(filename) { return filename.split('.').pop()?.toUpperCase() || 'FILE'; }

function fileIcon(contentType) {
  if (!contentType) return 'fas fa-file';
  if (contentType.includes('pdf'))  return 'fas fa-file-pdf';
  if (contentType.includes('word') || contentType.includes('document')) return 'fas fa-file-word';
  if (contentType.includes('sheet') || contentType.includes('excel')) return 'fas fa-file-excel';
  if (contentType.includes('zip')  || contentType.includes('compressed')) return 'fas fa-file-archive';
  if (contentType.includes('video')) return 'fas fa-file-video';
  if (contentType.includes('audio')) return 'fas fa-file-audio';
  if (contentType.includes('text'))  return 'fas fa-file-alt';
  return 'fas fa-file';
}

// ===== Boot =====

document.addEventListener('DOMContentLoaded', () => {
  // Auth
  document.getElementById('btn-login').addEventListener('click', login);
  document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  document.getElementById('pin-input').addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === 'Go') login(); });
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-try-it').addEventListener('click', loginAsGuest);
  document.getElementById('demo-banner-exit').addEventListener('click', logout);

  // Feature 9: Google login button — show native Google prompt
  document.getElementById('btn-google-login').addEventListener('click', () => {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.prompt();
    } else {
      document.getElementById('login-error').textContent = 'Google sign-in is not configured.';
      document.getElementById('login-error').style.display = 'block';
    }
  });

  // New task
  document.getElementById('btn-new-task').addEventListener('click', openCreateModal);
  document.getElementById('btn-cancel-create').addEventListener('click', closeCreateModal);
  document.getElementById('btn-confirm-create').addEventListener('click', createTask);
  document.getElementById('create-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCreateModal(); });
  document.getElementById('new-title').addEventListener('keydown', e => { if (e.key === 'Enter') createTask(); });

  // Feature 7: Category tabs
  document.getElementById('category-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCategory = tab.dataset.cat;
    renderTaskList();
    renderCalendar();
  });

  // Filters
  document.getElementById('filter-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderTaskList();
    renderCalendar();
  });

  // Feature 8: View toggle
  document.getElementById('btn-list-view').addEventListener('click', () => switchView('list'));
  document.getElementById('btn-cal-view').addEventListener('click', () => switchView('calendar'));
  document.getElementById('cal-prev').addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
  document.getElementById('cal-next').addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });
  document.getElementById('cal-today').addEventListener('click', () => { const now = new Date(); calYear = now.getFullYear(); calMonth = now.getMonth(); renderCalendar(); });

  // Detail auto-save (Feature 6: no full reload)
  ['detail-title','detail-description','detail-priority','detail-due','detail-status','detail-category'].forEach(id => {
    document.getElementById(id).addEventListener('input', scheduleDetailSave);
    document.getElementById(id).addEventListener('change', scheduleDetailSave);
  });

  // Feature 4: description preview toggle
  document.getElementById('detail-description').addEventListener('blur', () => {
    showDescriptionPreview(document.getElementById('detail-description').value);
  });
  document.getElementById('description-preview').addEventListener('click', (e) => {
    // Don't intercept link clicks
    if (e.target.tagName === 'A') return;
    editDescription();
  });

  // Delete task
  document.getElementById('btn-delete-task').addEventListener('click', deleteTask);

  // Subtask
  document.getElementById('add-subtask-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addSubtask(e.target.value);
  });

  // Detail file upload
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => uploadFiles([...fileInput.files]));
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); uploadFiles([...e.dataTransfer.files]); });

  // Modal file attachment
  const newZone  = document.getElementById('new-upload-zone');
  const newInput = document.getElementById('new-file-input');
  newZone.addEventListener('click', () => newInput.click());
  newInput.addEventListener('change', () => { addPendingFiles([...newInput.files]); newInput.value = ''; });
  newZone.addEventListener('dragover', e => { e.preventDefault(); newZone.classList.add('drag-over'); });
  newZone.addEventListener('dragleave', () => newZone.classList.remove('drag-over'));
  newZone.addEventListener('drop', e => { e.preventDefault(); newZone.classList.remove('drag-over'); addPendingFiles([...e.dataTransfer.files]); });

  // Lightbox
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', e => { if (e.target === e.currentTarget) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  // Init features
  initResizeHandle();
  initTablePicker();

  if (token) showApp();
});
