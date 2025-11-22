#!/bin/bash
# deploy.sh
set -e

echo "📦 Buildando frontend..."
cd frontend
npm ci
npm run build
cd ..

echo "🔧 Atualizando containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "✅ Deploy concluído!"