SGI Backend - API REST
======================

API Node.js/Express + Prisma + PostgreSQL para o Sistema de Gestao Integrada.

CARACTERISTICAS
---------------
- API RESTful completa com OpenAPI/Swagger
- Autenticacao JWT com refresh tokens
- Multi-tenant com isolamento de dados
- Audit trail automatico
- Rate limiting configuravel
- Seguranca (Helmet, CORS, sanitizacao)
- Cache em memoria para queries frequentes
- Logging estruturado JSON
- Health checks para monitorizacao
- Upload de ficheiros com validacao
- Sistema de aprovacoes e comentarios

PRE-REQUISITOS
--------------
- Node.js 18+
- PostgreSQL 14+
- npm ou pnpm

INSTALACAO
----------

Instalar dependencias:
   npm install
   ou
   pnpm install

CONFIGURACAO
------------

1. Variaveis de Ambiente

   Copia o ficheiro de exemplo:
   cp example.env .env

   Edita .env com as tuas configuracoes:

   Base de dados:
   DATABASE_URL="postgresql://user:password@localhost:5432/sgi"

   JWT Secrets (OBRIGATORIO em producao):
   JWT_SECRET="seu-secret-super-seguro-aqui"
   JWT_REFRESH_SECRET="seu-refresh-secret-super-seguro-aqui"

   Servidor:
   PORT=5801
   NODE_ENV=development
   FRONTEND_URL=http://localhost:8081

   Multi-tenant:
   DEFAULT_TENANT_ID="tenant-default"

   API URL (para Swagger):
   API_URL=http://localhost:5801/api

2. Base de Dados

   Opcao A: Docker (Recomendado para desenvolvimento)
   docker compose -f docker-compose.dev.yml up -d

   Opcao B: PostgreSQL Local
   Instala e configura PostgreSQL localmente, depois atualiza DATABASE_URL.

3. Migracoes e Seed

   Gerar cliente Prisma:
   npx prisma generate

   Aplicar migracoes:
   npx prisma migrate dev --name init

   Popular base de dados (opcional):
   npm run prisma:seed

DESENVOLVIMENTO
---------------

Modo desenvolvimento (hot reload):
   npm run dev

Build:
   npm run build

Producao:
   npm start

A API estara disponivel em http://localhost:5801/api.

Documentacao Swagger:
   Acessa http://localhost:5801/api/docs para ver a documentacao interativa da API.

TESTES
------

Executar testes:
   npm test

Modo watch:
   npm run test:watch

Com cobertura:
   npm run test:coverage

ENDPOINTS PRINCIPAIS
--------------------

Autenticacao:
   POST /api/auth/login - Login
   POST /api/auth/refresh - Renovar token
   POST /api/auth/logout - Logout
   GET /api/auth/me - Informacoes do utilizador

Auditorias:
   GET /api/audits/internal - Listar auditorias internas
   POST /api/audits/internal - Criar auditoria interna
   PUT /api/audits/internal/:id - Atualizar
   DELETE /api/audits/internal/:id - Eliminar
   GET /api/audits/external - Listar auditorias externas
   POST /api/audits/external - Criar auditoria externa
   PUT /api/audits/external/:id - Atualizar
   DELETE /api/audits/external/:id - Eliminar

Acoes:
   GET /api/actions - Listar acoes
   POST /api/actions - Criar acao
   PUT /api/actions/:id - Atualizar
   DELETE /api/actions/:id - Eliminar

Ocorrencias:
   GET /api/occurrences - Listar ocorrencias
   POST /api/occurrences - Criar ocorrencia
   PUT /api/occurrences/:id - Atualizar
   DELETE /api/occurrences/:id - Eliminar

Setores:
   GET /api/sectors - Listar setores
   POST /api/sectors - Criar setor
   PUT /api/sectors/:id - Atualizar
   DELETE /api/sectors/:id - Eliminar

Funcionalidades Avancadas:
   GET /api/logs - Audit trail (com paginacao e filtros)
   POST /api/attachments - Upload de anexos
   GET /api/attachments/:entityType/:entityId - Listar anexos
   POST /api/comments - Criar comentario
   GET /api/comments/:entityType/:entityId - Listar comentarios
   POST /api/approvals - Solicitar aprovacao
   GET /api/approvals/:entityType/:entityId - Obter aprovacao

Health Checks:
   GET /health - Status do servidor
   GET /ready - Verificacao de conectividade com BD

AUTENTICACAO
------------

Como usar:

1. Login:
   curl -X POST http://localhost:5801/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.local","password":"admin123"}'

2. Usar token:
   curl http://localhost:5801/api/audits/internal \
     -H "Authorization: Bearer SEU_ACCESS_TOKEN"

Roles:
   ADMIN: Acesso total
   GESTOR: Gestao de auditorias e acoes
   AUDITOR: Apenas leitura

MULTI-TENANT
------------

Envia o header x-tenant-id para trabalhar com multiplas empresas:

   curl http://localhost:5801/api/audits/internal \
     -H "Authorization: Bearer TOKEN" \
     -H "x-tenant-id: empresa-123"

Se nao fornecido, usa DEFAULT_TENANT_ID.

PAGINACAO
---------

Todos os endpoints GET suportam paginacao:

   GET /api/audits/internal?page=1&limit=20

Resposta:
   {
     "data": [...],
     "pagination": {
       "page": 1,
       "limit": 20,
       "total": 100,
       "totalPages": 5
     }
   }

SEGURANCA
---------

Rate Limiting:
   Geral: 300 req/min (dev) ou 100 req/min (prod)
   Autenticacao: 5 tentativas/15min
   Criacao: 10 operacoes/min

Headers de Seguranca:
   Helmet configurado
   CORS restrito
   Sanitizacao de inputs
   Validacao com Zod

ESTRUTURA DO PROJETO
--------------------

server/
  src/
    routes/          # Rotas da API
    middleware/      # Middlewares (auth, rate limit, etc)
    config/         # Configuracoes (Swagger, upload)
    utils/          # Utilitarios (cache, audit trail)
    mappers/        # Mapeamento DB <-> API
    __tests__/      # Testes
  prisma/
    schema.prisma   # Schema da base de dados
    seed.ts         # Seed data
  uploads/            # Ficheiros enviados (por tenant)

BASE DE DADOS
-------------

Modelos Principais:
   User - Utilizadores
   Tenant - Empresas/Organizacoes
   InternalAudit - Auditorias internas
   ExternalAudit - Auditorias externas
   ActionItem - Acoes corretivas
   Occurrence - Ocorrencias internas
   Sector - Setores
   Attachment - Anexos
   Comment - Comentarios
   Approval - Aprovacoes
   AuditLog - Audit trail
   Session - Sessoes de utilizador

Migracoes:
   Criar nova migracao:
   npx prisma migrate dev --name nome_da_migracao

   Aplicar em producao:
   npx prisma migrate deploy

LOGGING
-------

Logs estruturados em JSON:
   {
     "timestamp": "2025-01-15T10:30:00Z",
     "level": "info",
     "method": "GET",
     "path": "/api/audits/internal",
     "status": 200,
     "duration": 45
   }

TROUBLESHOOTING
---------------

Ver ../dashboard-sgi/docs/TROUBLESHOOTING.md para problemas comuns.

DOCUMENTACAO ADICIONAL
----------------------

- Guia de Deployment: ../dashboard-sgi/docs/DEPLOYMENT.md
- Troubleshooting: ../dashboard-sgi/docs/TROUBLESHOOTING.md
- Swagger UI: http://localhost:5801/api/docs (quando servidor esta a correr)

SCRIPTS DISPONIVEIS
-------------------

   npm run dev          # Desenvolvimento com hot reload
   npm run build        # Compilar TypeScript
   npm start            # Executar build de producao
   npm test             # Executar testes
   npm run test:watch   # Testes em modo watch
   npm run test:coverage # Testes com cobertura
   npm run prisma:generate # Gerar cliente Prisma
   npm run prisma:migrate   # Aplicar migracoes
   npm run prisma:seed      # Popular BD

CONTRIBUIR
----------

1. Cria uma branch para a feature
2. Faz commit das alteracoes
3. Abre um Pull Request

LICENCA
-------

Proprietario - Uso interno

SGI Backend - API REST
======================

API Node.js/Express + Prisma + PostgreSQL para o Sistema de Gestao Integrada.

CARACTERISTICAS
---------------
- API RESTful completa com OpenAPI/Swagger
- Autenticacao JWT com refresh tokens
- Multi-tenant com isolamento de dados
- Audit trail automatico
- Rate limiting configuravel
- Seguranca (Helmet, CORS, sanitizacao)
- Cache em memoria para queries frequentes
- Logging estruturado JSON
- Health checks para monitorizacao
- Upload de ficheiros com validacao
- Sistema de aprovacoes e comentarios

PRE-REQUISITOS
--------------
- Node.js 18+
- PostgreSQL 14+
- npm ou pnpm

INSTALACAO
----------

Instalar dependencias:
   npm install
   ou
   pnpm install

CONFIGURACAO
------------

1. Variaveis de Ambiente

   Copia o ficheiro de exemplo:
   cp example.env .env

   Edita .env com as tuas configuracoes:

   Base de dados:
   DATABASE_URL="postgresql://user:password@localhost:5432/sgi"

   JWT Secrets (OBRIGATORIO em producao):
   JWT_SECRET="seu-secret-super-seguro-aqui"
   JWT_REFRESH_SECRET="seu-refresh-secret-super-seguro-aqui"

   Servidor:
   PORT=5801
   NODE_ENV=development
   FRONTEND_URL=http://localhost:8081

   Multi-tenant:
   DEFAULT_TENANT_ID="tenant-default"

   API URL (para Swagger):
   API_URL=http://localhost:5801/api

2. Base de Dados

   Opcao A: Docker (Recomendado para desenvolvimento)
   docker compose -f docker-compose.dev.yml up -d

   Opcao B: PostgreSQL Local
   Instala e configura PostgreSQL localmente, depois atualiza DATABASE_URL.

3. Migracoes e Seed

   Gerar cliente Prisma:
   npx prisma generate

   Aplicar migracoes:
   npx prisma migrate dev --name init

   Popular base de dados (opcional):
   npm run prisma:seed

DESENVOLVIMENTO
---------------

Modo desenvolvimento (hot reload):
   npm run dev

Build:
   npm run build

Producao:
   npm start

A API estara disponivel em http://localhost:5801/api.

Documentacao Swagger:
   Acessa http://localhost:5801/api/docs para ver a documentacao interativa da API.

TESTES
------

Executar testes:
   npm test

Modo watch:
   npm run test:watch

Com cobertura:
   npm run test:coverage

ENDPOINTS PRINCIPAIS
--------------------

Autenticacao:
   POST /api/auth/login - Login
   POST /api/auth/refresh - Renovar token
   POST /api/auth/logout - Logout
   GET /api/auth/me - Informacoes do utilizador

Auditorias:
   GET /api/audits/internal - Listar auditorias internas
   POST /api/audits/internal - Criar auditoria interna
   PUT /api/audits/internal/:id - Atualizar
   DELETE /api/audits/internal/:id - Eliminar
   GET /api/audits/external - Listar auditorias externas
   POST /api/audits/external - Criar auditoria externa
   PUT /api/audits/external/:id - Atualizar
   DELETE /api/audits/external/:id - Eliminar

Acoes:
   GET /api/actions - Listar acoes
   POST /api/actions - Criar acao
   PUT /api/actions/:id - Atualizar
   DELETE /api/actions/:id - Eliminar

Ocorrencias:
   GET /api/occurrences - Listar ocorrencias
   POST /api/occurrences - Criar ocorrencia
   PUT /api/occurrences/:id - Atualizar
   DELETE /api/occurrences/:id - Eliminar

Setores:
   GET /api/sectors - Listar setores
   POST /api/sectors - Criar setor
   PUT /api/sectors/:id - Atualizar
   DELETE /api/sectors/:id - Eliminar

Funcionalidades Avancadas:
   GET /api/logs - Audit trail (com paginacao e filtros)
   POST /api/attachments - Upload de anexos
   GET /api/attachments/:entityType/:entityId - Listar anexos
   POST /api/comments - Criar comentario
   GET /api/comments/:entityType/:entityId - Listar comentarios
   POST /api/approvals - Solicitar aprovacao
   GET /api/approvals/:entityType/:entityId - Obter aprovacao

Health Checks:
   GET /health - Status do servidor
   GET /ready - Verificacao de conectividade com BD

AUTENTICACAO
------------

Como usar:

1. Login:
   curl -X POST http://localhost:5801/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.local","password":"admin123"}'

2. Usar token:
   curl http://localhost:5801/api/audits/internal \
     -H "Authorization: Bearer SEU_ACCESS_TOKEN"

Roles:
   ADMIN: Acesso total
   GESTOR: Gestao de auditorias e acoes
   AUDITOR: Apenas leitura

MULTI-TENANT
------------

Envia o header x-tenant-id para trabalhar com multiplas empresas:

   curl http://localhost:5801/api/audits/internal \
     -H "Authorization: Bearer TOKEN" \
     -H "x-tenant-id: empresa-123"

Se nao fornecido, usa DEFAULT_TENANT_ID.

PAGINACAO
---------

Todos os endpoints GET suportam paginacao:

   GET /api/audits/internal?page=1&limit=20

Resposta:
   {
     "data": [...],
     "pagination": {
       "page": 1,
       "limit": 20,
       "total": 100,
       "totalPages": 5
     }
   }

SEGURANCA
---------

Rate Limiting:
   Geral: 300 req/min (dev) ou 100 req/min (prod)
   Autenticacao: 5 tentativas/15min
   Criacao: 10 operacoes/min

Headers de Seguranca:
   Helmet configurado
   CORS restrito
   Sanitizacao de inputs
   Validacao com Zod

ESTRUTURA DO PROJETO
--------------------

server/
  src/
    routes/          # Rotas da API
    middleware/      # Middlewares (auth, rate limit, etc)
    config/         # Configuracoes (Swagger, upload)
    utils/          # Utilitarios (cache, audit trail)
    mappers/        # Mapeamento DB <-> API
    __tests__/      # Testes
  prisma/
    schema.prisma   # Schema da base de dados
    seed.ts         # Seed data
  uploads/            # Ficheiros enviados (por tenant)

BASE DE DADOS
-------------

Modelos Principais:
   User - Utilizadores
   Tenant - Empresas/Organizacoes
   InternalAudit - Auditorias internas
   ExternalAudit - Auditorias externas
   ActionItem - Acoes corretivas
   Occurrence - Ocorrencias internas
   Sector - Setores
   Attachment - Anexos
   Comment - Comentarios
   Approval - Aprovacoes
   AuditLog - Audit trail
   Session - Sessoes de utilizador

Migracoes:
   Criar nova migracao:
   npx prisma migrate dev --name nome_da_migracao

   Aplicar em producao:
   npx prisma migrate deploy

LOGGING
-------

Logs estruturados em JSON:
   {
     "timestamp": "2025-01-15T10:30:00Z",
     "level": "info",
     "method": "GET",
     "path": "/api/audits/internal",
     "status": 200,
     "duration": 45
   }

TROUBLESHOOTING
---------------

Ver ../dashboard-sgi/docs/TROUBLESHOOTING.md para problemas comuns.

DOCUMENTACAO ADICIONAL
----------------------

- Guia de Deployment: ../dashboard-sgi/docs/DEPLOYMENT.md
- Troubleshooting: ../dashboard-sgi/docs/TROUBLESHOOTING.md
- Swagger UI: http://localhost:5801/api/docs (quando servidor esta a correr)

SCRIPTS DISPONIVEIS
-------------------

   npm run dev          # Desenvolvimento com hot reload
   npm run build        # Compilar TypeScript
   npm start            # Executar build de producao
   npm test             # Executar testes
   npm run test:watch   # Testes em modo watch
   npm run test:coverage # Testes com cobertura
   npm run prisma:generate # Gerar cliente Prisma
   npm run prisma:migrate   # Aplicar migracoes
   npm run prisma:seed      # Popular BD

CONTRIBUIR
----------

1. Cria uma branch para a feature
2. Faz commit das alteracoes
3. Abre um Pull Request

LICENCA
-------

Proprietario - Uso interno

