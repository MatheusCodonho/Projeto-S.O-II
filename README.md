# Sistema de Gestão de Projetos — Software Seguro em Nuvem

## Descrição
Sistema informatizado de gestão de projetos e tarefas com foco em **Security by Design**, preparado para operar em ambiente de nuvem (PaaS / Nuvem Pública).

## Stack
- Node.js + Express
- JWT + bcryptjs
- Armazenamento em memória (dev) / PostgreSQL (produção)

## Execução
```bash
cp .env.example .env
# edite .env com valores seguros
npm install
npm run dev
```

## Endpoints principais
- `POST /api/auth/register` — Cadastro de usuário
- `POST /api/auth/login` — Login (retorna JWT)
- `POST /api/auth/logout` — Logout
- `GET /api/projects` — Listar projetos
- `POST /api/projects` — Criar projeto (ADMIN/MANAGER)
- `GET /api/projects/:id` — Detalhe
- `PUT /api/projects/:id` — Atualizar (ADMIN/MANAGER)
- `DELETE /api/projects/:id` — Excluir (ADMIN)
- `GET /api/tasks/project/:projectId` — Tarefas do projeto
- `POST /api/tasks` — Criar tarefa (ADMIN/MANAGER)
- `PATCH /api/tasks/:id/status` — Atualizar status
- `DELETE /api/tasks/:id` — Excluir tarefa (ADMIN/MANAGER)
- `GET /api/dashboard` — Painel com estatísticas e logs (ADMIN)

## Segurança
- Senhas hasheadas com bcrypt (cost factor configurável)
- Autenticação via JWT com expiração
- Autorização por roles (ADMIN, MANAGER, USER)
- Princípio do menor privilégio nas rotas
- Audit log de todas as operações
- Credenciais via variáveis de ambiente (nunca no código)
- `.env` no `.gitignore`

## Arquitetura
Ver `docs/ARCHITECTURE.md`.
