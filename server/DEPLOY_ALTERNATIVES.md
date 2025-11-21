# Alternativas de Deploy - SGI Backend

## 🚀 Opção 1: Railway.app (RECOMENDADO - Mais Simples)

Railway é a opção mais simples e tem excelente suporte para Node.js/Express.

### Passos:

1. **Criar conta no Railway**:
   - Vai a https://railway.app
   - Cria conta (pode usar GitHub)

2. **Criar novo projeto**:
   - Clica em "New Project"
   - Escolhe "Deploy from GitHub repo" (recomendado) ou "Empty Project"

3. **Configurar variáveis de ambiente**:
   - Vai a "Variables" no projeto
   - Adiciona todas as variáveis do `.env`:
     ```
     DATABASE_URL=postgresql://...
     JWT_SECRET=...
     JWT_REFRESH_SECRET=...
     DEFAULT_TENANT_ID=tenant-default
     PORT=5801
     NODE_ENV=production
     ```

4. **Deploy**:
   - Se usaste GitHub: Railway detecta automaticamente e faz deploy
   - Se usaste Empty Project: faz upload do código ou conecta GitHub repo

5. **Configurar domínio**:
   - Railway dá-te uma URL automática (ex: `backend.up.railway.app`)
   - Podes configurar domínio customizado se quiseres

### Vantagens:
- ✅ Muito simples de configurar
- ✅ Suporte nativo para Node.js
- ✅ CORS funciona perfeitamente
- ✅ Plano gratuito generoso
- ✅ Deploy automático do GitHub

---

## 🐳 Opção 2: Docker + ngrok (Para testes locais)

### Passos:

1. **Criar Dockerfile** (já criado em `server/Dockerfile`)

2. **Construir imagem**:
   ```bash
   cd server
   docker build -t sgi-backend .
   ```

3. **Executar container**:
   ```bash
   docker run -p 5801:5801 \
     -e DATABASE_URL="postgresql://..." \
     -e JWT_SECRET="..." \
     -e JWT_REFRESH_SECRET="..." \
     -e DEFAULT_TENANT_ID="tenant-default" \
     sgi-backend
   ```

4. **Instalar ngrok**:
   ```bash
   # Windows (PowerShell)
   choco install ngrok
   # ou baixa de https://ngrok.com/download
   ```

5. **Configurar ngrok**:
   ```bash
   ngrok config add-authtoken SEU_TOKEN
   ```

6. **Expor porta**:
   ```bash
   ngrok http 5801
   ```

7. **Usar URL do ngrok** no frontend:
   - O ngrok dá-te uma URL tipo: `https://abc123.ngrok.io`
   - Configura no frontend: `VITE_API_BASE_URL=https://abc123.ngrok.io/api`

### Desvantagens:
- ❌ URL muda a cada reinício (plano gratuito)
- ❌ Limite de conexões no plano gratuito
- ❌ Precisa de manter o computador ligado

---

## 🌐 Opção 3: Render.com (Alternativa ao Railway)

Similar ao Railway, mas com algumas diferenças.

### Passos:

1. **Criar conta**: https://render.com

2. **Criar novo Web Service**:
   - Escolhe "New Web Service"
   - Conecta GitHub repo

3. **Configurar**:
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm run dev` ou `npm start`
   - Environment: `Node`

4. **Variáveis de ambiente**: Adiciona todas as do `.env`

5. **Deploy**: Render faz deploy automático

### Vantagens:
- ✅ Simples como Railway
- ✅ Plano gratuito disponível
- ✅ CORS funciona bem

---

## 📊 Comparação Rápida

| Plataforma | Simplicidade | CORS | Custo | Recomendação |
|------------|--------------|------|-------|--------------|
| **Railway** | ⭐⭐⭐⭐⭐ | ✅ | Grátis | 🏆 MELHOR |
| **Render** | ⭐⭐⭐⭐ | ✅ | Grátis | ✅ Muito bom |
| **Docker+ngrok** | ⭐⭐ | ✅ | Grátis | ⚠️ Só para testes |
| **Vercel** | ⭐⭐⭐ | ❌ | Grátis | ❌ Problemas CORS |

---

## 🎯 Recomendação Final

**Use Railway.app** - É a opção mais simples, funciona perfeitamente com CORS, e tem um plano gratuito generoso. O deploy é quase automático e não terás problemas de CORS.

Se precisares de ajuda com Railway, avisa!

