# Dockerfile para o frontend SGI (dentro do dashboard-sgi)
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar ficheiros de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte (todos os ficheiros)
COPY . .

# Build da aplicação
RUN npm run build

# Stage 2: Servir ficheiros estáticos
FROM nginx:alpine

# Copiar ficheiros compilados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração nginx para SPA
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
