// Modelo de Usuário com roles e hash seguro de senha
const bcrypt = require('bcryptjs');
const { bcryptRounds } = require('../config/env');

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
});

class User {
  constructor({ id, name, email, passwordHash, role = ROLES.USER, createdAt }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
    this.createdAt = createdAt || new Date().toISOString();
  }

  static async hashPassword(plain) {
    if (!plain || plain.length < 8) {
      throw new Error('Senha deve ter ao menos 8 caracteres');
    }
    return bcrypt.hash(plain, bcryptRounds);
  }

  async verifyPassword(plain) {
    return bcrypt.compare(plain, this.passwordHash);
  }

  toJSON() {
    // Nunca expor passwordHash
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
    };
  }
}

module.exports = { User, ROLES };
