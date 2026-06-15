const API = '/apps/todo/api';
let token = localStorage.getItem('todo_token');
let isGuest = localStorage.getItem('todo_guest') === '1';
let tasks = [];
let currentTaskId = null;
let currentFilter = 'all';
let saveTimer = null;
let pendingFiles = [];
let tables = [];

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
    isGuest = false;
    localStorage.setItem('todo_token', token);
    localStorage.removeItem('todo_guest');
    showApp();
  } catch (e) {
    err.textContent = e.message || 'Incorrect PIN. Try again.';
    err.style.display = 'block';
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-input').focus();
  }
}

async function loginAsGuest() {
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
    document.getElementById('login-error').textContent = 'Failed to start demo session.';
    document.getElementById('login-error').style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('todo_token');
  localStorage.removeItem('todo_guest');
  token = null; isGuest = false; tasks = []; currentTaskId = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('demo-banner').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('pin-input').value = '';
}

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('demo-banner').style.display = isGuest ? 'flex' : 'none';
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
  const data = await apiJSON('/tasks');
  if (!data) return;
  tasks = data;
  renderTaskList();
  if (currentTaskId && tasks.find(t => t.id === currentTaskId)) renderTaskCard(tasks.find(t => t.id === currentTaskId));
}

function filteredTasks() {
  const today = new Date().toISOString().split('T')[0];
  switch (currentFilter) {
    case 'today': return tasks.filter(t => t.due_date === today && t.status !== 'done');
    case 'overdue': return tasks.filter(t => t.due_date < today && t.status !== 'done');
    case 'done': return tasks.filter(t => t.status === 'done');
    case 'P0': case 'P1': case 'P2': case 'P3':
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
    const cls = ['task-card', t.status === 'done' ? 'done' : '', overdue ? 'overdue' : '', t.id === currentTaskId ? 'selected' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}" data-id="${t.id}" onclick="selectTask('${t.id}')">
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
  tables = JSON.parse(task.table_data || '[]');
  renderSubtasks(task.subtasks || []);
  renderAttachments(task.attachments || []);
  renderTables();
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
  await apiJSON(`/tasks/${currentTaskId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: document.getElementById('detail-title').value.trim(),
      description: document.getElementById('detail-description').value,
      priority,
      due_date: document.getElementById('detail-due').value,
      status: document.getElementById('detail-status').value,
      table_data: JSON.stringify(tables)
    })
  });
  await loadTasks();
}

async function deleteTask() {
  if (!currentTaskId || !confirm('Delete this task and all its data?')) return;
  await apiFetch(`/tasks/${currentTaskId}`, { method: 'DELETE' });
  currentTaskId = null;
  tables = [];
  document.getElementById('detail-empty').style.display = 'flex';
  document.getElementById('detail-content').style.display = 'none';
  await loadTasks();
}

// ===== Subtasks =====

function renderSubtasks(subtasks) {
  document.getElementById('subtask-list').innerHTML = subtasks.map(s => `
    <div class="subtask-item" data-id="${s.id}">
      <input type="checkbox" class="subtask-check" ${s.completed ? 'checked' : ''} onchange="toggleSubtask('${s.id}', this.checked)">
      <input type="text" class="subtask-text ${s.completed ? 'done' : ''}" value="${esc(s.content)}"
        data-id="${s.id}" onblur="updateSubtaskText('${s.id}', this.value)" onkeydown="subtaskKeydown(event)">
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
  await loadTasks();
}

async function refreshSubtasks() {
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
  renderSubtasks(task.subtasks || []);
  tasks = tasks.map(t => t.id === currentTaskId
    ? { ...t, subtask_count: task.subtasks.length, subtask_done: task.subtasks.filter(s => s.completed).length }
    : t);
  renderTaskList();
}

function subtaskKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('add-subtask-input').focus(); }
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

function deleteTable(ti) {
  tables.splice(ti, 1);
  renderTables();
  saveDetail();
}

function addTableRow(ti) {
  tables[ti].rows.push(Array(tables[ti].columns.length).fill(''));
  renderTables();
  saveDetail();
}

function addTableCol(ti) {
  tables[ti].columns.push(`Column ${tables[ti].columns.length + 1}`);
  tables[ti].rows.forEach(r => r.push(''));
  renderTables();
  saveDetail();
}

function deleteTableRow(ti, ri) {
  if (tables[ti].rows.length <= 1) return;
  tables[ti].rows.splice(ri, 1);
  renderTables();
  saveDetail();
}

function deleteTableCol(ti, ci) {
  if (tables[ti].columns.length <= 1) return;
  tables[ti].columns.splice(ci, 1);
  tables[ti].rows.forEach(r => r.splice(ci, 1));
  renderTables();
  saveDetail();
}

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

  // Build grid cells
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

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    picker.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && e.target !== btn) picker.classList.remove('open');
  });
}

// ===== Attachments =====

function isHeicFile(a) {
  return /heic|heif/i.test(a.content_type || '') || /\.(heic|heif)$/i.test(a.filename || '');
}

const _blobUrls = {};

function revokeBlobUrl(id) {
  if (_blobUrls[id]) { URL.revokeObjectURL(_blobUrls[id]); delete _blobUrls[id]; }
}

async function loadImageBlob(id) {
  revokeBlobUrl(id);
  const placeholder = document.getElementById(`img-placeholder-${id}`);
  if (!placeholder) return;
  try {
    const res = await apiFetch(`/attachments/${id}`);
    if (!res) throw new Error();
    const blob = await res.blob();
    // Auto-convert HEIC blobs (iOS uploads as HEIC even for regular image slots)
    let finalBlob = blob;
    if (/heic|heif/i.test(blob.type) || blob.type === '' ) {
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
    placeholder.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--danger)"></i>';
  }
}

function renderAttachments(attachments) {
  const grid = document.getElementById('attachment-grid');
  if (!attachments.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = attachments.map(a => {
    const apiUrl = `/apps/todo/api/attachments/${a.id}`;
    const heic = isHeicFile(a);
    const isImage = a.content_type?.startsWith('image/') || heic;

    let preview;
    if (isImage) {
      // All images fetched via apiFetch to send auth token — no bare <img src> to API
      preview = `<div class="attachment-heic-zone" id="img-placeholder-${a.id}"><i class="fas fa-spinner fa-spin"></i></div>`;
    } else {
      preview = `<div class="attachment-file-icon"><i class="${fileIcon(a.content_type)}"></i><span>${esc(fileExt(a.filename))}</span></div>`;
    }

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

  // Load all images authenticated via fetch → blob URL
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
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
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
  const res = await apiFetch(`/tasks/${currentTaskId}`);
  if (!res) return;
  const task = await res.json();
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

// ===== Create Modal =====

function openCreateModal() {
  document.getElementById('new-title').value = '';
  document.getElementById('new-description').value = '';
  document.getElementById('new-priority').value = 'P1';
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

  function startResize(clientX) {
    startX = clientX;
    startWidth = parseInt(getComputedStyle(panel).width);
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function doResize(clientX) {
    const w = startWidth + (clientX - startX);
    if (w >= 220 && w <= 560) panel.style.width = w + 'px';
  }

  function endResize() {
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem('todo_panel_width', panel.style.width);
  }

  handle.addEventListener('mousedown', (e) => {
    startResize(e.clientX);
    const onMove = (e) => doResize(e.clientX);
    const onUp = () => {
      endResize();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  handle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startResize(e.touches[0].clientX);
    const onMove = (e) => { e.preventDefault(); doResize(e.touches[0].clientX); };
    const onUp = () => {
      endResize();
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, { passive: false });
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

function fileExt(filename) { return filename.split('.').pop()?.toUpperCase() || 'FILE'; }

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

// ===== Boot =====

document.addEventListener('DOMContentLoaded', () => {
  // Auth
  document.getElementById('btn-login').addEventListener('click', login);
  document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-try-it').addEventListener('click', loginAsGuest);
  document.getElementById('demo-banner-exit').addEventListener('click', logout);

  // New task
  document.getElementById('btn-new-task').addEventListener('click', openCreateModal);
  document.getElementById('btn-cancel-create').addEventListener('click', closeCreateModal);
  document.getElementById('btn-confirm-create').addEventListener('click', createTask);
  document.getElementById('create-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCreateModal(); });
  document.getElementById('new-title').addEventListener('keydown', e => { if (e.key === 'Enter') createTask(); });

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
  ['detail-title','detail-description','detail-priority','detail-due','detail-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', scheduleDetailSave);
    document.getElementById(id).addEventListener('change', scheduleDetailSave);
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
  const newZone = document.getElementById('new-upload-zone');
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
