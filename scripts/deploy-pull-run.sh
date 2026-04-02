#!/usr/bin/env bash
# Run ON THE SERVER (default repo: /var/www/nature-secret; override path as $1).
#
#   chmod +x /var/www/nature-secret/scripts/deploy-pull-run.sh
#   /var/www/nature-secret/scripts/deploy-pull-run.sh
#   # or with DB migrations:
#   RUN_MIGRATIONS=1 /var/www/nature-secret/scripts/deploy-pull-run.sh
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
