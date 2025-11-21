# Dockerfile para o backend SGI
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Prisma e outras libs
RUN apk add --no-cache libc6-compat openssl python3 make g++ \
    cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev pkgconf \
    librsvg-dev libjpeg-turbo-dev

WORKDIR /app

# Copiar apenas ficheiros necessários para instalar dependências
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Instalar dependências (incluindo devDependencies para compilar)
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte (excluindo node_modules via .dockerignore)
COPY src ./src
COPY tsconfig.json ./
COPY api ./api

# Compilar TypeScript
RUN npx tsc

# Verificar se a compilação funcionou
RUN ls -la dist/ || echo "Dist directory not found"
RUN ls -la dist/server.js || echo "server.js not found in dist"

# Remover devDependencies após compilar (opcional, para reduzir tamanho)
RUN npm prune --production

# Expor porta
EXPOSE 5801

# Variável de ambiente
ENV NODE_ENV=production

# Comando para iniciar (usar JavaScript compilado)
CMD ["node", "dist/server.js"]
