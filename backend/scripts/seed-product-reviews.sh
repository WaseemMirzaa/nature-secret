#!/usr/bin/env bash
# Seed pending customer reviews for a product (admin approves later).
# Usage:
#   ./scripts/seed-product-reviews.sh
#   PRODUCT_ID=<uuid> ./scripts/seed-product-reviews.sh
#   PRODUCT_ID=<uuid> REVIEWS_JSON=seeds/my-reviews.json ./scripts/seed-product-reviews.sh
#   FORCE_REVIEWS_SEED=1 ./scripts/seed-product-reviews.sh   # insert even if 50+ user reviews exist
#
# Defaults: reads backend/.env for MySQL; JSON from seeds/reviews-batch.json;
# product id from JSON "productId" or env PRODUCT_ID.
set -e
cd "$(dirname "$0")/.."
export PRODUCT_ID="${PRODUCT_ID:-}"
export REVIEWS_JSON="${REVIEWS_JSON:-}"
export FORCE_REVIEWS_SEED="${FORCE_REVIEWS_SEED:-}"
exec npx ts-node -r tsconfig-paths/register src/seed-reviews-batch.ts "$@"
