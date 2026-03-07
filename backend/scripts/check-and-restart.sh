#!/usr/bin/env bash
# Cron script: restart backend if /health is down. Uses node server.js.
# Example cron: */5 * * * * cd /path/to/backend && ./scripts/check-and-restart.sh >> /tmp/backend-cron.log 2>&1

set -e
cd "$(dirname "$0")/.."
PORT="${PORT:-4000}"
URL="http://127.0.0.1:${PORT}/health"
LOCK="/tmp/nature-secret-backend-restart.lock"

if curl -sf --max-time 5 "$URL" >/dev/null 2>&1; then
  exit 0
fi

# Simple lock: avoid multiple restarts (works on macOS and Linux)
if [ -f "$LOCK" ]; then
  pid=$(cat "$LOCK")
  kill -0 "$pid" 2>/dev/null && exit 0
fi
echo $$ > "$LOCK"

if curl -sf --max-time 5 "$URL" >/dev/null 2>&1; then
  rm -f "$LOCK"
  exit 0
fi

nohup node server.js >> /tmp/backend-start.log 2>&1 &
disown
echo "$(date -Iseconds) restarted backend (port $PORT)"
rm -f "$LOCK"
