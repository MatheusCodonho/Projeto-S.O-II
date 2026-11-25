const jwt = require('jsonwebtoken');
const { User, ROLES } = require('../models/User');
const { users, nextId, persist } = require('../data/store');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { auditLogs } = require('../data/store');

function log(action, userId, ip, result, details) {
  auditLogs.push({ id: auditLogs.length + 1, action, userId, ip, result, details, timestamp: new Date().toISOString() });
  persist();
}

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email e password são obrigatórios' });
    }
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    const passwordHash = await User.hashPassword(password);
    // Primeiro usuário cadastrado torna-se ADMIN (bootstrap seguro)
    const bootstrap = users.length === 0;
    let assignedRole = ROLES.USER;
    if (bootstrap) assignedRole = ROLES.ADMIN;
    else if (role && [ROLES.ADMIN, ROLES.MANAGER].includes(role) && req.user && req.user.role === ROLES.ADMIN) {
      assignedRole = role;
    }
    const user = new User({ id: nextId(users), name, email, passwordHash, role: assignedRole });
    users.push(user);
    log('REGISTER', user.id, req.ip, 'success');
    return res.status(201).json(user.toJSON());
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await user.verifyPassword(password))) {
    log('LOGIN', user ? user.id : null, req.ip, 'failure');
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
  log('LOGIN', user.id, req.ip, 'success');
  return res.json({ token, user: user.toJSON() });
}

function logout(req, res) {
  log('LOGOUT', req.user.id, req.ip, 'success');
  return res.json({ message: 'Logout realizado com sucesso' });
}

function listUsers(req, res) {
  res.json(users.map(u => u.toJSON()));
}

function deleteUser(req, res) {
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

  // Impedir auto-exclusão
  if (req.user.id === id) {
    return res.status(400).json({ error: 'Você não pode excluir a própria conta' });
  }

  // Impedir exclusão do último ADMIN
  const target = users[index];
  if (target.role === ROLES.ADMIN) {
    const adminCount = users.filter(u => u.role === ROLES.ADMIN).length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Não é possível excluir o último administrador' });
    }
  }

  users.splice(index, 1);
  log('DELETE_USER', req.user.id, req.ip, 'success', { deletedUserId: id });
  res.status(204).send();
}

module.exports = { register, login, logout, listUsers, deleteUser };
