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
npm run build
pm2 restart nature-secret-api nature-secret-web
pm2 save
echo "Done. API and web restarted."
