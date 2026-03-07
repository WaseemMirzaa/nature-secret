#!/usr/bin/env bash
# Commit and push main repo (frontend + backend), then push backend subtree to backend-repo.
set -e
cd "$(dirname "$0")/.."
MSG="${1:-Update frontend and backend}"
git add -A
git status
if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi
git commit -m "$MSG"
git push origin main
if ! git subtree push --prefix=backend backend-repo main; then
  echo "Subtree push to backend-repo failed. Backend is in main repo; push backend-repo manually if needed."
fi
