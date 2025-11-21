# Guia de Deployment - SGI

Guia completo para fazer deploy do Sistema de Gestão Integrada em produção.

## 📋 Pré-requisitos

- Servidor com Node.js 18+ instalado
- PostgreSQL 14+ acessível
- Domínio configurado (opcional, mas recomendado)
- Certificado SSL (HTTPS obrigatório em produção)

## 🏗️ Arquitetura de Deployment

```
┌─────────────┐
│   Nginx     │ ← Reverse proxy + SSL
│  (Port 443) │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼─────┐
│  Frontend   │  │ Backend  │
│  (Static)   │  │ (Node.js)│
│  Port 8081  │  │ Port 5801│
└─────────────┘  └────┬──────┘
                      │
              ┌───────▼───────┐
              │  PostgreSQL   │
              │  (Port 5432)  │
              └───────────────┘
```

## 🚀 Opção 1: Deploy Manual

### Backend

1. **Preparar servidor**:
```bash
# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt-get install postgresql postgresql-contrib
```

2. **Clonar e configurar**:
```bash
cd /opt
git clone <seu-repo> sgi
cd sgi/server
npm install --production
```

3. **Configurar variáveis de ambiente**:
```bash
cp example.env .env
nano .env
```

**Configuração mínima para produção**:
```env
NODE_ENV=production
PORT=5801
DATABASE_URL=postgresql://user:password@localhost:5432/sgi
JWT_SECRET=<gerar-secret-forte>
JWT_REFRESH_SECRET=<gerar-outro-secret-forte>
FRONTEND_URL=https://sgi.exemplo.pt
DEFAULT_TENANT_ID=tenant-default
API_URL=https://api.sgi.exemplo.pt/api
```

**Gerar secrets seguros**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. **Configurar base de dados**:
```bash
# Criar base de dados
sudo -u postgres psql
CREATE DATABASE sgi;
CREATE USER sgi_user WITH PASSWORD 'senha_segura';
GRANT ALL PRIVILEGES ON DATABASE sgi TO sgi_user;
\q

# Aplicar migrações
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

5. **Build e iniciar**:
```bash
npm run build
npm start
```

6. **PM2 (Recomendado para produção)**:
```bash
# Instalar PM2
npm install -g pm2

# Iniciar com PM2
pm2 start dist/server.js --name sgi-backend

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

### Frontend

1. **Build**:
```bash
cd /opt/sgi/dashboard-sgi
npm install
npm run build
```

2. **Servir com Nginx**:
```nginx
server {
    listen 80;
    server_name sgi.exemplo.pt;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sgi.exemplo.pt;
    
    ssl_certificate /etc/letsencrypt/live/sgi.exemplo.pt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sgi.exemplo.pt/privkey.pem;
    
    root /opt/sgi/dashboard-sgi/dist;
    index index.html;
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache de assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy para API
    location /api {
        proxy_pass http://localhost:5801;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **SSL com Let's Encrypt**:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d sgi.exemplo.pt
```

## 🐳 Opção 2: Docker (Recomendado)

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: sgi
      POSTGRES_USER: sgi_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sgi_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://sgi_user:${DB_PASSWORD}@postgres:5432/sgi
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
      PORT: 5801
    ports:
      - "5801:5801"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./dashboard-sgi
      dockerfile: Dockerfile
    environment:
      VITE_API_BASE_URL: ${API_URL}
    ports:
      - "8081:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### Dockerfile (Backend)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
EXPOSE 5801
CMD ["node", "dist/server.js"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Deploy com Docker

```bash
# Criar .env
cat > .env << EOF
DB_PASSWORD=senha_segura
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
FRONTEND_URL=https://sgi.exemplo.pt
API_URL=https://api.sgi.exemplo.pt/api
EOF

# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Aplicar migrações
docker-compose exec backend npx prisma migrate deploy
```

## ☁️ Opção 3: Plataformas Cloud

### Vercel (Frontend)

1. Conecta o repositório GitHub
2. Configura variáveis de ambiente:
   - `VITE_API_BASE_URL`
3. Deploy automático em cada push

### Railway/Render (Backend)

1. Conecta o repositório
2. Configura variáveis de ambiente
3. Adiciona PostgreSQL addon
4. Deploy automático

### AWS/GCP/Azure

Ver documentação específica de cada plataforma para:
- EC2/Compute Engine/VMs
- RDS/Cloud SQL/Managed PostgreSQL
- Load balancers
- CDN para frontend

## 🔒 Segurança em Produção

### Checklist

- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` são únicos e seguros
- [ ] `NODE_ENV=production` definido
- [ ] HTTPS configurado (Let's Encrypt)
- [ ] CORS configurado apenas para domínio de produção
- [ ] Rate limiting ativo
- [ ] Firewall configurado (apenas portas necessárias)
- [ ] Backups automáticos da base de dados
- [ ] Logs monitorizados
- [ ] Secrets não commitados no Git

### Headers de Segurança

O backend já inclui:
- Helmet (CSP, HSTS, etc)
- CORS restrito
- Rate limiting
- Sanitização de inputs

## 📊 Monitorização

### Health Checks

```bash
# Status do servidor
curl https://api.sgi.exemplo.pt/health

# Verificação de BD
curl https://api.sgi.exemplo.pt/ready
```

### Logs

```bash
# PM2
pm2 logs sgi-backend

# Docker
docker-compose logs -f backend

# Systemd
journalctl -u sgi-backend -f
```

## 🔄 Atualizações

### Processo de Deploy

1. **Backup**:
```bash
# Backup da BD
pg_dump -U sgi_user sgi > backup_$(date +%Y%m%d).sql
```

2. **Pull atualizações**:
```bash
git pull origin main
```

3. **Atualizar dependências**:
```bash
npm install
```

4. **Aplicar migrações**:
```bash
npx prisma migrate deploy
```

5. **Rebuild e restart**:
```bash
npm run build
pm2 restart sgi-backend
# ou
docker-compose restart backend
```

## 🗄️ Backups

### Script de Backup Automático

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/sgi"
DB_NAME="sgi"
DB_USER="sgi_user"

mkdir -p $BACKUP_DIR

# Backup da base de dados
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Manter apenas últimos 30 dias
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup concluído: db_$DATE.sql.gz"
```

### Cron Job

```bash
# Executar diariamente às 2h
0 2 * * * /opt/sgi/scripts/backup.sh
```

## 🐛 Troubleshooting

Ver `TROUBLESHOOTING.md` para problemas comuns.

## 📚 Recursos Adicionais

- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt](https://letsencrypt.org/)





