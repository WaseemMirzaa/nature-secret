#!/usr/bin/env bash
# Push to origin and deploy on the droplet (pull, build, PM2 restart).
# Usage: VPS_HOST=your-droplet-ip VPS_USER=root ./scripts/deploy.sh
# Optional: SKIP_PUSH=1 to only run deploy on server (no git push).
# Optional: RUN_MIGRATIONS=1 to run backend npm run migration:run:prod after API build.
# Repo on server: REPO_DIR=/var/www/nature-secret (default).
set -e
cd "$(dirname "$0")/.."

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
REPO_DIR="${REPO_DIR:-/var/www/nature-secret}"

if [ -z "$VPS_HOST" ]; then
  echo "Set VPS_HOST (e.g. VPS_HOST=165.232.123.45 ./scripts/deploy.sh)"
  exit 1
fi

if [ -z "${SKIP_PUSH:-}" ]; then
  echo "Pushing to origin main..."
  git push origin main
fi

RUN_MIGRATIONS="${RUN_MIGRATIONS:-0}"
echo "Deploying on $VPS_USER@$VPS_HOST..."
ssh "$VPS_USER@$VPS_HOST" bash -s <<EOF
set -euo pipefail
cd "$REPO_DIR"
git pull
cd "$REPO_DIR/backend"
npm ci
npm run build
if [ "$RUN_MIGRATIONS" = 1 ]; then npm run migration:run:prod; fi
cd "$REPO_DIR"
npm ci
rm -rf .next
export NODE_OPTIONS=\${NODE_OPTIONS:---max-old-space-size=4096}
npm run build
test -f .next/BUILD_ID
pm2 restart nature-secret-api nature-secret-web
pm2 save
EOF
echo "Done."
