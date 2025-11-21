# Deploy Rápido - Vercel

## Método Mais Rápido (CLI)

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Navegar para o frontend
cd dashboard-sgi

# 4. Deploy
vercel

# 5. Seguir instruções no terminal
# - Link projeto? y
# - Configurar? n (por enquanto)
# - Qual diretório? ./ (já estamos em dashboard-sgi)
```

## Configurar Variáveis de Ambiente

Após o primeiro deploy:

```bash
# Adicionar variável de ambiente
vercel env add VITE_API_BASE_URL production
# Digite a URL quando solicitado (ex: https://seu-backend.railway.app/api)
# Ou deixe em branco para usar modo mock
```

## Deploy em Produção

```bash
vercel --prod
```

## URLs Geradas

- **Preview**: `https://seu-projeto-*.vercel.app` (cada branch/PR)
- **Produção**: `https://seu-projeto.vercel.app`

## Próximo Passo

Ver `DEPLOY.md` para instruções detalhadas e troubleshooting.


