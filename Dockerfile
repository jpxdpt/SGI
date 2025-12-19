# Dockerfile para o backend SGI
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

# Copiar ficheiros de dependências
COPY server/package.json server/package-lock.json ./

# Instalar todas as dependências (necessário para ts-node em runtime por agora)
RUN npm install

# Copiar prisma schema e seed
COPY server/prisma ./prisma/

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY server/src ./src
COPY server/tsconfig.json ./
# COPY server/api ./api

# Expor porta
EXPOSE 5801

# Variável de ambiente
ENV NODE_ENV=production

# Comando para iniciar
CMD ["npm", "run", "start"]
