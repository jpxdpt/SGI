# Plano de Migração para PostgreSQL/Prisma

## 1. Objetivos
- Substituir o armazenamento em ficheiro (`server/data/db.json`) por base de dados PostgreSQL.
- Garantir consistência tipada entre frontend (modelos) e backend.
- Preparar terreno para multi-tenant, autenticação e histórico de importações.

## 2. Passos Técnicos

### 2.1 Preparação
1. Adicionar `prisma` e `@prisma/client` ao `server/package.json`.
2. Criar pasta `server/prisma` com `schema.prisma`.
3. Configurar variável `DATABASE_URL` (.env) para apontar para PostgreSQL local (Docker) e para staging/prod.

### 2.2 Modelagem inicial
```
model Tenant {
  id          String   @id @default(uuid())
  name        String
  domain      String?  @unique
  users       User[]
  internalAudits InternalAudit[]
  externalAudits ExternalAudit[]
  actionItems ActionItem[]
  occurrences Occurrence[]
  sectors     Sector[]
  importLogs  ImportLog[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model User {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  name        String
  email       String   @unique
  passwordHash String
  role        Role
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Role {
  ADMIN
  GESTOR
  AUDITOR
}

// Modelos InternalAudit, ExternalAudit, ActionItem, Occurrence, Sector, ImportLog seguem os campos do discovery.
```

### 2.3 Migrações e Seeds
1. `npx prisma migrate dev --name init` para gerar as migrações.
2. Criar `prisma/seed.ts` que insere tenant “Demo”, utilizador admin e alguns registos de auditoria.
3. Atualizar `package.json` com script `"prisma:seed": "prisma db seed"`.

### 2.4 Refatoração do Código
1. Substituir `dataStore.ts` por serviços Prisma (ex.: `auditService.ts`, `actionService.ts`).
2. Atualizar rotas (`server/src/server.ts`) para usar os serviços.
3. Introduzir `AppError` e tratamento de transações.

### 2.5 Ambientes
- **Dev**: Docker Compose com Postgres (`5432`), PGAdmin opcional.
- **Staging/Prod**: Base gerida (Railway, Supabase ou RDS). Aplicar migrações via CI/CD.

### 2.6 Testes
- Atualizar testes existentes para usar `prisma` com DB temporário (ou `sqlite` em memória).
- Criar factories para entidades.

## 3. Timeline Proposta
1. Dia 1: Configurar Prisma, schema e migração inicial.
2. Dia 2: Refatorar rotas/serviços, migrar dados da seed.
3. Dia 3: Ajustar testes e documentação (README + API docs).

## 4. Checklist antes do merge
- [ ] Todas as rotas usam Prisma (sem referências a `dataStore`).
- [ ] Scripts `npm run prisma:migrate/seed` executam sem erros.
- [ ] README atualizado com instruções Postgres.
- [ ] Pipelines CI atualizados para correr migrações.

---
*Este documento é incremental; atualizar conforme novos modelos ou requisitos surjam.*






