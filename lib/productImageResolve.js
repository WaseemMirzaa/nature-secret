/**
 * Shared product image URL resolution (server + client). Keeps LCP preload, OG, and hero in sync.
 */

const OLD_DOMAINS = ['https://shifaefitrat.com', 'http://shifaefitrat.com'];

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

/** Match client `resolveImageUrl` for OG / preload / LCP (works on server and client). */
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

/** Default variant + first image — same as ProductDetailClient initial hero (LCP preload target). */
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
