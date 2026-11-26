# Sistema Seguro de Gestão de Projetos

Este projeto é um sistema de gestão de projetos com foco em segurança por design.

## Funcionalidades Recentes
- **Autenticação MFA (TOTP):** Implementada via `speakeasy`.
- **Gerenciamento de Usuários (ADMIN):**
  - CRUD completo de usuários (incluindo atualização de perfis/papéis).
  - Restrição de exclusão/rebaixamento do último administrador.
- **Gerenciamento de Projetos:**
  - Criação, listagem e atualização de projetos (EDIT adicionado).
- **Segurança:**
  - Helmet para headers de segurança.
  - Rate limiting nas rotas de autenticação e API.
  - Hashes de senha com bcrypt.

## API Endpoints (Admin)
- `PUT /api/auth/users/:id` - Atualiza nome, email, senha ou papel do usuário (Requer privilégio ADMIN).
- `DELETE /api/auth/users/:id` - Exclui usuário.

## Configuração
- O sistema utiliza `data/db.json` para persistência local (SQLite/JSON).
- Porta configurada no arquivo `.env` (Padrão: 3000).

## Como Rodar
1. `npm install`
2. `npm start`
3. Acesse `http://localhost:3000`
