# Arquitetura e Segurança do Sistema de Gestão de Projetos

## 1. Visão Geral
Sistema informatizado de Gestão de Projetos com foco em segurança (Security by Design), seguindo boas práticas de Engenharia de Software e preparado para operar em ambiente de nuvem.

## 2. Stack Tecnológica
- **Runtime:** Node.js 24 (TypeScript-ready)
- **Framework:** Express.js
- **Autenticação:** JWT (JSON Web Token) + bcryptjs para hash de senhas
- **Banco de Dados:** A definir (SQLite para dev, PostgreSQL para produção)
- **Controle de versão:** Git

## 3. Arquitetura de Software
Padrão **MVC (Model-View-Controller)** com separação de responsabilidades:

```
src/
├── config/        # Configurações (DB, env, segurança)
├── controllers/   # Lógica de negócio (handlers de requisições)
├── middleware/    # Autenticação, autorização, logging, tratamento de erros
├── models/        # Entidades de domínio e acesso a dados
├── routes/        # Definição de rotas da API REST
├── utils/         # Funções auxiliares (criptografia, validação)
└── index.js       # Entry point
```

## 4. Segurança em Nuvem (Item 4B do desafio)

### 4.1 Modelo de Serviço: PaaS (Platform as a Service)
- **Justificativa:** O provedor gerencia infraestrutura, SO, runtime e middleware. A equipe foca no desenvolvimento do software, segurança da aplicação e dados. Reduz superfície de ataque gerenciada pela equipe.

### 4.2 Ambiente de Implantação: Nuvem Pública
- **Justificativa:** Escalabilidade, disponibilidade global, pay-as-you-go, SLA de 99.9%+.

### 4.3 Estratégia de Criptografia
| Dado | Em Trânsito | Em Repouso |
|------|-------------|------------|
| Comunicação API | TLS 1.3 (HTTPS) | - |
| Senhas | TLS 1.3 | bcrypt (cost factor 12) |
| Dados do BD | TLS 1.3 | AES-256 (provedor) |
| Tokens JWT | TLS 1.3 | Assinatura HMAC-SHA256 |

### 4.4 Backup
- **Frequência:** Diário (automatizado pelo provedor PaaS)
- **Retenção:** 30 dias
- **Tipo:** Snapshot incremental + full semanal
- **Teste de restore:** Mensal

### 4.5 Plano de Recuperação de Desastres (DR)
- **RTO (Recovery Time Objective):** 4 horas
- **RPO (Recovery Point Objective):** 24 horas
- **Estratégia:** Multi-AZ deployment, backups em região secundária, runbook documentado

### 4.6 Modelo de Responsabilidade Compartilhada
| Responsabilidade | Provedor (Cloud) | Cliente (Equipe) |
|-------------------|------------------|------------------|
| Infraestrutura física | ✅ | |
| Rede física | ✅ | |
| Hypervisor / Virtualização | ✅ | |
| Sistema Operacional (host) | ✅ | |
| Runtime (Node.js) | ✅ (PaaS) | |
| Middleware/DB engine | ✅ (PaaS) | |
| Código da aplicação | | ✅ |
| Dados da aplicação | | ✅ |
| Identidades e acessos (IAM) | | ✅ |
| Configuração de segurança | | ✅ |
| Criptografia de dados | Compartilhado | Compartilhado |

## 5. Perfis de Usuário (IAM)
- **ADMIN:** Acesso total ao sistema (CRUD de usuários, projetos, tarefas, logs)
- **MANAGER:** Gerencia projetos e tarefas, consulta usuários
- **USER:** Acesso às próprias tarefas e projetos atribuídos

## 6. Princípio do Menor Privilégio
Cada perfil possui apenas as permissões necessárias para sua função. Middleware de autorização verifica roles antes de cada operação sensível.

## 7. Registro de Atividades (Audit Log)
Todas as operações CRUD e autenticação são registradas com: usuário, ação, timestamp, IP, resultado.
Os logs são acessíveis via Dashboard para usuários com perfil `ADMIN`.

Ações registradas:
- `REGISTER`, `LOGIN`, `LOGOUT`
- `CREATE_PROJECT`, `UPDATE_PROJECT`, `DELETE_PROJECT`
- `CREATE_TASK`, `UPDATE_TASK_STATUS`, `DELETE_TASK`

## 8. Gerenciamento de Credenciais
- Senhas e chaves armazenadas em variáveis de ambiente (`.env`)
- Arquivo `.env` no `.gitignore` (nunca commitado)
- Template `.env.example` fornecido sem valores sensíveis
