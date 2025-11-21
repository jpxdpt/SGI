# Dockerfile para o backend SGI
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Prisma e outras libs
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copiar ficheiros de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 5801

# Comando para iniciar
CMD ["npm", "run", "dev"]

