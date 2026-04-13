import { resolveImageUrl } from '@/lib/api';

/**
 * Preload href for `<link rel="preload" as="image">` on `/`.
 * Prefer **hero slider** first — on mobile it is `order-1` and usually wins LCP; product grid is below.
 * Fallback: first in-stock product image (no slider / empty hero).
 */
export function getHomeLcpPreloadHref(products, slider) {
  const slides = Array.isArray(slider) ? slider : [];
  const s0 = slides[0];
  if (s0?.imageUrl) {
    const u = resolveImageUrl(s0.imageUrl);
    if (u && (u.startsWith('http') || u.startsWith('/'))) return u;
  }
  const list = Array.isArray(products) ? products : [];
  const stocked = list.filter((p) => (p.inventory ?? 1) > 0);
  const first = stocked[0];
  if (first) {
    const raw = (first.images && first.images[0]) || first.image;
    if (raw && typeof raw === 'string') {
      const u = resolveImageUrl(raw);
      if (u && (u.startsWith('http') || u.startsWith('/'))) return u;
    }
  }
  return null;
}
