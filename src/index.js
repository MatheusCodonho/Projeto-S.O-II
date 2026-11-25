const { port, nodeEnv } = require('./config/env');
const app = require('./app');

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} (${nodeEnv})`);
});

module.exports = app;