# SGI Backend - API REST

API Node.js/Express + Prisma + PostgreSQL para o Sistema de Gestão Integrada.

## 🚀 Características

- **API RESTful** completa com OpenAPI/Swagger
- **Autenticação JWT** com refresh tokens
- **Multi-tenant** com isolamento de dados
- **Audit trail** automático
- **Rate limiting** configurável
- **Segurança** (Helmet, CORS, sanitização)
- **Cache** em memória para queries frequentes
- **Logging estruturado** JSON
- **Health checks** para monitorização
- **Upload de ficheiros** com validação
- **Sistema de aprovações** e comentários

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou pnpm

## 🛠️ Instalação

```bash
# Instalar dependências
npm install
# ou
pnpm install
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

Copia o ficheiro de exemplo:

```bash
cp example.env .env
```

Edita `.env` com as tuas configurações:

```env
# Base de dados
DATABASE_URL="postgresql://user:password@localhost:5432/sgi"

# JWT Secrets (OBRIGATÓRIO em produção)
JWT_SECRET="seu-secret-super-seguro-aqui"
JWT_REFRESH_SECRET="seu-refresh-secret-super-seguro-aqui"

# Servidor
PORT=5801
NODE_ENV=development
FRONTEND_URL=http://localhost:8081

# Multi-tenant
DEFAULT_TENANT_ID="tenant-default"

# API URL (para Swagger)
API_URL=http://localhost:5801/api
```

### 2. Base de Dados

#### Opção A: Docker (Recomendado para desenvolvimento)

```bash
# Subir PostgreSQL
docker compose -f docker-compose.dev.yml up -d
```

#### Opção B: PostgreSQL Local

Instala e configura PostgreSQL localmente, depois atualiza `DATABASE_URL`.

### 3. Migrações e Seed

```bash
# Gerar cliente Prisma
npx prisma generate

# Aplicar migrações
npx prisma migrate dev --name init

# Popular base de dados (opcional)
npm run prisma:seed
```

## 🏃 Desenvolvimento

```bash
# Modo desenvolvimento (hot reload)
npm run dev

# Build
npm run build

# Produção
npm start
```

A API estará disponível em `http://localhost:5801/api`.

### Documentação Swagger

Acessa `http://localhost:5801/api/docs` para ver a documentação interativa da API.

## 🧪 Testes

```bash
# Executar testes
npm test

# Modo watch
npm run test:watch

# Com cobertura
npm run test:coverage
```

## 📡 Endpoints Principais

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Informações do utilizador

### Auditorias
- `GET /api/audits/internal` - Listar auditorias internas
- `POST /api/audits/internal` - Criar auditoria interna
- `PUT /api/audits/internal/:id` - Atualizar
- `DELETE /api/audits/internal/:id` - Eliminar
- `GET /api/audits/external` - Listar auditorias externas
- `POST /api/audits/external` - Criar auditoria externa
- `PUT /api/audits/external/:id` - Atualizar
- `DELETE /api/audits/external/:id` - Eliminar

### Ações
- `GET /api/actions` - Listar ações
- `POST /api/actions` - Criar ação
- `PUT /api/actions/:id` - Atualizar
- `DELETE /api/actions/:id` - Eliminar

### Ocorrências
- `GET /api/occurrences` - Listar ocorrências
- `POST /api/occurrences` - Criar ocorrência
- `PUT /api/occurrences/:id` - Atualizar
- `DELETE /api/occurrences/:id` - Eliminar

### Setores
- `GET /api/sectors` - Listar setores
- `POST /api/sectors` - Criar setor
- `PUT /api/sectors/:id` - Atualizar
- `DELETE /api/sectors/:id` - Eliminar

### Funcionalidades Avançadas
- `GET /api/logs` - Audit trail (com paginação e filtros)
- `POST /api/attachments` - Upload de anexos
- `GET /api/attachments/:entityType/:entityId` - Listar anexos
- `POST /api/comments` - Criar comentário
- `GET /api/comments/:entityType/:entityId` - Listar comentários
- `POST /api/approvals` - Solicitar aprovação
- `GET /api/approvals/:entityType/:entityId` - Obter aprovação

### Health Checks
- `GET /health` - Status do servidor
- `GET /ready` - Verificação de conectividade com BD

## 🔐 Autenticação

### Como usar

1. **Login**:
```bash
curl -X POST http://localhost:5801/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"admin123"}'
```

2. **Usar token**:
```bash
curl http://localhost:5801/api/audits/internal \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

### Roles

- **ADMIN**: Acesso total
- **GESTOR**: Gestão de auditorias e ações
- **AUDITOR**: Apenas leitura

## 🌐 Multi-tenant

Envia o header `x-tenant-id` para trabalhar com múltiplas empresas:

```bash
curl http://localhost:5801/api/audits/internal \
  -H "Authorization: Bearer TOKEN" \
  -H "x-tenant-id: empresa-123"
```

Se não fornecido, usa `DEFAULT_TENANT_ID`.

## 📊 Paginação

Todos os endpoints GET suportam paginação:

```
GET /api/audits/internal?page=1&limit=20
```

Resposta:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 🔒 Segurança

### Rate Limiting

- **Geral**: 300 req/min (dev) ou 100 req/min (prod)
- **Autenticação**: 5 tentativas/15min
- **Criação**: 10 operações/min

### Headers de Segurança

- Helmet configurado
- CORS restrito
- Sanitização de inputs
- Validação com Zod

## 📁 Estrutura do Projeto

```
server/
├── src/
│   ├── routes/          # Rotas da API
│   ├── middleware/      # Middlewares (auth, rate limit, etc)
│   ├── config/         # Configurações (Swagger, upload)
│   ├── utils/          # Utilitários (cache, audit trail)
│   ├── mappers/        # Mapeamento DB ↔ API
│   └── __tests__/      # Testes
├── prisma/
│   ├── schema.prisma   # Schema da base de dados
│   └── seed.ts         # Seed data
└── uploads/            # Ficheiros enviados (por tenant)
```

## 🗄️ Base de Dados

### Modelos Principais

- `User` - Utilizadores
- `Tenant` - Empresas/Organizações
- `InternalAudit` - Auditorias internas
- `ExternalAudit` - Auditorias externas
- `ActionItem` - Ações corretivas
- `Occurrence` - Ocorrências internas
- `Sector` - Setores
- `Attachment` - Anexos
- `Comment` - Comentários
- `Approval` - Aprovações
- `AuditLog` - Audit trail
- `Session` - Sessões de utilizador

### Migrações

```bash
# Criar nova migração
npx prisma migrate dev --name nome_da_migracao

# Aplicar em produção
npx prisma migrate deploy
```

## 📝 Logging

Logs estruturados em JSON:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "method": "GET",
  "path": "/api/audits/internal",
  "status": 200,
  "duration": 45
}
```

## 🐛 Troubleshooting

Ver `../dashboard-sgi/docs/TROUBLESHOOTING.md` para problemas comuns.

## 📚 Documentação Adicional

- [Guia de Deployment](../dashboard-sgi/docs/DEPLOYMENT.md)
- [Troubleshooting](../dashboard-sgi/docs/TROUBLESHOOTING.md)
- [Swagger UI](http://localhost:5801/api/docs) (quando servidor está a correr)

## 🔄 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento com hot reload
npm run build        # Compilar TypeScript
npm start            # Executar build de produção
npm test             # Executar testes
npm run test:watch   # Testes em modo watch
npm run test:coverage # Testes com cobertura
npm run prisma:generate # Gerar cliente Prisma
npm run prisma:migrate   # Aplicar migrações
npm run prisma:seed      # Popular BD
```

## 🤝 Contribuir

1. Cria uma branch para a feature
2. Faz commit das alterações
3. Abre um Pull Request

## 📝 Licença

Proprietário - Uso interno
