// Modelo de Usuário com roles, hash seguro de senha e MFA (TOTP)
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { bcryptRounds, mfaIssuer } = require('../config/env');

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
});

class User {
  constructor({ id, name, email, passwordHash, role = ROLES.USER, createdAt, mfaSecret, mfaEnabled }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
    this.createdAt = createdAt || new Date().toISOString();
    this.mfaSecret = mfaSecret; // base32 encoded secret
    this.mfaEnabled = mfaEnabled || false;
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

  // MFA Methods
  generateMFASecret() {
    const secret = speakeasy.generateSecret({
      name: `${mfaIssuer} (${this.email})`,
      issuer: mfaIssuer,
      length: 20,
    });
    this.mfaSecret = secret.base32;
    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  // Verifica token TOTP sem exigir que MFA já esteja habilitado (para setup)
  verifyMFATokenSetup(token) {
    if (!this.mfaSecret) return false;
    return speakeasy.totp.verify({
      secret: this.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 1,
    });
  }

  // Verifica token TOTP exigindo que MFA esteja habilitado (para login)
  verifyMFAToken(token) {
    if (!this.mfaSecret || !this.mfaEnabled) return false;
    return speakeasy.totp.verify({
      secret: this.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 1,
    });
  }

  enableMFA(token) {
    if (this.verifyMFATokenSetup(token)) {
      this.mfaEnabled = true;
      return true;
    }
    return false;
  }

  disableMFA() {
    this.mfaEnabled = false;
    this.mfaSecret = null;
  }

  toJSON() {
    // Nunca expor passwordHash ou mfaSecret
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
      mfaEnabled: this.mfaEnabled,
    };
  }
}

module.exports = { User, ROLES };
