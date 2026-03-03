#!/usr/bin/env bash
# Local MySQL setup without Docker: create/drop DB and user.
# Requires MySQL server installed (e.g. brew install mysql && brew services start mysql).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client not found. Install MySQL:"
  echo "  macOS: brew install mysql && brew services start mysql"
  echo "  Ubuntu: sudo apt install mysql-server && sudo systemctl start mysql"
  exit 1
fi

# Load backend/.env for optional MYSQL_ROOT_PASSWORD
ROOT_PASS=""
if [ -f backend/.env ]; then
  ROOT_PASS=$(grep -E '^MYSQL_ROOT_PASSWORD=' backend/.env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
fi
[ -z "$ROOT_PASS" ] && [ -n "$MYSQL_ROOT_PASSWORD" ] && ROOT_PASS="$MYSQL_ROOT_PASSWORD"

DB_NAME="${MYSQL_DATABASE:-nature_secret}"
DB_USER="${MYSQL_USER:-nature_secret}"
DB_PASS="${MYSQL_PASSWORD:-nature_secret_dev}"

MYSQL_CMD="mysql -u root"
[ -n "$ROOT_PASS" ] && MYSQL_CMD="mysql -u root -p${ROOT_PASS}"

echo "Dropping existing database (if any) and creating fresh $DB_NAME..."
$MYSQL_CMD -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || {
  echo "Could not connect as root. Try: mysql -u root -p (set MYSQL_ROOT_PASSWORD in backend/.env if you use a root password)."
  exit 1
}

echo "Creating user $DB_USER if needed and granting privileges..."
$MYSQL_CMD -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS'; GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || true

echo "MySQL database $DB_NAME is ready. Start backend (npm run start:dev in backend/) then run: npm run seed:admin"
exit 0
