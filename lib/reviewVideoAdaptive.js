/**
 * Pick review video variant (multi-bitrate uploads) from Network Information when available.
 * YouTube/Vimeo embeds already use provider ABR; this targets native MP4/WebM and HLS (.m3u8).
 */

function heightFromLabel(label) {
  const m = String(label || '').match(/(\d{3,4})\s*p/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveMediaUrl(raw, resolveImageUrl) {
  if (!raw || typeof raw !== 'string') return '';
  const t = raw.trim();
  if (!t) return '';
  const r = resolveImageUrl ? resolveImageUrl(t) : '';
  return r || (t.startsWith('http') ? t : '');
}

/**
 * @param {{ url?: string; height?: number; label?: string; sources?: unknown }} item
 * @returns {{ url: string; height: number }[]} best quality first (highest height first)
 */
export function buildReviewVideoVariants(item, resolvedPrimaryUrl, resolveImageUrl) {
  const rows = [];
  const seen = new Set();

  const push = (raw, heightHint, labelHint) => {
    const url = resolveMediaUrl(raw, resolveImageUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const h =
      (Number.isFinite(Number(heightHint)) && Number(heightHint) > 0 ? Number(heightHint) : null) ??
      heightFromLabel(labelHint) ??
      0;
    rows.push({ url, height: h });
  };

  if (item?.url) push(item.url, item.height, item.label);

  const sources = item?.sources;
  if (Array.isArray(sources)) {
    for (const s of sources) {
      if (!s || typeof s !== 'object') continue;
      const o = s;
      push(o.url, o.height, o.label);
    }
  }

  if (!rows.length && resolvedPrimaryUrl) {
    rows.push({ url: resolvedPrimaryUrl, height: 0 });
  }

  rows.sort((a, b) => (b.height || 0) - (a.height || 0));
  return rows;
}

/** @returns {'low' | 'medium' | 'high'} */
export function getNetworkTier() {
  if (typeof navigator === 'undefined') return 'medium';
  const c = navigator.connection;
  if (!c) return 'medium';
  const et = c.effectiveType;
  if (et === 'slow-2g' || et === '2g') return 'low';
  if (et === '3g') return 'medium';
  if (typeof c.downlink === 'number') {
    if (c.downlink < 1.25) return 'low';
    if (c.downlink < 5) return 'medium';
  }
  return 'high';
}

/**
 * @param {number} variantCount number of variants (best-first ordering)
 * @param {'low' | 'medium' | 'high'} tier
 */
export function pickVariantStartIndex(variantCount, tier) {
  const n = Math.max(0, Math.floor(Number(variantCount)) || 0);
  if (n <= 1) return 0;
  if (tier === 'low') return n - 1;
  if (tier === 'medium') return Math.max(0, Math.floor((n - 1) / 2));
  return 0;
}

export function isHlsUrl(url) {
  return typeof url === 'string' && /\.m3u8(\?|$)/i.test(url);
}
