const API = '';
let token = localStorage.getItem('token');
let currentUser = null;

// ---------- Helpers ----------
function showMsg(id, msg, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'msg ' + (isError ? 'error' : 'success');
}
function authHeaders() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }; }
function showView(name) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  const target = document.getElementById('view-' + name);
  target.classList.remove('hidden');
  target.classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'projects') loadProjects();
  if (name === 'tasks') { loadProjectSelects(); loadTasks(); }
  if (name === 'users') loadUsers();
  if (name === 'logs') loadLogs();
}
function switchTab(tab) {
  document.getElementById('formLogin').classList.toggle('hidden', tab !== 'login');
  document.getElementById('formRegister').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
}

// ---------- Auth ----------
async function register() {
  const res = await fetch(API + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value
    })
  });
  const data = await res.json();
  if (res.ok) { showMsg('authMsg', 'Cadastrado! Faça login.'); switchTab('login'); }
  else showMsg('authMsg', data.error || 'Erro', true);
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const mfaToken = document.getElementById('loginMfaToken') ? document.getElementById('loginMfaToken').value : '';

  const body = { email, password };
  if (mfaToken) body.mfaToken = mfaToken;

  const res = await fetch(API + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();

  // Se MFA for exigido, mostrar campo para token
  if (res.status === 401 && data.error === 'MFA_TOKEN_REQUIRED') {
    if (!document.getElementById('loginMfaToken')) {
      const input = document.createElement('input');
      input.id = 'loginMfaToken';
      input.placeholder = 'Código MFA (6 dígitos)';
      input.type = 'text';
      document.getElementById('formLogin').insertBefore(input, document.getElementById('formLogin').querySelector('button'));
      showMsg('authMsg', 'Digite o código MFA do seu app autenticador', false);
    }
    return;
  }

  if (res.ok) {
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    document.getElementById('dashUser').textContent = data.user.name;
    document.getElementById('dashRole').textContent = data.user.role;
    document.getElementById('nav').classList.remove('hidden');
    if (data.user.role === 'ADMIN') {
      document.getElementById('navUsers').classList.remove('hidden');
      document.getElementById('navLogs').classList.remove('hidden');
      document.getElementById('statUsersCard').classList.remove('hidden');
    }
    document.getElementById('view-auth').classList.remove('active');
    document.getElementById('view-dashboard').classList.add('active');
    loadDashboard();
  } else showMsg('authMsg', data.error || 'Erro', true);
}

function logout() {
  fetch(API + '/api/auth/logout', { method: 'POST', headers: authHeaders() });
  localStorage.removeItem('token');
  token = null; currentUser = null;
  document.getElementById('nav').classList.add('hidden');
  document.getElementById('navUsers').classList.add('hidden');
  document.getElementById('navLogs').classList.add('hidden');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-auth').classList.add('active');
}

// ---------- Dashboard ----------
async function loadDashboard() {
  const res = await fetch(API + '/api/dashboard', { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('statProjects').textContent = data.totalProjects;
  document.getElementById('statTasks').textContent = data.totalTasks;
  document.getElementById('statPending').textContent = data.tasksByStatus.PENDING;
  document.getElementById('statProgress').textContent = data.tasksByStatus.IN_PROGRESS;
  document.getElementById('statDone').textContent = data.tasksByStatus.COMPLETED;
  if (data.totalUsers !== undefined) document.getElementById('statUsers').textContent = data.totalUsers;
  loadMfaStatus();
}

async function loadMfaStatus() {
  const res = await fetch(API + '/api/auth/mfa/status', { headers: authHeaders() });
  const data = await res.json();
  const text = document.getElementById('mfaStatusText');
  const enableBtn = document.getElementById('mfaEnableBtn');
  const disableBtn = document.getElementById('mfaDisableBtn');
  if (data.mfaEnabled) {
    text.textContent = '✅ MFA está HABILITADO para sua conta.';
    enableBtn.classList.add('hidden');
    disableBtn.classList.remove('hidden');
  } else {
    text.textContent = '⚠️ MFA está DESABILITADO. Recomendamos habilitar.';
    enableBtn.classList.remove('hidden');
    disableBtn.classList.add('hidden');
  }
}

async function mfaSetup() {
  const res = await fetch(API + '/api/auth/mfa/setup', { method: 'POST', headers: authHeaders() });
  const data = await res.json();
  if (res.ok) {
    document.getElementById('mfaQrCode').src = data.qrCode;
    document.getElementById('mfaSecret').textContent = data.secret;
    document.getElementById('mfaModal').classList.remove('hidden');
  } else {
    alert(data.error || 'Erro ao configurar MFA');
  }
}

function closeMfaModal() { document.getElementById('mfaModal').classList.add('hidden'); }

async function mfaEnable() {
  const token = document.getElementById('mfaTokenInput').value;
  const res = await fetch(API + '/api/auth/mfa/enable', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ token })
  });
  const data = await res.json();
  if (res.ok) {
    closeMfaModal();
    loadMfaStatus();
    alert('MFA habilitado com sucesso!');
  } else {
    alert(data.error || 'Token inválido');
  }
}

function mfaDisablePrompt() {
  document.getElementById('mfaDisablePassword').value = '';
  document.getElementById('mfaDisableModal').classList.remove('hidden');
}
function closeMfaDisableModal() { document.getElementById('mfaDisableModal').classList.add('hidden'); }

async function mfaDisable() {
  const password = document.getElementById('mfaDisablePassword').value;
  if (!password) { alert('Digite sua senha'); return; }
  const res = await fetch(API + '/api/auth/mfa/disable', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ password })
  });
  if (res.ok) {
    closeMfaDisableModal();
    loadMfaStatus();
    alert('MFA desabilitado.');
  } else {
    const d = await res.json();
    alert(d.error || 'Erro ao desabilitar');
  }
}

// ---------- Projects ----------
async function loadProjects() {
  const res = await fetch(API + '/api/projects', { headers: authHeaders() });
  const data = await res.json();
  const div = document.getElementById('projectsList');
  if (!Array.isArray(data) || data.length === 0) { div.innerHTML = '<p><em>Nenhum projeto cadastrado.</em></p>'; return; }
  div.innerHTML = data.map(p => `
    <div class="project-item">
      <h4>${escapeHtml(p.name)} <span class="badge">${p.id}</span></h4>
      <p>${escapeHtml(p.description || '')}</p>
      <small>Criado em: ${new Date(p.createdAt).toLocaleString('pt-BR')}</small>
      <div style="margin-top:.5rem">
        <button onclick="openProjectEditModal(${p.id}, '${escapeHtml(p.name)}', '${escapeHtml(p.description || '')}')">Editar</button>
        <button onclick="deleteProject(${p.id})" class="danger-btn">Excluir</button>
      </div>
    </div>
  `).join('');
}

async function createProject() {
  const res = await fetch(API + '/api/projects', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({
      name: document.getElementById('projName').value,
      description: document.getElementById('projDesc').value
    })
  });
  const data = await res.json();
  if (res.ok) { showMsg('projMsg', 'Projeto criado!'); loadProjects(); loadDashboard(); }
  else showMsg('projMsg', data.error || 'Erro', true);
}

async function deleteProject(id) {
  if (!confirm('Excluir este projeto?')) return;
  const res = await fetch(API + '/api/projects/' + id, { method: 'DELETE', headers: authHeaders() });
  if (res.ok) { loadProjects(); loadDashboard(); }
  else { const d = await res.json(); alert(d.error); }
}

function openProjectEditModal(id, name, desc) {
  document.getElementById('editProjectId').value = id;
  document.getElementById('editProjectName').value = name;
  document.getElementById('editProjectDesc').value = desc;
  document.getElementById('editProjectModal').classList.remove('hidden');
}
function closeProjectEditModal() { document.getElementById('editProjectModal').classList.add('hidden'); }

async function saveProjectEdit() {
  const id = document.getElementById('editProjectId').value;
  const res = await fetch(API + '/api/projects/' + id, {
    method: 'PUT', headers: authHeaders(),
    body: JSON.stringify({
      name: document.getElementById('editProjectName').value,
      description: document.getElementById('editProjectDesc').value
    })
  });
  if (res.ok) {
    closeProjectEditModal();
    loadProjects();
    alert('Projeto atualizado!');
  } else {
    const d = await res.json();
    alert(d.error || 'Erro ao editar');
  }
}

// ---------- Tasks ----------
async function loadProjectSelects() {
  const res = await fetch(API + '/api/projects', { headers: authHeaders() });
  const data = await res.json();
  const projects = Array.isArray(data) ? data : [];
  const opts = projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  document.getElementById('taskProject').innerHTML = opts || '<option value="">-- Crie um projeto primeiro --</option>';
  document.getElementById('filterProject').innerHTML = '<option value="">Todos</option>' + opts;
}

async function loadTasks() {
  const filter = document.getElementById('filterProject').value;
  let url = API + '/api/tasks';
  // list all by iterating projects is not ideal; we'll fetch per project if filter set
  const div = document.getElementById('tasksList');
  if (filter) {
    const res = await fetch(API + '/api/tasks/project/' + filter, { headers: authHeaders() });
    const data = await res.json();
    renderTasks(Array.isArray(data) ? data : []);
    return;
  }
  // load all tasks across projects
  const pres = await fetch(API + '/api/projects', { headers: authHeaders() });
  const projects = await pres.json();
  let all = [];
  for (const p of (Array.isArray(projects) ? projects : [])) {
    const r = await fetch(API + '/api/tasks/project/' + p.id, { headers: authHeaders() });
    const t = await r.json();
    if (Array.isArray(t)) all = all.concat(t);
  }
  renderTasks(all);
}

function renderTasks(tasks) {
  const div = document.getElementById('tasksList');
  if (!tasks.length) { div.innerHTML = '<p><em>Nenhuma tarefa.</em></p>'; return; }
  div.innerHTML = tasks.map(t => `
    <div class="task-item">
      <h4>${escapeHtml(t.title)} <span class="badge ${t.status}">${t.status}</span></h4>
      <p>${escapeHtml(t.description || '')}</p>
      <small>Projeto ID: ${t.projectId} | Responsável: ${t.assignedTo || '—'}</small>
      <div style="margin-top:.5rem">
        <select onchange="updateTaskStatus(${t.id}, this.value)">
          <option value="PENDING" ${t.status==='PENDING'?'selected':''}>Pendente</option>
          <option value="IN_PROGRESS" ${t.status==='IN_PROGRESS'?'selected':''}>Em andamento</option>
          <option value="COMPLETED" ${t.status==='COMPLETED'?'selected':''}>Concluída</option>
        </select>
        <button onclick="deleteTask(${t.id})" class="danger-btn">Excluir</button>
      </div>
    </div>
  `).join('');
}

async function createTask() {
  const res = await fetch(API + '/api/tasks', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({
      projectId: parseInt(document.getElementById('taskProject').value),
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDesc').value,
      assignedTo: document.getElementById('taskAssign').value ? parseInt(document.getElementById('taskAssign').value) : null
    })
  });
  const data = await res.json();
  if (res.ok) { showMsg('taskMsg', 'Tarefa criada!'); loadTasks(); loadDashboard(); }
  else showMsg('taskMsg', data.error || 'Erro', true);
}

async function updateTaskStatus(id, status) {
  const res = await fetch(API + '/api/tasks/' + id + '/status', {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status })
  });
  if (res.ok) { loadTasks(); loadDashboard(); }
}

async function deleteTask(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  const res = await fetch(API + '/api/tasks/' + id, { method: 'DELETE', headers: authHeaders() });
  if (res.ok) { loadTasks(); loadDashboard(); }
  else { const d = await res.json(); alert(d.error); }
}

// ---------- Users ----------
async function loadUsers() {
  const res = await fetch(API + '/api/auth/users', { headers: authHeaders() });
  const data = await res.json();
  const div = document.getElementById('usersList');
  if (!Array.isArray(data) || data.length === 0) {
    div.innerHTML = '<p><em>Nenhum usuário cadastrado.</em></p>';
    return;
  }
  div.innerHTML = data.map(u => `
    <div class="user-item">
      <h4>${escapeHtml(u.name)} <span class="badge ${u.role}">${u.role}</span></h4>
      <p>${escapeHtml(u.email)}</p>
      <small>Criado em: ${new Date(u.createdAt).toLocaleString('pt-BR')} | ID: ${u.id}</small>
      <div style="margin-top:.5rem">
        <button onclick="openEditModal(${u.id}, '${escapeHtml(u.name)}', '${escapeHtml(u.email)}', '${u.role}')">Editar</button>
        <button onclick="deleteUser(${u.id})" class="danger-btn" ${u.id === currentUser.id ? 'disabled' : ''}>Excluir</button>
      </div>
    </div>
  `).join('');
}

function openEditModal(id, name, email, role) {
  document.getElementById('editUserId').value = id;
  document.getElementById('editUserName').value = name;
  document.getElementById('editUserEmail').value = email;
  document.getElementById('editUserRole').value = role;
  document.getElementById('editUserModal').classList.remove('hidden');
}
function closeEditModal() { document.getElementById('editUserModal').classList.add('hidden'); }

async function saveUserEdit() {
  const id = document.getElementById('editUserId').value;
  const res = await fetch(API + '/api/auth/users/' + id, {
    method: 'PUT', headers: authHeaders(),
    body: JSON.stringify({
      name: document.getElementById('editUserName').value,
      email: document.getElementById('editUserEmail').value,
      password: document.getElementById('editUserPassword').value || null,
      role: document.getElementById('editUserRole').value
    })
  });
  if (res.ok) {
    closeEditModal();
    loadUsers();
    alert('Usuário atualizado!');
  } else {
    const d = await res.json();
    alert(d.error || 'Erro ao editar');
  }
}

async function deleteUser(id) {
  if (!confirm('Excluir este usuário?')) return;
  const res = await fetch(API + '/api/auth/users/' + id, { method: 'DELETE', headers: authHeaders() });
  if (res.ok) {
    loadUsers();
    loadDashboard();
  } else {
    const d = await res.json();
    alert(d.error || 'Erro ao excluir');
  }
}

async function createUser() {
  const res = await fetch(API + '/api/auth/register', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({
      name: document.getElementById('newUserName').value,
      email: document.getElementById('newUserEmail').value,
      password: document.getElementById('newUserPassword').value,
      role: document.getElementById('newUserRole').value
    })
  });
  const data = await res.json();
  if (res.ok) { showMsg('userMsg', 'Usuário criado com perfil ' + data.role + '!'); loadUsers(); }
  else showMsg('userMsg', data.error || 'Erro', true);
}

// ---------- Logs ----------
async function loadLogs() {
  const res = await fetch(API + '/api/dashboard', { headers: authHeaders() });
  const data = await res.json();
  const box = document.getElementById('logsList');
  if (data.recentLogs) {
    box.textContent = data.recentLogs.map(l =>
      `[${new Date(l.timestamp).toLocaleString('pt-BR')}] ${l.action} — usuário ${l.userId} — ${l.result} — IP ${l.ip}`
    ).join('\n');
  } else {
    box.textContent = 'Sem logs disponíveis (apenas ADMIN).';
  }
}

// ---------- Utils ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- Init ----------
if (token) {
  document.getElementById('view-auth').classList.remove('active');
  document.getElementById('view-dashboard').classList.add('active');
  document.getElementById('nav').classList.remove('hidden');
  loadDashboard();
}
