# Dockerfile para o backend SGI (na raiz do repo)
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Prisma, canvas e outras libs
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pkgconf \
    librsvg-dev \
    libjpeg-turbo-dev

WORKDIR /app

# Copiar apenas ficheiros necessários do diretório server
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma/

# Instalar dependências (sem devDependencies para reduzir tamanho)
RUN npm ci --omit=dev

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte do diretório server (excluindo node_modules via .dockerignore)
COPY server/src ./src
COPY server/tsconfig.json ./
COPY server/api ./api

# Expor porta
EXPOSE 5801

# Variável de ambiente
ENV NODE_ENV=production

# Comando para iniciar
CMD ["npm", "run", "start"]



# Instalar dependências do sistema necessárias para Prisma, canvas e outras libs
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pkgconf \
    librsvg-dev \
    libjpeg-turbo-dev

WORKDIR /app

# Copiar apenas ficheiros necessários do diretório server
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma/

# Instalar dependências (sem devDependencies para reduzir tamanho)
RUN npm ci --omit=dev

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte do diretório server (excluindo node_modules via .dockerignore)
COPY server/src ./src
COPY server/tsconfig.json ./
COPY server/api ./api

# Expor porta
EXPOSE 5801

# Variável de ambiente
ENV NODE_ENV=production

# Comando para iniciar
CMD ["npm", "run", "start"]

