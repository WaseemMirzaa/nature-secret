#!/usr/bin/env bash
# Run on the server (e.g. droplet): pull latest and restart apps.
# Usage: ./scripts/deploy-pull-run.sh   (from repo root, or pass REPO_DIR)
#
# Equivalent manual steps (production):
#   cd /var/www/nature-secret
#   git pull
#   cd /var/www/nature-secret/backend && npm ci && npm run build && npm run migration:run:prod
#   cd /var/www/nature-secret && npm ci && rm -rf .next && npm run build
#   pm2 restart nature-secret-api nature-secret-web && pm2 save
set -e
REPO_DIR="${1:-/var/www/nature-secret}"
cd "$REPO_DIR"
git pull
npm ci
cd backend && npm ci && npm run build && npm run migration:run:prod && cd ..
rm -rf .next
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
npm run build
if [ ! -f .next/BUILD_ID ]; then
  echo "ERROR: Frontend build failed (no .next/BUILD_ID). Fix the build before restarting nature-secret-web."
  exit 1
fi
pm2 restart nature-secret-api nature-secret-web
pm2 save
echo "Done. API and web restarted."
