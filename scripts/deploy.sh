#!/usr/bin/env bash
# Push to origin and deploy on the droplet (pull, build, PM2 restart).
# Usage: VPS_HOST=your-droplet-ip VPS_USER=root ./scripts/deploy.sh
# Optional: SKIP_PUSH=1 to only run deploy on server (no git push).
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

echo "Deploying on $VPS_USER@$VPS_HOST..."
ssh "$VPS_USER@$VPS_HOST" "cd $REPO_DIR && git pull && npm ci && (cd backend && npm ci && npm run build) && rm -rf .next && npm run build && pm2 restart nature-secret-api nature-secret-web && pm2 save"
echo "Done."
