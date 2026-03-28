/** Server-only: fetch one product for RSC (no auth). */

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

export async function fetchProductBySlugOrId(slugOrId) {
  if (!slugOrId || typeof slugOrId !== 'string') return null;
  const base = apiBase();
  const path = UUID_RE.test(slugOrId)
    ? `${base}/api/v1/products/${encodeURIComponent(slugOrId)}`
    : `${base}/api/v1/products/slug/${encodeURIComponent(slugOrId)}`;
  try {
    const res = await fetch(path, {
      next: { revalidate: 120 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchReviewsForProductId(productId) {
  if (!productId) return [];
  const base = apiBase();
  try {
    const res = await fetch(`${base}/api/v1/reviews?productId=${encodeURIComponent(productId)}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Product + reviews in one server round-trip after product id is known (reviews parallel in SSR vs client waterfall). */
export async function fetchProductPageData(slugOrId) {
  const product = await fetchProductBySlugOrId(slugOrId);
  if (!product?.id) return { product: null, reviews: [] };
  const reviews = await fetchReviewsForProductId(product.id);
  return { product, reviews };
}
