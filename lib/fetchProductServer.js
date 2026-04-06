/** Server-only: product + reviews for RSC (no auth). */

import { cache } from 'react';
import { getApiRequestTimeoutMs } from '@/lib/apiTimeout';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OLD_DOMAINS = ['https://shifaefitrat.com', 'http://shifaefitrat.com'];

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

/** Match client `resolveImageUrl` for OG / preload (server-safe). */
export function resolveAbsoluteImageUrl(path) {
  if (!path || typeof path !== 'string') return '';
  for (const old of OLD_DOMAINS) {
    if (path.startsWith(old)) {
      const rel = path.slice(old.length);
      const base = apiBase();
      return base ? `${base}${rel.startsWith('/') ? rel : `/${rel}`}` : rel;
    }
  }
  if (path.startsWith('http')) return path;
  const base = apiBase();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path;
}

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
    if (!data) return { product: null, reviews: [] };
    if (Array.isArray(data.reviews)) {
      const { reviews, ...product } = data;
      return { product, reviews };
    }
    return { product: data, reviews: [] };
  } catch {
    return { product: null, reviews: [] };
  }
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

/**
 * Same default variant + first image as ProductDetailClient initial state (LCP preload).
 */
export function getDefaultHeroImageSrcForProduct(product) {
  if (!product) return '';
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const defaultVariant = variants.length
    ? variants.reduce((best, v) => (best == null || (v.price ?? 0) < (best.price ?? 0) ? v : best), null)
    : null;
  const variant = defaultVariant ?? variants[0];
  const variantImageList =
    variant?.images && variant.images.length
      ? variant.images
      : variant?.image
        ? [variant.image]
        : product.images || [];
  const rawMain = variantImageList[0] || product.images?.[0] || '';
  return resolveAbsoluteImageUrl(rawMain);
}
