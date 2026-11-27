const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { port, nodeEnv, isProduction, corsOrigin } = require('./config/env');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const dashboardController = require('./controllers/dashboardController');
const { authenticate } = require('./middleware/auth');

const app = express();

// Trust proxy para rate limiting funcionar atrás do proxy do Vercel
app.set('trust proxy', 1);

// Middleware que garante inicialização do store antes de cada request
// (resolve race condition em serverless: primeira request chega antes do init terminar)
const { initialize } = require('./data/store');
let storeReady = false;
app.use(async (req, res, next) => {
  if (!storeReady) {
    try {
      await initialize();
      storeReady = true;
    } catch (err) {
      console.error('Store init error:', err.message);
    }
  }
  next();
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS
app.use(cors({
  origin: corsOrigin || (isProduction ? process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '*' : '*'),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 20, // limit each IP to 20 requests per window
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 10000 : 100, // 100 requests per minute
  message: { error: 'Limite de requisições excedido. Tente novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Apply rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Dashboard (exige autenticação)
app.get('/api/dashboard', authenticate, dashboardController.getStats);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: nodeEnv }));

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

module.exports = app;