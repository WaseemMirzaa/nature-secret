import { resolveImageUrl } from '@/lib/api';

/**
 * First image likely to drive LCP on `/`: first in-stock product (mobile + grid),
 * else first hero slider image. Used for `<link rel="preload" as="image">` only.
 */
export function getHomeLcpPreloadHref(products, slider) {
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
  const slides = Array.isArray(slider) ? slider : [];
  const s0 = slides[0];
  if (s0?.imageUrl) {
    const u = resolveImageUrl(s0.imageUrl);
    if (u && (u.startsWith('http') || u.startsWith('/'))) return u;
  }
  return null;
}
