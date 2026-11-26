// Armazenamento persistente em arquivo JSON local
const fs = require('fs');
const path = require('path');
const { User } = require('../models/User');

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      // Re-hidrata usuários em instâncias de User (para manter métodos)
      const users = (parsed.users || []).map(u => new User(u));
      return {
        users,
        projects: parsed.projects || [],
        tasks: parsed.tasks || [],
        auditLogs: parsed.auditLogs || [],
      };
    }
  } catch (err) {
    console.error('Erro ao carregar banco de dados:', err.message);
  }
  return { users: [], projects: [], tasks: [], auditLogs: [] };
}

const data = load();
const users = data.users;
const projects = data.projects;
const tasks = data.tasks;
const auditLogs = data.auditLogs;

function persist() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Serializa usuários incluindo passwordHash e MFA fields
    const usersPlain = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
      createdAt: u.createdAt,
      mfaSecret: u.mfaSecret,
      mfaEnabled: u.mfaEnabled,
    }));
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: usersPlain, projects, tasks, auditLogs }, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar banco de dados:', err.message);
  }
}

function nextId(collection) {
  return collection.length ? Math.max(...collection.map(i => i.id)) + 1 : 1;
}

function reset() {
  users.length = 0;
  projects.length = 0;
  tasks.length = 0;
  auditLogs.length = 0;
  // remove db file
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
}

module.exports = { users, projects, tasks, auditLogs, nextId, persist, reset };
