# Dockerfile para o backend SGI
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Prisma e outras libs
RUN apk add --no-cache libc6-compat openssl python3 make g++

WORKDIR /app

# Copiar apenas ficheiros necessários para instalar dependências
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Instalar dependências (sem devDependencies para reduzir tamanho)
RUN npm ci --omit=dev

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

# Comando para iniciar
CMD ["npm", "run", "start"]

