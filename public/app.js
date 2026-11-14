'use strict';

// ===== State (memory only) =====
let accessToken = null;
let currentUser = null;
let socket = null;
const view = { status: '', sort: 'dueDate', order: 'asc' };

// ===== DOM helpers =====
const $ = (selector) => document.querySelector(selector);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;  // always text, never HTML
  return node;
}

function toast(message, type = 'info') {
  const node = el('div', `toast toast--${type}`, message);
  $('#toasts').append(node);
  setTimeout(() => node.remove(), 5000);
}

const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });


// ===== Token refresh (single-flight) =====
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('Refresh failed');
      const { data } = await res.json();
      accessToken = data.accessToken;
      currentUser = data.user;
      return accessToken;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// ===== API client =====
async function api(path, { method = 'GET', body, retry = true } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: body && JSON.stringify(body),
  });

  // Access token expired: refresh once, then repeat the original request
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshAccessToken();
    } catch {
      showAuth('Your session has expired. Please log in again.');
      throw new Error('Session expired');
    }
    return api(path, { method, body, retry: false });
  }

  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = json.details?.map((d) => d.message).join(', ');
    throw new Error(details || json.message || `Request failed (${res.status})`);
  }
  return json.data;
}

// ===== Views =====
function showAuth(message) {
  accessToken = null;
  currentUser = null;
  if (socket) { socket.disconnect(); socket = null; }
  $('#app-view').hidden = true;
  $('#session').hidden = true;
  $('#auth-view').hidden = false;
  $('#auth-message').hidden = !message;
  $('#auth-message').textContent = message || '';
}

function enterApp() {
  $('#auth-view').hidden = true;
  $('#app-view').hidden = false;
  $('#session').hidden = false;
  $('#whoami').textContent = currentUser.username;
  connectSocket();
  loadTasks();
}

// ===== Auth forms =====
for (const [selector, mode] of [['#login-form', 'login'], ['#signup-form', 'signup']]) {
  $(selector).addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body });
      accessToken = data.accessToken;
      currentUser = data.user;
      event.target.reset();
      enterApp();
    } catch (err) {
      $('#auth-message').hidden = false;
      $('#auth-message').textContent = err.message;
    }
  });
}

$('#logout').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } finally { showAuth(); }
});

// ===== Tasks =====
async function loadTasks() {
  const params = new URLSearchParams({ sort: view.sort, order: view.order });
  if (view.status) params.set('status', view.status);
  try {
    const { tasks } = await api(`/tasks?${params}`);
    renderTasks(tasks);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function actionButton(label, status, extraClass = '') {
  const button = el('button', `small ${extraClass}`.trim(), label);
  button.type = 'button';
  button.dataset.status = status;
  return button;
}

function taskItem(task) {
  const li = el('li', `task task--${task.status}`);
  li.dataset.id = task.id;

  const header = el('div', 'task__header');
  header.append(el('h3', 'task__title', task.title), el('span', `badge badge--${task.status}`, task.status));
  li.append(header);

  if (task.description) li.append(el('p', 'task__desc', task.description));
  li.append(el('p', 'task__meta', `Due ${formatDate(task.dueDate)}`));

  const actions = el('div', 'task__actions');
  if (task.status === 'pending' || task.status === 'overdue') actions.append(actionButton('Complete', 'completed'));
  if (task.status === 'completed') actions.append(actionButton('Reopen', 'pending'));
  actions.append(actionButton('Delete', 'deleted', 'danger'));
  li.append(actions);
  return li;
}

function renderTasks(tasks) {
  $('#task-list').replaceChildren(...tasks.map(taskItem));
  $('#empty').hidden = tasks.length > 0;
}

// One listener for every task button, even ones rendered later
$('#task-list').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-status]');
  if (!button) return;
  const { id } = button.closest('li').dataset;
  const { status } = button.dataset;
  button.disabled = true;
  try {
    if (status === 'deleted') await api(`/tasks/${id}`, { method: 'DELETE' });
    else await api(`/tasks/${id}/status`, { method: 'PATCH', body: { status } });
  } catch (err) {
    toast(err.message, 'error');
  }
  loadTasks();
});

$('#task-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api('/tasks', {
      method: 'POST',
      body: {
        title: form.get('title'),
        description: form.get('description') || undefined,
        dueDate: new Date(form.get('dueDate')).toISOString(),  // local time → UTC
      },
    });
    event.target.reset();
    toast('Task added');
    loadTasks();
  } catch (err) {
    toast(err.message, 'error');
  }
});

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    view.status = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    loadTasks();
  });
});

$('#sort').addEventListener('change', (event) => {
  [view.sort, view.order] = event.target.value.split(':');
  loadTasks();
});

// ===== Real-time =====
function setConnection(online) {
  $('#connection').classList.toggle('dot--online', online);
  $('#connection').title = `Real-time: ${online ? 'connected' : 'offline'}`;
}

let authRetries = 0;
let reconnecting = false;

async function reconnectWithFreshToken() {
  if (reconnecting || !socket) return;
  if (authRetries >= 2) return showAuth('Your session has expired. Please log in again.');
  reconnecting = true;
  authRetries += 1;
  try {
    await refreshAccessToken();
    socket.connect();
  } catch {
    showAuth('Your session has expired. Please log in again.');
  } finally {
    reconnecting = false;
  }
}

function connectSocket() {
  if (socket) return;
  // auth as a FUNCTION: called on every (re)connection, so it always sends the current token
  socket = io({ auth: (cb) => cb({ token: accessToken }) });

  socket.on('connect', () => {
    authRetries = 0;
    setConnection(true);
    loadTasks();  // requirement 14: the database is the truth, so resync on every connect
  });

  socket.on('disconnect', (reason) => {
    setConnection(false);
    if (reason === 'io server disconnect') reconnectWithFreshToken();  // e.g. token expired
  });

  socket.on('connect_error', (err) => {
    setConnection(false);
    if (err.message === 'Unauthorized') reconnectWithFreshToken();
  });

  socket.on('task:overdue', ({ task }) => {
    toast(`⏰ "${task.title}" is overdue`, 'warn');
    loadTasks();
  });

  socket.on('task:completed', ({ task }) => {
    toast(`✅ "${task.title}" completed`, 'success');
    loadTasks();
  });
}


// ===== Boot =====
async function boot() {
  try {
    await refreshAccessToken();
    return enterApp();
  } catch {
    // Another tab may have just rotated the cookie (our 10s grace window): wait and try once more
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  try {
    await refreshAccessToken();
    enterApp();
  } catch {
    showAuth();
  }
}

boot();