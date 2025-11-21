# 🚀 Deploy no Railway.app - Guia Completo

Railway é a forma mais simples de fazer deploy do backend sem problemas de CORS!

## 📋 Pré-requisitos

- Conta GitHub (para conectar o repositório)
- Conta Railway (podes criar com GitHub): https://railway.app

## 🎯 Passo a Passo

### 1. Criar conta no Railway

1. Vai a https://railway.app
2. Clica em "Start a New Project"
3. Escolhe "Login with GitHub"
4. Autoriza o Railway a aceder ao teu GitHub

### 2. Criar novo projeto

1. No dashboard do Railway, clica em **"New Project"**
2. Escolhe **"Deploy from GitHub repo"**
3. Seleciona o repositório: `jpxdpt/SGI`
4. Railway vai detectar automaticamente que é um projeto Node.js

### 3. Configurar o projeto

1. Railway vai criar um serviço automaticamente
2. Clica no serviço criado
3. Vai ao separador **"Settings"**

### 4. Configurar variáveis de ambiente

No separador **"Variables"**, adiciona estas variáveis:

```
DATABASE_URL=postgresql://neondb_owner:npg_RgD2x5QBZUMd@ep-little-band-absv82a0-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=seu-jwt-secret-aqui
JWT_REFRESH_SECRET=seu-refresh-secret-aqui
DEFAULT_TENANT_ID=tenant-default
PORT=5801
NODE_ENV=production
```

**Importante**: Substitui `seu-jwt-secret-aqui` e `seu-refresh-secret-aqui` por valores seguros!

### 5. Configurar build e start

No separador **"Settings"** → **"Deploy"**:

- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `npm run dev` (ou `npm start` se tiveres configurado)

### 6. Deploy automático

Railway vai fazer deploy automaticamente quando:
- Fizeres push para o GitHub
- Adicionares/modificares variáveis de ambiente
- Fizeres alterações no código

### 7. Obter URL do backend

1. No separador **"Settings"** → **"Networking"**
2. Railway dá-te uma URL automática tipo: `backend-production.up.railway.app`
3. **Copia esta URL!**

### 8. Configurar frontend

No frontend (Vercel), atualiza a variável de ambiente:

```
VITE_API_BASE_URL=https://backend-production.up.railway.app/api
```

## ✅ Vantagens do Railway

- ✅ **Sem problemas de CORS** - Funciona perfeitamente
- ✅ **Deploy automático** - Cada push no GitHub faz deploy
- ✅ **URL estável** - Não muda como ngrok
- ✅ **Plano gratuito generoso** - $5 grátis por mês
- ✅ **Muito simples** - Não precisa de Docker ou configuração complexa
- ✅ **Logs em tempo real** - Vês os logs no dashboard

## 🔧 Troubleshooting

### Se o deploy falhar:

1. Verifica os **logs** no Railway (separador "Deployments" → clica no deployment)
2. Verifica se todas as **variáveis de ambiente** estão corretas
3. Verifica se o **DATABASE_URL** está correto

### Se o backend não iniciar:

1. Verifica os logs
2. Confirma que o **PORT** está configurado (Railway define automaticamente, mas podes usar `PORT` ou `$PORT`)
3. Verifica se o **Start Command** está correto

## 📊 Monitorização

- **Logs**: Vês em tempo real no dashboard
- **Métricas**: CPU, RAM, etc. no separador "Metrics"
- **Deployments**: Histórico de todos os deploys

## 🎉 Pronto!

Depois de configurar, o Railway faz deploy automaticamente sempre que fizeres push para o GitHub!

