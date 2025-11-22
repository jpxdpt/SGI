# Deploy no Railway.app - Guia Completo

Railway e a forma mais simples de fazer deploy do backend sem problemas de CORS!

## Pre-requisitos

- Conta GitHub (para conectar o repositorio)
- Conta Railway (podes criar com GitHub): https://railway.app

## Passo a Passo

### 1. Criar conta no Railway

1. Vai a https://railway.app
2. Clica em "Start a New Project"
3. Escolhe "Login with GitHub"
4. Autoriza o Railway a aceder ao teu GitHub

### 2. Criar novo projeto

1. No dashboard do Railway, clica em **"New Project"**
2. Escolhe **"Deploy from GitHub repo"**
3. Seleciona o repositorio: `jpxdpt/SGI`
4. Railway vai detectar automaticamente que e um projeto Node.js

### 3. Configurar o projeto

1. Railway vai criar um servico automaticamente
2. Clica no servico criado
3. Vai ao separador **"Settings"**

### 4. Configurar variaveis de ambiente

No separador **"Variables"**, adiciona estas variaveis:

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

No separador **"Settings"** -> **"Deploy"**:

- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `npm run dev` (ou `npm start` se tiveres configurado)

### 6. Deploy automatico

Railway vai fazer deploy automaticamente quando:
- Fizeres push para o GitHub
- Adicionares/modificares variaveis de ambiente
- Fizeres alteracoes no codigo

### 7. Obter URL do backend

1. No separador **"Settings"** -> **"Networking"**
2. Railway da-te uma URL automatica tipo: `backend-production.up.railway.app`
3. **Copia esta URL!**

### 8. Configurar frontend

No frontend (Vercel), atualiza a variavel de ambiente:

```
VITE_API_BASE_URL=https://backend-production.up.railway.app/api
```

## Vantagens do Railway

- Sem problemas de CORS - Funciona perfeitamente
- Deploy automatico - Cada push no GitHub faz deploy
- URL estavel - Nao muda como ngrok
- Plano gratuito generoso - $5 gratis por mes
- Muito simples - Nao precisa de Docker ou configuracao complexa
- Logs em tempo real - Ves os logs no dashboard

## Troubleshooting

### Se o deploy falhar:

1. Verifica os **logs** no Railway (separador "Deployments" -> clica no deployment)
2. Verifica se todas as **variaveis de ambiente** estao corretas
3. Verifica se o **DATABASE_URL** esta correto

### Se o backend nao iniciar:

1. Verifica os logs
2. Confirma que o **PORT** esta configurado (Railway define automaticamente, mas podes usar `PORT` ou `$PORT`)
3. Verifica se o **Start Command** esta correto

## Monitorizacao

- **Logs**: Ves em tempo real no dashboard
- **Metricas**: CPU, RAM, etc. no separador "Metrics"
- **Deployments**: Historico de todos os deploys

## Pronto!

Depois de configurar, o Railway faz deploy automaticamente sempre que fizeres push para o GitHub!

Railway e a forma mais simples de fazer deploy do backend sem problemas de CORS!

## Pre-requisitos

- Conta GitHub (para conectar o repositorio)
- Conta Railway (podes criar com GitHub): https://railway.app

## Passo a Passo

### 1. Criar conta no Railway

1. Vai a https://railway.app
2. Clica em "Start a New Project"
3. Escolhe "Login with GitHub"
4. Autoriza o Railway a aceder ao teu GitHub

### 2. Criar novo projeto

1. No dashboard do Railway, clica em **"New Project"**
2. Escolhe **"Deploy from GitHub repo"**
3. Seleciona o repositorio: `jpxdpt/SGI`
4. Railway vai detectar automaticamente que e um projeto Node.js

### 3. Configurar o projeto

1. Railway vai criar um servico automaticamente
2. Clica no servico criado
3. Vai ao separador **"Settings"**

### 4. Configurar variaveis de ambiente

No separador **"Variables"**, adiciona estas variaveis:

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

No separador **"Settings"** -> **"Deploy"**:

- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `npm run dev` (ou `npm start` se tiveres configurado)

### 6. Deploy automatico

Railway vai fazer deploy automaticamente quando:
- Fizeres push para o GitHub
- Adicionares/modificares variaveis de ambiente
- Fizeres alteracoes no codigo

### 7. Obter URL do backend

1. No separador **"Settings"** -> **"Networking"**
2. Railway da-te uma URL automatica tipo: `backend-production.up.railway.app`
3. **Copia esta URL!**

### 8. Configurar frontend

No frontend (Vercel), atualiza a variavel de ambiente:

```
VITE_API_BASE_URL=https://backend-production.up.railway.app/api
```

## Vantagens do Railway

- Sem problemas de CORS - Funciona perfeitamente
- Deploy automatico - Cada push no GitHub faz deploy
- URL estavel - Nao muda como ngrok
- Plano gratuito generoso - $5 gratis por mes
- Muito simples - Nao precisa de Docker ou configuracao complexa
- Logs em tempo real - Ves os logs no dashboard

## Troubleshooting

### Se o deploy falhar:

1. Verifica os **logs** no Railway (separador "Deployments" -> clica no deployment)
2. Verifica se todas as **variaveis de ambiente** estao corretas
3. Verifica se o **DATABASE_URL** esta correto

### Se o backend nao iniciar:

1. Verifica os logs
2. Confirma que o **PORT** esta configurado (Railway define automaticamente, mas podes usar `PORT` ou `$PORT`)
3. Verifica se o **Start Command** esta correto

## Monitorizacao

- **Logs**: Ves em tempo real no dashboard
- **Metricas**: CPU, RAM, etc. no separador "Metrics"
- **Deployments**: Historico de todos os deploys

## Pronto!

Depois de configurar, o Railway faz deploy automaticamente sempre que fizeres push para o GitHub!
