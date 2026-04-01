/**
 * Session attribution from URL (Meta / custom). Explicit ids + common UTM fallbacks.
 * Stored in sessionStorage; merged on each navigation and again at track() from current URL.
 */
export const ATTRIBUTION_STORAGE_KEY = 'nature_secret_ad_attribution';

const MAX_LEN = 128;

/** Drop empty, oversize, and unreplaced Meta URL tokens like {{campaign.id}}. */
function sliceId(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.includes('{{')) return '';
  return s.slice(0, MAX_LEN);
}

function lowerKeyMap(params) {
  const m = new Map();
  for (const k of params.keys()) {
    m.set(k.toLowerCase(), k);
  }
  return m;
}

/** First matching param (case-insensitive keys). */
function getParamCI(params, ...names) {
  const map = lowerKeyMap(params);
  for (const n of names) {
    const key = map.get(String(n).toLowerCase());
    if (!key) continue;
    const raw = params.get(key);
    const v = sliceId(raw);
    if (v) return v;
  }
  return '';
}

function queryStringFromHash(hash) {
  const h = typeof hash === 'string' ? hash : '';
  if (!h) return '';
  const noHash = h.startsWith('#') ? h.slice(1) : h;
  const qi = noHash.indexOf('?');
  if (qi >= 0) return noHash.slice(qi + 1);
  if (noHash.includes('=')) return noHash;
  return '';
}

/**
 * Parse Meta / UTM ids from a query string (no leading ? required).
 * Supports campaign_id / adset_id / ad_id and case variants (home, shop, product).
 */
function parseAttributionQueryString(queryBody) {
  const body = typeof queryBody === 'string' ? queryBody : '';
  const params = new URLSearchParams(body);
  const campaignId = getParamCI(
    params,
    'campaign_id',
    'campaignid',
    'fb_campaign_id',
    'utm_campaign',
  );
  const adsetId = getParamCI(
    params,
    'adset_id',
    'adsetid',
    'adgroup_id',
    'adgroupid',
    'fb_adset_id',
    'utm_term',
  );
  const adId = getParamCI(params, 'ad_id', 'adid', 'fb_ad_id', 'utm_content');
  return { campaignId, adsetId, adId };
}

function mergeTwoParsed(a, b) {
  return {
    campaignId: sliceId(a.campaignId || b.campaignId),
    adsetId: sliceId(a.adsetId || b.adsetId),
    adId: sliceId(a.adId || b.adId),
  };
}

/**
 * @param {string} [search] — window.location.search or query part
 * @returns {{ campaignId: string, adsetId: string, adId: string }}
 */
export function parseAttributionFromSearch(search) {
  const q = typeof search === 'string' ? search : '';
  const body = q.startsWith('?') ? q.slice(1) : q;
  return parseAttributionQueryString(body);
}

/**
 * Merge ?search and #hash query (e.g. …/shop#?campaign_id=…) for the same ids Meta uses in ads.
 */
export function parseAttributionFromLocation(search, hash) {
  const s = typeof search === 'string' ? search : '';
  const h = typeof hash === 'string' ? hash : '';
  const sb = s.startsWith('?') ? s.slice(1) : s;
  const hb = queryStringFromHash(h);
  if (!hb) return parseAttributionQueryString(sb);
  if (!sb) return parseAttributionQueryString(hb);
  return mergeTwoParsed(parseAttributionQueryString(sb), parseAttributionQueryString(hb));
}

/** Append stored ad ids to a path so /shop → /shop redirects keep campaign_id=… in the bar when possible. */
export function buildPathWithStoredAttribution(pathWithOptionalQuery) {
  const raw = String(pathWithOptionalQuery || '').trim();
  if (!raw) return raw;
  const qm = raw.indexOf('?');
  const pathPart = qm >= 0 ? raw.slice(0, qm) : raw;
  const existing = new URLSearchParams(qm >= 0 ? raw.slice(qm + 1) : '');
  const a = getStoredAttribution();
  if (a.campaignId && !getParamCI(existing, 'campaign_id', 'campaignid', 'fb_campaign_id', 'utm_campaign')) {
    existing.set('campaign_id', a.campaignId);
  }
  if (a.adsetId && !getParamCI(existing, 'adset_id', 'adsetid', 'adgroup_id', 'adgroupid', 'fb_adset_id', 'utm_term')) {
    existing.set('adset_id', a.adsetId);
  }
  if (a.adId && !getParamCI(existing, 'ad_id', 'adid', 'fb_ad_id', 'utm_content')) {
    existing.set('ad_id', a.adId);
  }
  const qs = existing.toString();
  return qs ? `${pathPart}?${qs}` : pathPart;
}

/** First-touch per field: keep stored values; URL only fills empty slots (product deep links + later navigations). */
function mergeAttributionLayers(base, fromUrl) {
  return {
    campaignId: sliceId(base.campaignId || fromUrl.campaignId),
    adsetId: sliceId(base.adsetId || fromUrl.adsetId),
    adId: sliceId(base.adId || fromUrl.adId),
  };
}

/** Persist URL attribution into sessionStorage; merges on every call when URL has any id (fixes missed first paint / redirects). */
export function captureAttributionFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const fromUrl = parseAttributionFromLocation(window.location.search || '', window.location.hash || '');
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

/** Merges sessionStorage with current URL: stored ids win, query params only fill missing fields. */
export function getAttributionForTracking() {
  if (typeof window === 'undefined') return {};
  const stored = getStoredAttributionRaw();
  const fromUrl = parseAttributionFromLocation(window.location.search || '', window.location.hash || '');
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
  const c = sliceId(normId(e.campaignId ?? e.campaign_id));
  const a = sliceId(normId(e.adsetId ?? e.adset_id));
  const d = sliceId(normId(e.adId ?? e.ad_id));
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
