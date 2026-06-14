const API = '/apps/todo/api';
let token = localStorage.getItem('todo_token');
let tasks = [];
let currentTaskId = null;
let currentFilter = 'all';
let saveTimer = null;

// ===== Auth =====

async function login() {
  const pin = document.getElementById('pin-input').value;
  const err = document.getElementById('login-error');
  err.style.display = 'none';

  try {
    const res = await fetch(`${API}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('todo_token', token);
    showApp();
  } catch (e) {
    err.textContent = e.message || 'Incorrect PIN. Try again.';
    err.style.display = 'block';
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-input').focus();
  }
}

function logout() {
  localStorage.removeItem('todo_token');
  token = null;
  tasks = [];
  currentTaskId = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('pin-input').value = '';
}

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  await loadTasks();
}

// ===== API helpers =====

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
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
  const data = await apiJSON('/tasks');
  if (!data) return;
  tasks = data;
  renderTaskList();
  if (currentTaskId) {
    const still = tasks.find(t => t.id === currentTaskId);
    if (still) renderTaskCard(still);
  }
}

function filteredTasks() {
  const today = new Date().toISOString().split('T')[0];
  switch (currentFilter) {
    case 'today': return tasks.filter(t => t.due_date === today && t.status !== 'done');
    case 'overdue': return tasks.filter(t => t.due_date < today && t.status !== 'done');
    case 'done': return tasks.filter(t => t.status === 'done');
    case 'P1': case 'P2': case 'P3': case 'P4':
      return tasks.filter(t => t.priority === currentFilter && t.status !== 'done');
    default: return tasks;
  }
}

function renderTaskList() {
  const list = document.getElementById('task-list');
  const visible = filteredTasks();
  const today = new Date().toISOString().split('T')[0];

  if (!visible.length) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No tasks here</p></div>`;
    return;
  }

  list.innerHTML = visible.map(t => {
    const overdue = t.due_date < today && t.status !== 'done';
    const classes = ['task-card', t.status === 'done' ? 'done' : '', overdue ? 'overdue' : '', t.id === currentTaskId ? 'selected' : ''].filter(Boolean).join(' ');
    return `
      <div class="${classes}" data-id="${t.id}" onclick="selectTask('${t.id}')">
        <div class="task-card-top">
          <div class="task-title">${esc(t.title)}</div>
          <span class="priority-badge ${t.priority}">${t.priority}</span>
        </div>
        <div class="task-meta">
          <span class="task-due"><i class="fas fa-calendar-alt"></i> ${formatDate(t.due_date)}</span>
          <div class="task-counts">
            ${t.subtask_count > 0 ? `<span class="task-count-item"><i class="fas fa-list-check"></i> ${t.subtask_done}/${t.subtask_count}</span>` : ''}
            ${t.attachment_count > 0 ? `<span class="task-count-item"><i class="fas fa-paperclip"></i> ${t.attachment_count}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

async function selectTask(id) {
  currentTaskId = id;
  renderTaskList();
  const res = await apiFetch(`/tasks/${id}`);
  if (!res) return;
  const task = await res.json();
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

  renderSubtasks(task.subtasks || []);
  renderAttachments(task.attachments || []);
}

// ===== Task CRUD =====

async function createTask() {
  const title = document.getElementById('new-title').value.trim();
  if (!title) { document.getElementById('new-title').focus(); return; }

  const data = await apiJSON('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: document.getElementById('new-description').value,
      priority: document.getElementById('new-priority').value,
      due_date: document.getElementById('new-due').value || new Date().toISOString().split('T')[0]
    })
  });

  closeCreateModal();
  if (data?.id) {
    await loadTasks();
    selectTask(data.id);
  }
}

function scheduleDetailSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDetail, 800);
}

async function saveDetail() {
  if (!currentTaskId) return;
  const priority = document.getElementById('detail-priority').value;
  const ps = document.getElementById('detail-priority');
  ps.className = `meta-select priority-select ${priority}`;

  await apiJSON(`/tasks/${currentTaskId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: document.getElementById('detail-title').value.trim(),
      description: document.getElementById('detail-description').value,
      priority,
      due_date: document.getElementById('detail-due').value,
      status: document.getElementById('detail-status').value
    })
  });
  await loadTasks();
}

async function deleteTask() {
  if (!currentTaskId || !confirm('Delete this task and all its data?')) return;
  await apiFetch(`/tasks/${currentTaskId}`, { method: 'DELETE' });
  currentTaskId = null;
  document.getElementById('detail-empty').style.display = 'flex';
  document.getElementById('detail-content').style.display = 'none';
  await loadTasks();
}

// ===== Subtasks =====

function renderSubtasks(subtasks) {
  const list = document.getElementById('subtask-list');
  list.innerHTML = subtasks.map(s => `
    <div class="subtask-item" data-id="${s.id}">
      <input type="checkbox" class="subtask-check" ${s.completed ? 'checked' : ''} onchange="toggleSubtask('${s.id}', this.checked)">
      <input type="text" class="subtask-text ${s.completed ? 'done' : ''}" value="${esc(s.content)}"
        data-id="${s.id}" onblur="updateSubtaskText('${s.id}', this.value)" onkeydown="subtaskKeydown(event, '${s.id}')">
      <button class="subtask-delete" onclick="deleteSubtask('${s.id}')"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

async function addSubtask(content) {
  if (!content.trim() || !currentTaskId) return;
  await apiFetch(`/tasks/${currentTaskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content.trim() })
  });
  document.getElementById('add-subtask-input').value = '';
  await refreshSubtasks();
}

async function toggleSubtask(id, completed) {
  const input = document.querySelector(`.subtask-text[data-id="${id}"]`);
  if (input) input.classList.toggle('done', completed);
  await batchUpdateSubtasks();
}

async function updateSubtaskText(id, content) {
  if (!content.trim()) { await deleteSubtask(id); return; }
  await batchUpdateSubtasks();
}

async function deleteSubtask(id) {
  await apiFetch(`/tasks/${currentTaskId}/subtasks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
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
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subtasks)
  });
  await loadTasks();
}

async function refreshSubtasks() {
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
  renderSubtasks(task.subtasks || []);
  tasks = tasks.map(t => t.id === currentTaskId ? { ...t, subtask_count: task.subtasks.length, subtask_done: task.subtasks.filter(s => s.completed).length } : t);
  renderTaskList();
}

function subtaskKeydown(e, id) {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('add-subtask-input').focus();
  }
}

// ===== Attachments =====

function renderAttachments(attachments) {
  const grid = document.getElementById('attachment-grid');
  if (!attachments.length) { grid.innerHTML = ''; return; }

  grid.innerHTML = attachments.map(a => {
    const isImage = a.content_type?.startsWith('image/');
    const imgUrl = `/apps/todo/api/attachments/${a.id}`;
    return `
      <div class="attachment-item">
        ${isImage
          ? `<img class="attachment-thumb" src="${imgUrl}" alt="${esc(a.filename)}" onclick="openLightbox('${imgUrl}')" loading="lazy">`
          : `<div class="attachment-file-icon"><i class="${fileIcon(a.content_type)}"></i><span>${esc(fileExt(a.filename))}</span></div>`
        }
        <div class="attachment-footer">
          <span class="attachment-name" title="${esc(a.filename)}">${esc(a.filename)}</span>
          <div class="attachment-actions">
            <a class="btn-attach-action download" href="${imgUrl}?download=1" download="${esc(a.filename)}" title="Download">
              <i class="fas fa-download"></i>
            </a>
            <button class="btn-attach-action delete" onclick="deleteAttachment('${a.id}')" title="Remove">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
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
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
  renderAttachments(task.attachments || []);
  tasks = tasks.map(t => t.id === currentTaskId ? { ...t, attachment_count: task.attachments.length } : t);
  renderTaskList();
}

async function deleteAttachment(id) {
  await apiFetch(`/attachments/${id}`, { method: 'DELETE' });
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
  renderAttachments(task.attachments || []);
  tasks = tasks.map(t => t.id === currentTaskId ? { ...t, attachment_count: task.attachments.length } : t);
  renderTaskList();
}

// ===== Lightbox =====

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src + '?t=' + Date.now();
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox-img').src = '';
}

// ===== Create Modal =====

function openCreateModal() {
  document.getElementById('new-title').value = '';
  document.getElementById('new-description').value = '';
  document.getElementById('new-priority').value = 'P1';
  document.getElementById('new-due').value = new Date().toISOString().split('T')[0];
  document.getElementById('create-modal').classList.add('open');
  document.getElementById('new-title').focus();
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('open');
}

// ===== Utils =====

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '';
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (d === today) return 'Today';
  if (d === tomorrow) return 'Tomorrow';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fileExt(filename) {
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
}

function fileIcon(contentType) {
  if (!contentType) return 'fas fa-file';
  if (contentType.includes('pdf')) return 'fas fa-file-pdf';
  if (contentType.includes('word') || contentType.includes('document')) return 'fas fa-file-word';
  if (contentType.includes('sheet') || contentType.includes('excel')) return 'fas fa-file-excel';
  if (contentType.includes('zip') || contentType.includes('compressed')) return 'fas fa-file-archive';
  if (contentType.includes('video')) return 'fas fa-file-video';
  if (contentType.includes('audio')) return 'fas fa-file-audio';
  if (contentType.includes('text')) return 'fas fa-file-alt';
  return 'fas fa-file';
}

// ===== Event Listeners =====

document.addEventListener('DOMContentLoaded', () => {
  // Auth
  document.getElementById('btn-login').addEventListener('click', login);
  document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  document.getElementById('btn-logout').addEventListener('click', logout);

  // New task
  document.getElementById('btn-new-task').addEventListener('click', openCreateModal);
  document.getElementById('btn-cancel-create').addEventListener('click', closeCreateModal);
  document.getElementById('btn-confirm-create').addEventListener('click', createTask);
  document.getElementById('create-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCreateModal();
  });
  document.getElementById('new-title').addEventListener('keydown', e => {
    if (e.key === 'Enter') createTask();
  });

  // Filters
  document.getElementById('filter-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderTaskList();
  });

  // Detail auto-save
  ['detail-title', 'detail-description', 'detail-priority', 'detail-due', 'detail-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', scheduleDetailSave);
    document.getElementById(id).addEventListener('change', scheduleDetailSave);
  });

  // Delete
  document.getElementById('btn-delete-task').addEventListener('click', deleteTask);

  // Subtask add
  document.getElementById('add-subtask-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addSubtask(e.target.value);
  });

  // File upload
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => uploadFiles([...fileInput.files]));

  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    uploadFiles([...e.dataTransfer.files]);
  });

  // Lightbox
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeLightbox();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  // Boot
  if (token) {
    showApp();
  }
});
