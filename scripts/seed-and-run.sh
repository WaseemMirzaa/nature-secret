#!/bin/bash
# Seed DB and run local stack. Usage: ./scripts/seed-and-run.sh
# Requires: Docker (for MySQL), Node, npm

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting MySQL (Docker)..."
docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || true
sleep 3

echo "==> Backend: install deps (if needed), seed, then start..."
cd "$ROOT/backend"
if [ ! -d node_modules ]; then
  npm install
fi
# Load .env for seed
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
npm run seed || echo "Seed failed (MySQL may not be ready or deps missing). Run manually: cd backend && npm run seed"
echo "==> Start backend with: cd backend && npm run start:dev"
echo "==> Start frontend with: npm run dev"
echo ""
echo "Admin: admin@naturesecret.pk / Admin123!"
echo "Staff: staff@naturesecret.pk / Staff123!"
