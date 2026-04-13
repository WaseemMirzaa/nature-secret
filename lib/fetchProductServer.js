/** Server-only: product + reviews for RSC (no auth). */

import { cache } from 'react';
import { getApiRequestTimeoutMs } from '@/lib/apiTimeout';
import { getDevFallbackProducts } from '@/lib/devCatalogFallback';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

/** Match client `resolveImageUrl` for OG / preload (server-safe). */
export { resolveAbsoluteImageUrl, getDefaultHeroImageSrcForProduct } from '@/lib/productImageResolve';

async function fetchProductWithReviewsJson(slugOrId) {
  const base = apiBase();
  const q = 'includeReviews=true';
  const path = UUID_RE.test(slugOrId)
    ? `${base}/api/v1/products/${encodeURIComponent(slugOrId)}?${q}`
    : `${base}/api/v1/products/slug/${encodeURIComponent(slugOrId)}?${q}`;
  const res = await fetch(path, {
    next: { revalidate: 120 },
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(getApiRequestTimeoutMs()),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Single API round-trip (product + reviews). Deduped across generateMetadata + page in one request via React cache().
 */
export const getCachedProductPageData = cache(async (slugOrId) => {
  if (!slugOrId || typeof slugOrId !== 'string') return { product: null, reviews: [] };
  try {
    const data = await fetchProductWithReviewsJson(slugOrId);
    if (data) {
      if (Array.isArray(data.reviews)) {
        const { reviews, ...product } = data;
        return { product, reviews };
      }
      return { product: data, reviews: [] };
    }
  } catch {
    /* fall through to dev fallback */
  }
  if (process.env.NODE_ENV === 'development') {
    const list = getDevFallbackProducts();
    const p = list.find((x) => x.slug === slugOrId || x.id === slugOrId);
    if (p) return { product: JSON.parse(JSON.stringify(p)), reviews: [] };
  }
  return { product: null, reviews: [] };
});

/** @deprecated Prefer getCachedProductPageData — kept for callers that only need product (same underlying cache). */
export async function fetchProductBySlugOrId(slugOrId) {
  const { product } = await getCachedProductPageData(slugOrId);
  return product;
}

/** @deprecated Alias for getCachedProductPageData */
export const fetchProductPageData = getCachedProductPageData;

/** Public content settings for product disclaimer (parallel with product fetch on server). */
export async function fetchContentSettingsServer() {
  const base = apiBase();
  try {
    const res = await fetch(`${base}/api/v1/settings/content`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(getApiRequestTimeoutMs()),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
