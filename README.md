# Sistema de Gestão Integrada (SGI)

Sistema completo para gestão de auditorias, ações corretivas e ocorrências internas.

## 📦 Estrutura do Projeto

```
Auditorias/
├── dashboard-sgi/     # Frontend React + TypeScript
├── server/            # Backend Node.js + Express + Prisma
└── README.md         # Este ficheiro
```

## 🚀 Início Rápido

### 1. Backend

```bash
cd server
npm install
cp example.env .env
# Editar .env com as configurações
npx prisma generate
npx prisma migrate dev
npm run dev
```

Backend disponível em `http://localhost:5801/api`

### 2. Frontend

```bash
cd dashboard-sgi
npm install
# Criar .env com VITE_API_BASE_URL=http://localhost:5801/api
npm run dev
```

Frontend disponível em `http://localhost:8081`

## 📚 Documentação

- [Frontend README](dashboard-sgi/README.md) - Guia completo do frontend
- [Backend README](server/README.md) - Guia completo do backend
- [Guia de Deployment](dashboard-sgi/docs/DEPLOYMENT.md) - Instruções de deploy
- [Troubleshooting](dashboard-sgi/docs/TROUBLESHOOTING.md) - Resolução de problemas
- [Referência da API](dashboard-sgi/docs/API_REFERENCE.md) - Documentação da API

## 🎯 Funcionalidades Principais

### Gestão de Auditorias
- ✅ Auditorias internas e externas
- ✅ CRUD completo
- ✅ Filtros avançados
- ✅ Anexos e comentários
- ✅ Workflow de aprovação

### Ações e Ocorrências
- ✅ Rastreamento de ações corretivas
- ✅ Gestão de ocorrências internas
- ✅ Notificações em tempo real

### Dashboard
- ✅ KPIs em tempo real
- ✅ Gráficos interativos
- ✅ Exportação PDF/CSV/Excel
- ✅ Filtros personalizáveis

### Segurança
- ✅ Autenticação JWT
- ✅ Multi-tenant
- ✅ Audit trail completo
- ✅ Rate limiting
- ✅ Headers de segurança

### Qualidade
- ✅ Testes E2E (Playwright)
- ✅ Testes de acessibilidade
- ✅ TypeScript em todo o código
- ✅ Validação com Zod

## 🛠️ Tecnologias

### Frontend
- React 19 + TypeScript
- Vite
- React Query
- React Hook Form + Zod
- Tailwind CSS
- Recharts

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Swagger/OpenAPI

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou pnpm

## 🔧 Configuração

### Variáveis de Ambiente

**Backend** (`server/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/sgi
JWT_SECRET=<secret-forte>
JWT_REFRESH_SECRET=<secret-forte>
PORT=5801
FRONTEND_URL=http://localhost:8081
```

**Frontend** (`dashboard-sgi/.env`):
```env
VITE_API_BASE_URL=http://localhost:5801/api
```

## 🧪 Testes

### Frontend (E2E)
```bash
cd dashboard-sgi
npm run test:e2e
```

### Backend
```bash
cd server
npm test
```

## 📦 Build

### Frontend
```bash
cd dashboard-sgi
npm run build
```

### Backend
```bash
cd server
npm run build
```

## 🚢 Deploy

Ver [Guia de Deployment](dashboard-sgi/docs/DEPLOYMENT.md) para instruções detalhadas.

## 🤝 Contribuir

1. Cria uma branch para a feature
2. Faz commit das alterações
3. Abre um Pull Request

## 📝 Licença

Proprietário - Uso interno

## 🆘 Suporte

- Ver [Troubleshooting](dashboard-sgi/docs/TROUBLESHOOTING.md)
- Verificar logs do servidor
- Consultar documentação Swagger: `http://localhost:5801/api/docs`





