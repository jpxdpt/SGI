# Arquitetura Alvo SGI

## 1. Visão Geral
- **Frontend**: React + Vite + TypeScript, estado com React Query e Context API, UI com Tailwind/Radix, deploy em CDN.
- **Backend**: Node.js + Express + TypeScript, API REST versionada (`/api/v1`), validação com Zod.
- **Persistência**: PostgreSQL gerido (AWS RDS/Railway) através de Prisma ORM.
- **Armazenamento de ficheiros**: Object storage compatível com S3 para Excel importados e anexos.
- **Workers**: BullMQ + Redis opcional para processar importações ou relatórios pesados.
- **Observabilidade**: Logging estruturado (Pino), métricas Prometheus, tracing OpenTelemetry.

## 2. Componentes Backend
1. **Gateway (Express)** – middlewares de CORS, rate limiting, autenticação JWT, versionamento e compressão.
2. **Camada de Aplicação** – controladores → serviços → repositórios; DTOs e validação com Zod.
3. **Persistência (Prisma)** – modelos: `Tenant`, `User`, `InternalAudit`, `ExternalAudit`, `ActionItem`, `Occurrence`, `Sector`, `ImportLog`, `Attachment`, `AuditTrail`.
4. **Importação Excel** – upload via `multer`, parsing `xlsx`, validações, gravação transactional e logging em `ImportLog`.
5. **Autenticação/RBAC** – Login com Argon2id, tokens access (15 min) e refresh (7 dias), roles `admin|gestor|auditor`, escopo por `tenantId`.

## 3. Componentes Frontend
- **Layout**: `AppLayout`, Sidebar responsiva, cabeçalho com seleção de tenant/tema.
- **Estado/Dados**: React Query (queries + mutations) + Contexts (tema, tenant, preferências).
- **Formulários**: React Hook Form + Zod para validação consistente com backend.
- **UI Core**: Cards KPI, tabelas com paginação server-side, modais/drawers, gráficos Recharts.
- **Uploader**: componente `ExcelUploader` com preview, mapeamento e acompanhamento de histórico.

## 4. Fluxos Principais
1. **Login** → `/auth/login` → tokens em cookies HTTP-only → refresh automático.
2. **Dashboard** → `GET /summary` → KPIs e gráficos atualizados em tempo real (React Query).
3. **CRUD Auditorias/Ações/Ocorrências/Setores** → tabelas + filtros → modais → mutations → invalidar cache.
4. **Importação Excel** → upload → processamento backend → atualiza histórico mostrado no frontend.
5. **Exportações (roadmap)** → endpoints `/reports/*.csv|pdf` com geração síncrona ou assíncrona.

## 5. Segurança e Compliance
- HTTPS obrigatório, HSTS e Content-Security-Policy.
- Sanitização e validação de inputs (Zod/Prisma).
- Audit trail em tabela dedicada + logs estruturados com request-id.
- Backups automáticos (BD + storage) e retenção configurável por tenant; encriptação em repouso e trânsito.

## 6. Deploy & Ambientes
- **Dev**: Docker Compose (API, Postgres, Redis opcional, frontend) com hot reload.
- **Staging**: Deploy automático via GitHub Actions → ambiente cloud; migrações Prisma aplicadas na pipeline.
- **Prod**: Kubernetes/ECS, Postgres gerido, S3, CDN (CloudFront), health-checks `/health` e `/ready`.

## 7. Próximos Passos
1. Criar diagramas C4 (Context/Container) para documentação visual.
2. Definir schema Prisma inicial + contratos OpenAPI.
3. Preparar `docker-compose.dev.yml` e guias de onboarding técnico.

---
*Documento a ser atualizado conforme as decisões de arquitetura evoluem.*