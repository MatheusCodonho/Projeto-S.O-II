# Deploy no Vercel Free com Neon PostgreSQL

## 📋 Visão Geral
Este guia mostra como fazer deploy do **Sistema de Gestão de Projetos Seguro** no **Vercel Free Tier** usando **Neon PostgreSQL** como banco de dados.

---

## 1️⃣ Criar Banco Neon (Gratuito)

1. Acesse: https://neon.tech
2. **Sign up** (GitHub/Google/Email)
3. **Create Project**:
   - Name: `gestao-projetos-seguro`
   - Region: escolha o mais próximo (ex: `us-east-1`)
   - Postgres version: `16` (padrão)
4. **Create** → Aguarde provisionar
5. Copie a **Connection String** (formato `postgresql://...?sslmode=require`)

> **Free Tier Neon**: 3 GiB storage, 1 compute unit, autosuspend após 5 min inativo.

---

## 2️⃣ Preparar Variáveis de Ambiente

### Gere `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### No Vercel Dashboard → Settings → Environment Variables:

| Variável | Valor | Ambientes |
|----------|-------|-----------|
| `JWT_SECRET` | *(chave gerada acima)* | Production, Preview, Development |
| `DATABASE_URL` | `postgresql://...?sslmode=require` | Production, Preview |
| `NODE_ENV` | `production` | Production |
| `JWT_EXPIRES_IN` | `1h` | All |
| `BCRYPT_ROUNDS` | `12` | All |
| `MFA_ISSUER` | `GestaoProjetosSeguro` | All |
| `CORS_ORIGIN` | `https://seu-projeto.vercel.app` | Production |

---

## 3️⃣ Deploy via CLI (Recomendado)

```bash
# 1. Instale Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Na raiz do projeto
vercel

# 4. Para produção
vercel --prod
```

**Respostas durante o setup:**
- `Set up and deploy?` → **Y**
- `Which scope?` → sua conta/organização
- `Link to existing project?` → **N** (primeira vez)
- `Project name:` → `gestao-projetos-seguro`
- `Directory:` → `./` (raiz)
- `Override settings?` → **N**

---

## 4️⃣ Deploy via GitHub (Auto-Deploy)

1. **Push para GitHub**:
   ```bash
   git add .
   git commit -m "feat: prepare for vercel + neon deploy"
   git push origin main
   ```

2. **No Vercel Dashboard**:
   - Add New Project → Import Git Repository
   - Selecione o repo
   - Configure Environment Variables (passo 2)
   - Deploy

3. **Deploys futuros**: Push na `main` = deploy automático

---

## 5️⃣ Verificar Funcionamento

### Health Check:
```
GET https://seu-projeto.vercel.app/health
```
Resposta esperada: `{"status":"ok","env":"production"}`

### API Test:
```bash
# Registro
curl -X POST https://seu-projeto.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"senha123"}'

# Login
curl -X POST https://seu-projeto.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"senha123"}'
```

### Frontend:
Acesse `https://seu-projeto.vercel.app` - deve carregar a interface.

---

## 6️⃣ Configurações Importantes

### Domínio Customizado (Opcional)
Vercel Dashboard → Settings → Domains → Add

### Logs e Monitoramento
- **Function Logs**: Vercel Dashboard → Functions → View Logs
- **Neon Dashboard**: Queries, storage, conexões ativas

### Limites Free Tier

| Recurso | Vercel Free | Neon Free |
|---------|-------------|-----------|
| Bandwidth | 100 GB/mês | - |
| Function Exec | 100 GB-hrs/mês | - |
| Serverless Função | 60s max (config 30s) | - |
| Postgres Storage | - | 3 GiB |
| Conexões simultâneas | - | ~100 |

---

## 7️⃣ Troubleshooting

### Erro: "Database connection failed"
- Verifique `DATABASE_URL` no Vercel (com `?sslmode=require`)
- Neon exige SSL - a string de conexão já inclui

### Erro: "CORS blocked"
- Adicione `CORS_ORIGIN=https://seu-projeto.vercel.app` no Vercel
- Ou use `*` em desenvolvimento

### Erro: "Function timeout"
- `vercel.json` tem `maxDuration: 30` (máx 60s no free)
- Queries complexas podem precisar otimização

### Variáveis não carregam
- Redeploy após adicionar env vars: `vercel --prod --force`
- Verifique se estão em **todos** os ambientes (Production, Preview, Development)

---

## 8️⃣ Estrutura de Arquivos para Deploy

```
├── api/
│   └── index.js           # Handler serverless (exporta app)
├── public/                # Frontend estático
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── src/
│   ├── index.js           # Entrada local (app.listen)
│   ├── app.js             # Express app
│   ├── config/env.js      # Configuração de ambiente
│   ├── data/store.js      # Store (Neon em prod, JSON em dev)
│   ├── controllers/       # Auth, Projects, Tasks, Dashboard
│   ├── middleware/auth.js # JWT auth
│   ├── models/            # User, Project, Task
│   └── routes/            # API routes
├── vercel.json            # Configuração Vercel
├── package.json
├── .env.example           # Template de variáveis
└── .gitignore
```

---

## 9️⃣ Comandos Úteis

```bash
# Testar localmente com vercel dev
vercel dev

# Ver logs de produção
vercel logs --prod

# Redeploy forçado
vercel --prod --force

# Ver variáveis de ambiente
vercel env ls

# Pull env vars para local
vercel env pull .env.local
```

---

## 🔐 Segurança em Produção

✅ **JWT_SECRET** forte e único
✅ **HTTPS** automático no Vercel
✅ **Helmet** headers de segurança
✅ **Rate limiting** (login: 20/15min, API: 100/min)
✅ **CORS** restrito ao domínio
✅ **MFA (TOTP)** opcional para usuários
✅ **Bcrypt** rounds=12
✅ **Non-root** containers (Vercel gerencia)

---

## 📞 Suporte

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Issues do Projeto**: GitHub Issues

---

**Última atualização**: 2025 - Sistema pronto para produção 🚀