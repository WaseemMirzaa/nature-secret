#!/usr/bin/env bash
# Run on the server (e.g. droplet): pull latest and restart apps.
# Usage: ./scripts/deploy-pull-run.sh   (from repo root, or pass REPO_DIR)
set -e
REPO_DIR="${1:-/var/www/nature-secret}"
cd "$REPO_DIR"
git pull
npm ci
cd backend && npm ci && npm run build && cd ..
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
