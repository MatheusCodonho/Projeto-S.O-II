// Armazenamento persistente - suporta Neon PostgreSQL (produção) e arquivo JSON (desenvolvimento/teste)
const fs = require('fs');
const path = require('path');
const { User } = require('../models/User');
const { nodeEnv, isProduction } = require('../config/env');

const isProductionEnv = isProduction || process.env.NODE_ENV === 'production';
const isTestEnv = process.env.NODE_ENV === 'test';

// Detecta se DATABASE_URL aponta para Postgres (ignora em testes)
const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = !isTestEnv && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'));

// Lazy load do Neon (usa dynamic import pois o pacote é ESM-only)
let sql = null;
async function getSql() {
  if (sql) return sql;
  if (isPostgres) {
    try {
      const neonModule = await import('@neondatabase/serverless');
      // @neondatabase/serverless exporta a função neon como default
      const neon = neonModule.default || neonModule.neon;
      if (typeof neon !== 'function') {
        throw new Error('Neon export não é uma função: ' + typeof neon);
      }
      sql = neon(databaseUrl);
      return sql;
    } catch (err) {
      console.warn('Neon não disponível, fallback para arquivo local:', err.message);
    }
  }
  return null;
}

// Carrega do arquivo local (desenvolvimento)
function loadFromFile() {
  const DB_FILE = path.join(process.cwd(), 'data', 'db.json');
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const users = (parsed.users || []).map(u => new User(u));
      return {
        users,
        projects: parsed.projects || [],
        tasks: parsed.tasks || [],
        auditLogs: parsed.auditLogs || [],
      };
    }
  } catch (err) {
    console.error('Erro ao carregar banco de dados local:', err.message);
  }
  return { users: [], projects: [], tasks: [], auditLogs: [] };
}

// Salva no arquivo local (desenvolvimento)
function saveToFile(data) {
  const DB_FILE = path.join(process.cwd(), 'data', 'db.json');
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const usersPlain = data.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
      createdAt: u.createdAt,
      mfaSecret: u.mfaSecret,
      mfaEnabled: u.mfaEnabled,
    }));
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: usersPlain, projects: data.projects, tasks: data.tasks, auditLogs: data.auditLogs }, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar banco de dados local:', err.message);
  }
}

// Carrega do Postgres (Neon)
async function loadFromPostgres() {
  const db = await getSql();
  if (!db) return loadFromFile();

  try {
    // Garante que as tabelas existem
    await db`
      CREATE TABLE IF NOT EXISTS store (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    const rows = await db`SELECT key, value FROM store WHERE key IN ('users', 'projects', 'tasks', 'auditLogs')`;
    const map = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    const users = (map.users || []).map(u => new User(u));
    return {
      users,
      projects: map.projects || [],
      tasks: map.tasks || [],
      auditLogs: map.auditLogs || [],
    };
  } catch (err) {
    console.error('Erro ao carregar do Postgres:', err.message);
    return loadFromFile();
  }
}

// Salva no Postgres (Neon)
async function saveToPostgres(data) {
  const db = await getSql();
  if (!db) return saveToFile(data);

  try {
    const usersPlain = data.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
      createdAt: u.createdAt,
      mfaSecret: u.mfaSecret,
      mfaEnabled: u.mfaEnabled,
    }));

    const entries = [
      ['users', usersPlain],
      ['projects', data.projects],
      ['tasks', data.tasks],
      ['auditLogs', data.auditLogs],
    ];

    for (const [key, value] of entries) {
      await db`
        INSERT INTO store (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }
  } catch (err) {
    console.error('Erro ao salvar no Postgres:', err.message);
    saveToFile(data);
  }
}

// Inicialização assíncrona
let initialized = false;
let initPromise = null;
let memoryCache = null;

async function initialize() {
  if (initialized) return memoryCache;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (isTestEnv) {
      memoryCache = loadFromFile();
    } else if (isPostgres || isProductionEnv) {
      memoryCache = await loadFromPostgres();
    } else {
      memoryCache = loadFromFile();
    }
    initialized = true;
    return memoryCache;
  })();

  return initPromise;
}

// API síncrona para compatibilidade
function getData() {
  if (!initialized) {
    if (isTestEnv || (!isPostgres && !isProductionEnv)) {
      memoryCache = loadFromFile();
      initialized = true;
    }
  }
  return memoryCache || { users: [], projects: [], tasks: [], auditLogs: [] };
}

// Persistência assíncrona
async function persist() {
  const data = getData();
  if (isTestEnv) {
    saveToFile(data);
  } else if (isPostgres || isProductionEnv) {
    await saveToPostgres(data);
  } else {
    saveToFile(data);
  }
}

// Persistência síncrona (para compatibilidade - apenas dev/test)
function persistSync() {
  const data = getData();
  if (isTestEnv || (!isPostgres && !isProductionEnv)) {
    saveToFile(data);
  } else {
    // Fire-and-forget em produção
    persist().catch(err => console.error('Persist failed:', err.message));
  }
}

function nextId(collection) {
  return collection.length ? Math.max(...collection.map(i => i.id)) + 1 : 1;
}

function reset() {
  const data = getData();
  data.users.length = 0;
  data.projects.length = 0;
  data.tasks.length = 0;
  data.auditLogs.length = 0;

  if (isTestEnv || (!isPostgres && !isProductionEnv)) {
    const DB_FILE = path.join(process.cwd(), 'data', 'db.json');
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  }
}

// Inicializa na importação (dev/test)
// Em desenvolvimento com Postgres, carregamos do arquivo local como fallback inicial
// A persistência assíncrona sincronizará com o Postgres
if (isTestEnv || !isProductionEnv) {
  memoryCache = loadFromFile();
  initialized = true;
}

module.exports = {
  get users() { return getData().users; },
  get projects() { return getData().projects; },
  get tasks() { return getData().tasks; },
  get auditLogs() { return getData().auditLogs; },
  nextId,
  persist,
  persistSync,
  reset,
  initialize,
  _loadFromFile: loadFromFile,
  _saveToFile: saveToFile,
};