/**
 * First-touch ad attribution from landing URL query params (Meta / custom campaigns).
 * Stored per browser session. Keys: campaign_id, adset_id, ad_id (camelCase aliases supported).
 * Separate from Meta Pixel/CAPI (Pixel only loads for home + Meta landing; this enriches local analytics).
 */
export const ATTRIBUTION_STORAGE_KEY = 'nature_secret_ad_attribution';

export function captureAttributionFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const campaignId = (params.get('campaign_id') || params.get('campaignId') || '').trim();
    const adsetId = (params.get('adset_id') || params.get('adsetId') || '').trim();
    const adId = (params.get('ad_id') || params.get('adId') || '').trim();
    if (!campaignId && !adsetId && !adId) return;
    sessionStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify({ campaignId, adsetId, adId }),
    );
  } catch (_) {}
}

/** @returns {{ campaignId?: string, adsetId?: string, adId?: string }} */
export function getStoredAttribution() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    const out = {};
    if (o.campaignId) out.campaignId = String(o.campaignId).slice(0, 128);
    if (o.adsetId) out.adsetId = String(o.adsetId).slice(0, 128);
    if (o.adId) out.adId = String(o.adId).slice(0, 128);
    return out;
  } catch {
    return {};
  }
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
