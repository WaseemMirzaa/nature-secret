#!/usr/bin/env bash
# =============================================================================
# SERVER DEPLOY — /var/www/nature-secret
# =============================================================================
#
# --- Option A: script (recommended; same steps as manual below) ------------
#   chmod +x /var/www/nature-secret/scripts/deploy-pull-run.sh
#   /var/www/nature-secret/scripts/deploy-pull-run.sh
#   # with DB migrations:
#   RUN_MIGRATIONS=1 /var/www/nature-secret/scripts/deploy-pull-run.sh
#
# --- Option B: manual (one block, copy-paste on the server) ------------------
#   cd /var/www/nature-secret && git pull && \
#   cd /var/www/nature-secret/backend && npm ci && npm run build && \
#   cd /var/www/nature-secret && npm ci && rm -rf .next && \
#   NODE_OPTIONS='--max-old-space-size=4096' npm run build && \
#   pm2 restart nature-secret-api nature-secret-web && pm2 save
#
#   # optional: run migrations before pm2 (from repo root, after backend build):
#   # cd /var/www/nature-secret/backend && npm run migration:run:prod
#
# --- Option B2: manual step-by-step (same as above) ---------------------------
#   cd /var/www/nature-secret
#   git pull
#   cd /var/www/nature-secret/backend
#   npm ci
#   npm run build
#   cd /var/www/nature-secret
#   npm ci
#   rm -rf .next
#   NODE_OPTIONS='--max-old-space-size=4096' npm run build
#   pm2 restart nature-secret-api nature-secret-web
#   pm2 save
#
# Order: pull → API build → (optional migrations) → web install/clean/build → PM2.
set -euo pipefail

REPO_DIR="${1:-/var/www/nature-secret}"
cd "$REPO_DIR"

git pull

cd "$REPO_DIR/backend"
npm ci
npm run build
if [ "${RUN_MIGRATIONS:-0}" = 1 ]; then
  npm run migration:run:prod
fi

cd "$REPO_DIR"
npm ci
rm -rf .next
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
npm run build

if [ ! -f .next/BUILD_ID ]; then
  echo "ERROR: Frontend build failed (no .next/BUILD_ID). Not restarting PM2."
  exit 1
fi

pm2 restart nature-secret-api nature-secret-web
pm2 save
echo "Done. nature-secret-api + nature-secret-web restarted."
