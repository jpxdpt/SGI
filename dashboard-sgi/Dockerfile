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
# NOTA: Variáveis VITE_* devem ser passadas como ARG durante o build
# Se não fornecidas, o build usará valores padrão/undefined (modo mock)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Stage 2: Servir ficheiros estáticos
FROM nginx:alpine

# Copiar ficheiros compilados
COPY --from=builder /app/dist /usr/share/nginx/html

# Script para injetar configuração em runtime através de window.ENV
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo '# Injetar variável de ambiente VITE_API_BASE_URL no HTML em runtime' >> /docker-entrypoint.sh && \
    echo 'if [ -n "$VITE_API_BASE_URL" ]; then' >> /docker-entrypoint.sh && \
    echo '  # Inserir script que define window.__ENV__ antes do bundle ser carregado' >> /docker-entrypoint.sh && \
    echo '  # Usar delimitador diferente para evitar conflitos com / na URL' >> /docker-entrypoint.sh && \
    echo '  sed -i "s|<script type=\"module\"|<script>window.__ENV__={VITE_API_BASE_URL:\"$VITE_API_BASE_URL\"};</script><script type=\"module\"|g" /usr/share/nginx/html/index.html' >> /docker-entrypoint.sh && \
    echo 'fi' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

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

ENTRYPOINT ["/docker-entrypoint.sh"]
