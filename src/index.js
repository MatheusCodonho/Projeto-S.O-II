const { port, nodeEnv } = require('./config/env');
const app = require('./app');

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

module.exports = app;