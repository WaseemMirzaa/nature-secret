/**
 * Session attribution from URL (Meta / custom). Explicit ids + common UTM fallbacks.
 * Stored in sessionStorage; merged on each navigation and again at track() from current URL.
 */
export const ATTRIBUTION_STORAGE_KEY = 'nature_secret_ad_attribution';

const MAX_LEN = 128;

function sliceId(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.slice(0, MAX_LEN);
}

/**
 * @param {string} [search] — window.location.search or full URL query part
 * @returns {{ campaignId: string, adsetId: string, adId: string }}
 */
export function parseAttributionFromSearch(search) {
  const q = typeof search === 'string' ? search : '';
  const params = new URLSearchParams(q.startsWith('?') ? q.slice(1) : q);
  const campaignId = sliceId(
    params.get('campaign_id') ||
      params.get('campaignId') ||
      params.get('utm_campaign'),
  );
  const adsetId = sliceId(
    params.get('adset_id') || params.get('adsetId') || params.get('utm_term'),
  );
  const adId = sliceId(params.get('ad_id') || params.get('adId') || params.get('utm_content'));
  return { campaignId, adsetId, adId };
}

function mergeAttributionLayers(base, fromUrl) {
  return {
    campaignId: sliceId(fromUrl.campaignId || base.campaignId),
    adsetId: sliceId(fromUrl.adsetId || base.adsetId),
    adId: sliceId(fromUrl.adId || base.adId),
  };
}

/** Persist URL attribution into sessionStorage; merges on every call when URL has any id (fixes missed first paint / redirects). */
export function captureAttributionFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const fromUrl = parseAttributionFromSearch(window.location.search || '');
    if (!fromUrl.campaignId && !fromUrl.adsetId && !fromUrl.adId) return;
    const prev = getStoredAttributionRaw();
    const next = mergeAttributionLayers(prev, fromUrl);
    if (!next.campaignId && !next.adsetId && !next.adId) return;
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  } catch (_) {}
}

function getStoredAttributionRaw() {
  if (typeof window === 'undefined') return { campaignId: '', adsetId: '', adId: '' };
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return { campaignId: '', adsetId: '', adId: '' };
    const o = JSON.parse(raw);
    return {
      campaignId: sliceId(o.campaignId),
      adsetId: sliceId(o.adsetId),
      adId: sliceId(o.adId),
    };
  } catch {
    return { campaignId: '', adsetId: '', adId: '' };
  }
}

/** Merges sessionStorage with current URL so purchase/checkout still get ids if storage was empty or stale. */
export function getAttributionForTracking() {
  if (typeof window === 'undefined') return {};
  const stored = getStoredAttributionRaw();
  const fromUrl = parseAttributionFromSearch(window.location.search || '');
  const merged = mergeAttributionLayers(stored, fromUrl);
  const out = {};
  if (merged.campaignId) out.campaignId = merged.campaignId;
  if (merged.adsetId) out.adsetId = merged.adsetId;
  if (merged.adId) out.adId = merged.adId;
  return out;
}

/** @returns {{ campaignId?: string, adsetId?: string, adId?: string }} */
export function getStoredAttribution() {
  const m = getStoredAttributionRaw();
  const out = {};
  if (m.campaignId) out.campaignId = m.campaignId;
  if (m.adsetId) out.adsetId = m.adsetId;
  if (m.adId) out.adId = m.adId;
  return out;
}

/** For admin UI: format one line from event or attribution object */
export function formatAttributionLine(o) {
  if (!o) return '';
  const c = o.campaignId || o.campaign_id || '';
  const a = o.adsetId || o.adset_id || '';
  const d = o.adId || o.ad_id || '';
  const parts = [];
  if (c) parts.push(`c:${c}`);
  if (a) parts.push(`adset:${a}`);
  if (d) parts.push(`ad:${d}`);
  return parts.join(' · ');
}

function normId(v) {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
}

export function pickAttributionFromEvent(e) {
  if (!e || typeof e !== 'object') return null;
  const c = normId(e.campaignId ?? e.campaign_id);
  const a = normId(e.adsetId ?? e.adset_id);
  const d = normId(e.adId ?? e.ad_id);
  if (!c && !a && !d) return null;
  return { campaignId: c, adsetId: a, adId: d };
}

/** Remove empty optional ad fields so persisted events stay valid JSON and sessions group reliably. */
export function stripEmptyAttributionFields(event) {
  if (!event || typeof event !== 'object') return event;
  const out = { ...event };
  for (const key of ['campaignId', 'adsetId', 'adId', 'campaign_id', 'adset_id', 'ad_id']) {
    if (key in out && (out[key] == null || String(out[key]).trim() === '')) {
      delete out[key];
    }
  }
  return out;
}

/** Earliest event in the session that carries campaign / adset / ad ids (first-touch). */
export function getAttributionFromSessionEvents(sessionEvents) {
  if (!Array.isArray(sessionEvents) || !sessionEvents.length) return null;
  const sorted = [...sessionEvents].sort((a, b) =>
    String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
  );
  for (const e of sorted) {
    const pick = pickAttributionFromEvent(e);
    if (pick) return pick;
  }
  return null;
}
