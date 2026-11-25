const express = require('express');
const { port, nodeEnv } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const dashboardController = require('./controllers/dashboardController');
const { authenticate } = require('./middleware/auth');

const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

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

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} (${nodeEnv})`);
});

module.exports = app;
