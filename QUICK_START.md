# Guia Rápido de Início - SGI

Guia passo-a-passo para começar a usar o Sistema de Gestão Integrada.

## ⚡ Início Rápido (5 minutos)

### 1. Clonar e Instalar

```bash
# Se ainda não clonaste
git clone <repo-url> Auditorias
cd Auditorias

# Backend
cd server
npm install
cp example.env .env

# Frontend
cd ../dashboard-sgi
npm install
```

### 2. Configurar Base de Dados

```bash
# Opção A: Docker (mais fácil)
cd server
docker compose -f docker-compose.dev.yml up -d

# Opção B: PostgreSQL local
# Instalar PostgreSQL e criar base de dados
```

### 3. Configurar Backend

Edita `server/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sgi"
JWT_SECRET="gerar-secret-aqui"
JWT_REFRESH_SECRET="gerar-outro-secret-aqui"
```

Gerar secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Inicializar Base de Dados

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### 5. Iniciar Backend

```bash
cd server
npm run dev
```

Verifica: `http://localhost:5801/api/health`

### 6. Configurar Frontend

Cria `dashboard-sgi/.env`:
```env
VITE_API_BASE_URL=http://localhost:5801/api
```

### 7. Iniciar Frontend

```bash
cd dashboard-sgi
npm run dev
```

Abre: `http://localhost:8081`

### 8. Login

Credenciais padrão (após seed):
- Email: `admin@demo.local`
- Password: `admin123`

## ✅ Verificação

1. ✅ Backend responde em `http://localhost:5801/api/health`
2. ✅ Frontend carrega em `http://localhost:8081`
3. ✅ Login funciona
4. ✅ Dashboard mostra dados

## 🎯 Próximos Passos

- Explorar a documentação Swagger: `http://localhost:5801/api/docs`
- Ver [README.md](README.md) para mais informações
- Consultar [TROUBLESHOOTING.md](dashboard-sgi/docs/TROUBLESHOOTING.md) se houver problemas

## 🐛 Problemas?

Ver [TROUBLESHOOTING.md](dashboard-sgi/docs/TROUBLESHOOTING.md)





