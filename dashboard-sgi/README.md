# Dashboard SGI - Sistema de Gestão Integrada

Dashboard React moderna para gestão de auditorias, ações corretivas e ocorrências internas.

## 🚀 Características

- **Interface moderna e responsiva** com suporte a tema claro/escuro
- **Gestão completa de auditorias** (internas e externas)
- **Ações corretivas** com rastreamento de status
- **Ocorrências internas** com sistema de gravidade
- **Dashboard interativo** com gráficos e KPIs
- **Sistema de anexos** para documentos relacionados
- **Comentários e timeline** para colaboração
- **Workflow de aprovação** para auditorias
- **Audit trail** completo de todas as ações
- **Exportação** para PDF, CSV e Excel
- **Filtros avançados** com guardar/carregar
- **Notificações em tempo real**
- **Acessibilidade (a11y)** WCAG 2 AA compliant
- **Multi-tenant** com suporte a múltiplas empresas

## 📋 Pré-requisitos

- Node.js 18+ e npm/pnpm
- Backend SGI a correr (opcional - funciona com dados mock)

## 🛠️ Instalação

```bash
# Instalar dependências
npm install
# ou
pnpm install
```

## 🔧 Configuração

### Variáveis de Ambiente

Cria um ficheiro `.env` na raiz do projeto:

```env
# URL do backend (opcional - se não definido, usa dados mock)
VITE_API_BASE_URL=http://localhost:5801/api

# Porta do servidor de desenvolvimento (opcional)
# Por omissão: 8081
```

### Ligar ao Backend

1. Certifica-te que o backend está a correr (ver `../server/README.md`)
2. Define `VITE_API_BASE_URL` no `.env`
3. Reinicia o servidor de desenvolvimento

## 🏃 Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev
# ou
pnpm dev
```

O dashboard estará disponível em `http://localhost:8081` (ou porta configurada).

### Modo Mock vs API Real

- **Sem `VITE_API_BASE_URL`**: Usa dados mock locais (modo offline)
- **Com `VITE_API_BASE_URL`**: Conecta-se ao backend real
- **Fallback automático**: Se a API falhar, volta para mock

## 🧪 Testes

### Testes E2E (Playwright)

```bash
# Executar todos os testes
npm run test:e2e

# Interface gráfica
npm run test:e2e:ui

# Modo debug
npm run test:e2e:debug

# Com browser visível
npm run test:e2e:headed

# Ver relatório
npm run test:e2e:report
```

### Testes de Acessibilidade

Os testes de acessibilidade estão incluídos nos testes E2E e verificam:
- Contraste de cores (WCAG 2 AA)
- Navegação por teclado
- Labels acessíveis
- Landmarks semânticos
- ARIA attributes

## 📦 Build para Produção

```bash
# Build de produção
npm run build

# Preview do build
npm run preview
```

Os ficheiros compilados ficam em `dist/`.

### Deploy

O build gera ficheiros estáticos que podem ser servidos por:
- **Nginx/Apache**: Servir a pasta `dist/`
- **Vercel/Netlify**: Deploy automático via Git
- **Docker**: Container com servidor web estático

Ver `docs/DEPLOYMENT.md` para instruções detalhadas.

## 📁 Estrutura do Projeto

```
dashboard-sgi/
├── src/
│   ├── components/        # Componentes React reutilizáveis
│   │   ├── ui/           # Componentes de UI base
│   │   └── layout/       # Layout e navegação
│   ├── pages/            # Páginas da aplicação
│   ├── services/         # Serviços de API
│   ├── hooks/            # Custom hooks
│   ├── context/          # Context API (Auth, Tenant)
│   ├── types/            # TypeScript types
│   └── utils/            # Funções utilitárias
├── e2e/                  # Testes end-to-end
├── docs/                 # Documentação adicional
└── public/               # Ficheiros estáticos
```

## 🎨 Tecnologias

- **React 19** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool e dev server
- **React Router** - Roteamento
- **React Query** - Gestão de estado servidor
- **React Hook Form + Zod** - Formulários e validação
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos
- **jsPDF** - Geração de PDFs
- **Playwright** - Testes E2E
- **Lucide React** - Ícones

## 🔐 Autenticação

O dashboard suporta autenticação JWT:
- Login com email/password
- Tokens de acesso (15min) e refresh (7 dias)
- Rotação automática de tokens
- Gestão de sessões
- Roles: ADMIN, GESTOR, AUDITOR

## 🌐 Multi-tenant

Suporte a múltiplas empresas:
- Seletor de empresa no header
- Dados isolados por tenant
- Header `x-tenant-id` automático

## 📊 Funcionalidades Principais

### Dashboard
- KPIs em tempo real
- Gráficos interativos (Pie, Bar, Line)
- Filtros avançados
- Exportação de relatórios PDF

### Auditorias
- CRUD completo para auditorias internas/externas
- Filtros por ano, setor, status
- Anexos e comentários
- Workflow de aprovação

### Ações e Ocorrências
- Rastreamento de ações corretivas
- Gestão de ocorrências internas
- Notificações de itens atrasados

### Logs
- Audit trail completo
- Filtros por ação, entidade, data
- Exportação CSV

## 🐛 Troubleshooting

Ver `docs/TROUBLESHOOTING.md` para problemas comuns e soluções.

## 📚 Documentação Adicional

- [Guia de Deployment](docs/DEPLOYMENT.md)
- [Referência da API](docs/API_REFERENCE.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🤝 Contribuir

1. Cria uma branch para a feature
2. Faz commit das alterações
3. Abre um Pull Request

## 📝 Licença

Proprietário - Uso interno
