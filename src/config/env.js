// Carregamento seguro de variáveis de ambiente
// Nunca commitar o arquivo .env (ver .gitignore)
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = ['JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  databaseUrl: process.env.DATABASE_URL || 'sqlite:./data/app.db',
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigin: process.env.CORS_ORIGIN,
  mfaIssuer: process.env.MFA_ISSUER || 'GestaoProjetosSeguro',
};
