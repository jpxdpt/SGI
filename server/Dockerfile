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

# Instalar dependências (incluindo devDependencies para ts-node)
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte (excluindo node_modules via .dockerignore)
COPY src ./src
COPY tsconfig.json ./
COPY api ./api

# Expor porta
EXPOSE 5801

# Variável de ambiente
ENV NODE_ENV=production

# Comando para iniciar (usar ts-node diretamente - mais simples e confiável)
CMD ["npx", "ts-node", "--transpile-only", "src/server.ts"]
