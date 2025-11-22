# Guia Docker - SGI Backend

## 📦 Opções para usar Docker

### 1. **Construir imagem localmente** (Recomendado)

```bash
cd server
docker build -t sgi-backend .
```

Isto cria uma imagem chamada `sgi-backend` a partir do `Dockerfile`.

### 2. **Importar imagem Docker existente**

Se tens uma imagem Docker já construída (ficheiro `.tar` ou `.tar.gz`):

```bash
# Importar imagem de um ficheiro
docker load -i sgi-backend.tar

# Ou se estiver comprimida
docker load -i sgi-backend.tar.gz
```

### 3. **Fazer pull de uma imagem do Docker Hub**

Se publicares a imagem no Docker Hub:

```bash
# Fazer pull da imagem
docker pull seu-username/sgi-backend:latest

# Ou se for privada, fazer login primeiro
docker login
docker pull seu-username/sgi-backend:latest
```

### 4. **Exportar imagem para partilhar**

Se quiseres exportar a imagem que construíste:

```bash
# Exportar imagem para ficheiro
docker save sgi-backend > sgi-backend.tar

# Ou comprimida
docker save sgi-backend | gzip > sgi-backend.tar.gz
```

## 🚀 Executar o container

### Opção A: Docker run direto

```bash
docker run -p 5801:5801 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e JWT_REFRESH_SECRET="..." \
  -e DEFAULT_TENANT_ID="tenant-default" \
  -e PORT=5801 \
  sgi-backend
```

### Opção B: Docker Compose (Mais fácil)

```bash
cd server
docker-compose up
```

## 📋 Verificar imagens disponíveis

```bash
# Listar todas as imagens
docker images

# Ver detalhes de uma imagem
docker inspect sgi-backend
```

## 🔍 Verificar se Docker está instalado

```bash
docker --version
docker-compose --version
```

## 💡 Dicas

1. **Primeira vez**: Constrói a imagem localmente com `docker build`
2. **Partilhar**: Exporta a imagem com `docker save` se quiseres partilhar
3. **Usar existente**: Se alguém te der um ficheiro `.tar`, usa `docker load`
4. **Docker Hub**: Podes publicar no Docker Hub para facilitar o pull

## 🐳 Publicar no Docker Hub (Opcional)

Se quiseres publicar a imagem:

```bash
# 1. Fazer login
docker login

# 2. Tag da imagem
docker tag sgi-backend seu-username/sgi-backend:latest

# 3. Push para Docker Hub
docker push seu-username/sgi-backend:latest
```

Depois outros podem fazer:
```bash
docker pull seu-username/sgi-backend:latest
```

# Guia Docker - SGI Backend

## 📦 Opções para usar Docker

### 1. **Construir imagem localmente** (Recomendado)

```bash
cd server
docker build -t sgi-backend .
```

Isto cria uma imagem chamada `sgi-backend` a partir do `Dockerfile`.

### 2. **Importar imagem Docker existente**

Se tens uma imagem Docker já construída (ficheiro `.tar` ou `.tar.gz`):

```bash
# Importar imagem de um ficheiro
docker load -i sgi-backend.tar

# Ou se estiver comprimida
docker load -i sgi-backend.tar.gz
```

### 3. **Fazer pull de uma imagem do Docker Hub**

Se publicares a imagem no Docker Hub:

```bash
# Fazer pull da imagem
docker pull seu-username/sgi-backend:latest

# Ou se for privada, fazer login primeiro
docker login
docker pull seu-username/sgi-backend:latest
```

### 4. **Exportar imagem para partilhar**

Se quiseres exportar a imagem que construíste:

```bash
# Exportar imagem para ficheiro
docker save sgi-backend > sgi-backend.tar

# Ou comprimida
docker save sgi-backend | gzip > sgi-backend.tar.gz
```

## 🚀 Executar o container

### Opção A: Docker run direto

```bash
docker run -p 5801:5801 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e JWT_REFRESH_SECRET="..." \
  -e DEFAULT_TENANT_ID="tenant-default" \
  -e PORT=5801 \
  sgi-backend
```

### Opção B: Docker Compose (Mais fácil)

```bash
cd server
docker-compose up
```

## 📋 Verificar imagens disponíveis

```bash
# Listar todas as imagens
docker images

# Ver detalhes de uma imagem
docker inspect sgi-backend
```

## 🔍 Verificar se Docker está instalado

```bash
docker --version
docker-compose --version
```

## 💡 Dicas

1. **Primeira vez**: Constrói a imagem localmente com `docker build`
2. **Partilhar**: Exporta a imagem com `docker save` se quiseres partilhar
3. **Usar existente**: Se alguém te der um ficheiro `.tar`, usa `docker load`
4. **Docker Hub**: Podes publicar no Docker Hub para facilitar o pull

## 🐳 Publicar no Docker Hub (Opcional)

Se quiseres publicar a imagem:

```bash
# 1. Fazer login
docker login

# 2. Tag da imagem
docker tag sgi-backend seu-username/sgi-backend:latest

# 3. Push para Docker Hub
docker push seu-username/sgi-backend:latest
```

Depois outros podem fazer:
```bash
docker pull seu-username/sgi-backend:latest
```

