# Guia de Deploy - Vercel

Este guia explica como fazer o primeiro deploy do frontend SGI no Vercel.

## Pré-requisitos

1. Conta no [Vercel](https://vercel.com)
2. Repositório Git (GitHub, GitLab, ou Bitbucket)
3. Backend SGI configurado e acessível (ou usar modo mock)

## Opção 1: Deploy via Vercel CLI (Recomendado para teste)

### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2. Login na Vercel

```bash
vercel login
```

### 3. Navegar para o diretório do frontend

```bash
cd dashboard-sgi
```

### 4. Deploy

```bash
# Deploy de preview (desenvolvimento)
vercel

# Deploy de produção
vercel --prod
```

### 5. Configurar Variáveis de Ambiente

Após o primeiro deploy, configure as variáveis de ambiente no painel da Vercel ou via CLI:

```bash
vercel env add VITE_API_BASE_URL production
# Digite a URL do seu backend quando solicitado
```

## Opção 2: Deploy via GitHub (Recomendado para produção)

### 1. Conectar Repositório

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New Project"
3. Importe o repositório GitHub
4. Selecione a pasta `dashboard-sgi` como Root Directory

### 2. Configurações do Projeto

O Vercel detecta automaticamente as configurações do `vercel.json`:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Variáveis de Ambiente

Configure no painel da Vercel (Settings > Environment Variables):

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_API_BASE_URL` | URL do backend (ex: `https://api.exemplo.pt/api`) | Production, Preview, Development |

### 4. Deploy Automático

Após configurar:
- Push para `main` → Deploy em produção
- Pull Requests → Deploy de preview
- Branches → Deploy de preview automático

## Configuração do Backend

### Opção A: Backend Separado (Recomendado)

Se o backend está hospedado separadamente (Railway, Render, etc.):

1. Configure `VITE_API_BASE_URL` com a URL do backend
2. Configure CORS no backend para permitir o domínio do Vercel
3. Exemplo: `VITE_API_BASE_URL=https://sgi-backend.railway.app/api`

### Opção B: Vercel Serverless Functions

Se quiser usar Vercel Serverless Functions para o backend:

1. Crie uma pasta `api/` na raiz do projeto
2. Configure rotas como funções serverless
3. Ajuste `VITE_API_BASE_URL` para `/api`

### Opção C: Modo Mock (Sem Backend)

Se não tiver backend configurado:
- Não defina `VITE_API_BASE_URL`
- O frontend usará dados mock locais
- Útil para demonstração ou desenvolvimento

## Verificação Pós-Deploy

### 1. Verificar Build

Acesse: `https://seu-projeto.vercel.app`

### 2. Verificar Console do Browser

Abra DevTools (F12) e verifique:
- Sem erros de CORS
- Requisições API funcionando
- Variáveis de ambiente carregadas

### 3. Testar Funcionalidades

- Login/Logout
- Navegação entre páginas
- Carregamento de dados
- Ações CRUD (se backend configurado)

## Troubleshooting

### Erro: "Module not found"

**Solução**: Verifique se todas as dependências estão no `package.json`

```bash
cd dashboard-sgi
npm install
npm run build
```

### Erro: "Environment variable not found"

**Solução**: Configure as variáveis de ambiente no painel da Vercel ou via CLI:

```bash
vercel env ls
vercel env add VITE_API_BASE_URL
```

### Erro: "404 on page refresh"

**Solução**: O `vercel.json` já inclui rewrites para SPA. Se persistir, verifique o arquivo.

### Erro de CORS

**Solução**: Configure CORS no backend para permitir o domínio do Vercel:

```typescript
// No backend
cors({
  origin: [
    'https://seu-projeto.vercel.app',
    'https://seu-projeto-git-*-seu-usuario.vercel.app' // Para previews
  ]
})
```

### Build lento

**Solução**: Otimize o build:
- Remova dependências não utilizadas
- Use code splitting (já configurado com lazy loading)
- Verifique o tamanho do bundle

## Domínio Customizado

1. No painel da Vercel, vá em Settings > Domains
2. Adicione seu domínio customizado
3. Configure os DNS conforme instruções
4. Aguarde propagação (pode demorar até 24h)

## Monitoramento

A Vercel oferece:
- Analytics de performance
- Logs de erro em tempo real
- Métricas de build
- Deploys por commit

Acesse no painel do projeto: Analytics, Logs, Settings.

## Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Configurar domínio customizado (opcional)
2. ✅ Habilitar HTTPS (automático na Vercel)
3. ✅ Configurar webhooks para CI/CD
4. ✅ Monitorar performance e erros
5. ✅ Configurar alertas (opcional)

## Links Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Deploy de SPAs](https://vercel.com/docs/frameworks/vite)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)


