#!/bin/bash

# Script de deploy para a VM SGI
echo "🚀 Iniciando deploy..."

# 1. Puxar as últimas alterações
echo "📥 Fazendo git pull..."
git pull origin main

# 2. Reconstruir e reiniciar os containers
echo "🛠️ Reconstruindo containers..."
docker-compose up -d --build

# 3. Limpar imagens antigas (opcional)
echo "🧹 Limpando imagens antigas..."
docker image prune -f

echo "✅ Deploy concluído com sucesso!"
echo "🌐 Frontend disponível em: http://seu-ip:8100"
echo "📡 Backend disponível em: http://seu-ip:5801/api"
