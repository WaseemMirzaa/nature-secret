'use client';

import { sendMetaCapi } from '@/lib/api';
import { useAnalyticsStore } from '@/lib/store';
import { isMetaPixelEnabledForSession } from '@/lib/meta-pixel-gate';
import { getAttributionForTracking } from '@/lib/attribution';

function splitName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

/** E.164 digits only; PK mobiles often 03xx… → 923xx… */
function normalizePhoneForMeta(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0') && d.length >= 10 && d.length <= 11) d = `92${d.slice(1)}`;
  else if (!d.startsWith('92') && d.length === 10 && d.startsWith('3')) d = `92${d}`;
  if (d.length < 10 || d.length > 15) return '';
  return d;
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

function normalizeCurrencyCode(currency) {
  const c = String(currency ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  return /^[A-Z]{3}$/.test(c) ? c : 'PKR';
}

/**
 * Meta `value` / `custom_data.value`: finite float (monetary); 2 d.p. avoids binary float noise in Pixel + CAPI.
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/custom-data
 */
function metaMonetaryFloat(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function metaCommerceValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  let n;
  if (typeof value === 'number' && Number.isFinite(value)) n = value;
  else n = parseFloat(String(value).trim().replace(/,/g, ''));
  return metaMonetaryFloat(n);
}

/** Meta `num_items`: non-negative integer in Pixel + CAPI `custom_data`. */
function metaNumItems(raw) {
  const x = Number(raw);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.round(x));
}

/** Meta Purchase `content_type`: only `product` or `product_group` (Graph / Pixel). */
function normalizeMetaPurchaseContentType(raw) {
  const t = String(raw || 'product')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return t === 'product_group' ? 'product_group' : 'product';
}

/** ASCII-only trim for city/state (avoids capig validation issues). */
function asciiName(s, max = 50) {
  const t = String(s || '')
    .trim()
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, max);
  return t || '';
}

/** Pixel advanced matching for Purchase only — email, phone, name, address, city, zip, country. */
function buildPurchaseMatchUserData(customer = {}) {
  const { firstName, lastName } = splitName(customer.name);
  const ph = normalizePhoneForMeta(customer.phone);
  let country = String(customer.country || 'pk').trim().toLowerCase();
  if (country.length !== 2) country = 'pk';
  const emailRaw = String(customer.email || '').trim().toLowerCase();
  const email = isValidEmail(emailRaw) ? emailRaw : '';
  const fn = asciiName(firstName, 40).toLowerCase().replace(/[^a-z]/g, '');
  const ln = asciiName(lastName, 40).toLowerCase().replace(/[^a-z]/g, '');
  const externalId = String(customer.externalId || customer.orderId || '')
    .trim()
    .replace(/[^\w-]/g, '')
    .slice(0, 64);

  const data = { country };
  if (email) data.em = email;
  if (ph) data.ph = ph;
  if (fn) data.fn = fn;
  if (ln) data.ln = ln;
  if (externalId) data.external_id = externalId;

  const ctNorm = asciiName(customer.city, 80).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (ctNorm.length >= 2) data.ct = ctNorm;
  const zpNorm = String(customer.pincode || customer.zip || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]/g, '');
  if (zpNorm.length >= 2) data.zp = zpNorm;
  /** Pixel advanced matching: `st` must be a two-letter code (Meta rejects full province names). */
  const stNorm = asciiName(customer.state, 50).toLowerCase().replace(/[^a-z]/g, '');
  if (stNorm.length === 2) data.st = stNorm;
  // No `street` here — not in Pixel advanced matching reference; CAPI still sends address on Purchase.

  return data;
}

/** Allowed keys for `fbq('init', pixelId, { … })` advanced matching (Meta Pixel Advanced Matching reference). */
const PIXEL_ADVANCED_MATCHING_KEYS = new Set([
  'em',
  'ph',
  'fn',
  'ln',
  'external_id',
  'ge',
  'db',
  'ct',
  'st',
  'zp',
  'country',
]);

/**
 * Meta documents advanced matching on `fbq('init', pixelId, data)`, not `fbq('set','user_data', …)`.
 * Newer fbevents rejects `set`/`user_data` with "invalid value of Object". Values must be non-empty strings.
 */
function sanitizeAdvancedMatchingForPixelInit(customer = {}) {
  const raw = buildPurchaseMatchUserData(customer);
  const hasStrongId =
    raw.em ||
    raw.ph ||
    raw.fn ||
    raw.ln ||
    raw.ct ||
    raw.zp ||
    raw.st ||
    raw.external_id;
  if (!hasStrongId) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of PIXEL_ADVANCED_MATCHING_KEYS) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    if (!s) continue;
    out[key] = s;
  }
  return out;
}

/**
 * No-op: customer PII is not sent to the Pixel except immediately before Purchase
 * (see `syncMetaPixelUserDataForPurchase`).
 */
export function syncMetaPixelUserData(_customer = {}) {}

/**
 * Re-`init` with advanced matching per Meta docs, immediately before Purchase (SPA / late identity).
 */
export function syncMetaPixelUserDataForPurchase(customer = {}) {
  if (typeof window === 'undefined' || !isMetaPixelEnabledForSession() || !window.fbq) return;
  const pixelId =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_META_PIXEL_ID
      ? String(process.env.NEXT_PUBLIC_META_PIXEL_ID).trim()
      : '';
  if (!pixelId) return;
  const userData = sanitizeAdvancedMatchingForPixelInit(customer);
  if (Object.keys(userData).length === 0) return;
  window.fbq('init', pixelId, userData);
}

/** Meta / catalog content id: admin “Advertising ID” when set, else product UUID. */
export function metaContentId(product) {
  if (!product || typeof product !== 'object') return '';
  const a = product.advertisingId != null && String(product.advertisingId).trim();
  return a || String(product.id || '');
}

/**
 * Meta **standard** events (ViewContent, AddToCart, InitiateCheckout, Purchase, AddToWishlist):
 * only `content_ids` (advertising id when set — else omitted), `value`, `currency`, `num_items`,
 * `content_type: product`, plus `order_id` on Purchase. No product name, description, or `contents` array.
 */
/** Meta Pixel standard events only: content_ids = admin Advertising ID (no UUID, no name). */
export function metaPixelAdvertisingId(product) {
  if (!product || typeof product !== 'object') return '';
  const a = product.advertisingId != null && String(product.advertisingId).trim();
  return a || '';
}

/** Category ads id: explicit categoryAdvertisingId, else categoryId. */
export function metaCategoryId(product) {
  if (!product || typeof product !== 'object') return '';
  const a = product.categoryAdvertisingId != null && String(product.categoryAdvertisingId).trim();
  if (a) return a;
  const c = product.categoryId != null && String(product.categoryId).trim();
  return c || '';
}

function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp(`(?:^|; )${esc}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}

/**
 * CAPI `event_source_url` only — collapses `/shop/:slugOrId` to `/shop` so slug-based product
 * titles are not sent to Meta. Pixel still runs on the real page URL (browser).
 */
function sanitizeMetaEventSourceUrl(href) {
  if (typeof window === 'undefined') return '';
  const raw = String(href || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw, window.location.origin);
    let path = u.pathname || '';
    if (/^\/shop\/[^/]+/.test(path)) path = '/shop';
    return `${u.origin}${path}${u.search || ''}`.slice(0, 2000);
  } catch {
    return raw.slice(0, 2000);
  }
}

function metaEventSourceUrl() {
  if (typeof window === 'undefined') return '';
  return sanitizeMetaEventSourceUrl(window.location.href);
}

function compactPayload(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));
}

/** Session Meta ads ids → CAPI `custom_data` campaign / adset / ad (payload overrides if set). */
function capiAdsFieldsFromSession() {
  if (typeof window === 'undefined') return {};
  const a = getAttributionForTracking();
  const o = {};
  if (a.campaignId) o.adsCampaignId = String(a.campaignId).trim().slice(0, 128);
  if (a.adsetId) o.adsAdsetId = String(a.adsetId).trim().slice(0, 128);
  if (a.adId) o.adsAdId = String(a.adId).trim().slice(0, 128);
  return o;
}

/** Meta standard `contents`: `{ id, quantity }[]` only (catalog id + line qty). */
function metaStandardContentsLines(lines) {
  if (!Array.isArray(lines) || !lines.length) return null;
  const out = lines
    .map((line) => {
      const id = line?.id != null ? String(line.id).trim().slice(0, 128) : '';
      if (!id) return null;
      const q = Math.max(1, Math.trunc(Number(line.quantity)) || 1);
      return { id, quantity: q };
    })
    .filter(Boolean);
  return out.length ? out : null;
}

function relayMetaCapi(payload) {
  const testEventCode =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE
      ? String(process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE).trim()
      : undefined;
  return sendMetaCapi(
    compactPayload({
      ...capiAdsFieldsFromSession(),
      ...payload,
      ...(testEventCode ? { testEventCode } : {}),
    }),
  ).catch(() => {});
}

/**
 * Meta Pixel + CAPI (gate: first landing home / PDP / checkout + Meta traffic — see meta-pixel-gate.js):
 * Pixel+CAPI (deduped, shared event_id): AddToCart, InitiateCheckout, Purchase.
 * CAPI only (custom NS_*): NS_EV_LANDING_PAGE_VIEW, NS_EV_CONTENT_VIEW, NS_EV_ATC, NS_EV_INTCHECKOUT, NS_EV_PRCHS_SUCCESS.
 * Pixel only: PageView, ViewContent (standard), AddToWishlist.
 */

/** sessionStorage key so Pixel + CAPI purchase is not sent twice for the same order id. */
export function metaPurchaseFiredStorageKey(orderId) {
  return `nature_secret_meta_purchase_fired_${String(orderId)}`;
}

const LANDING_META_SESSION_KEY = 'nature_secret_meta_landing_page_view';
/** If sessionStorage is blocked, send landing Meta event at most once per full page load. */
let landingMetaSentWithoutStorage = false;

/** `/shop/:slugOrId` — product detail; generic session landing is skipped here (product client sends NS_EV_LANDING_PAGE_VIEW). */
function isStoreProductDetailPath(path) {
  return /^\/shop\/[^/]+/.test(String(path || ''));
}

/** First page view in this tab session — NS_EV_LANDING_PAGE_VIEW via CAPI only. */
function relayLandingPageViewMeta(entryPath) {
  if (typeof window === 'undefined' || !isMetaPixelEnabledForSession()) return;
  const cur = normalizeCurrencyCode('PKR');
  const path = String(entryPath || window.location?.pathname || '/').slice(0, 200);
  const safeSeg = path.replace(/[^a-zA-Z0-9/_-]/g, '_').slice(0, 48);
  const eventId = `ns_lpv_${safeSeg}_${Date.now()}`.slice(0, 128);
  const val = 0;
  const n = 0;
  relayMetaCapi({
    eventName: 'NS_EV_LANDING_PAGE_VIEW',
    eventId,
    eventSourceUrl: metaEventSourceUrl(),
    currency: cur,
    value: val,
    numItems: n,
    contentIds: path ? [path.slice(0, 128)] : [],
    categoryIds: [],
    contentType: 'home',
    fbp: getCookie('_fbp'),
    fbc: getCookie('_fbc'),
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  });
}

export function trackPageView(path = '') {
  if (typeof window !== 'undefined') {
    const p = path || window.location?.pathname || '';
    useAnalyticsStore.getState().track('pageView', { path: p });
    if (isMetaPixelEnabledForSession() && window.fbq) window.fbq('track', 'PageView');
    if (isMetaPixelEnabledForSession()) {
      try {
        if (!sessionStorage.getItem(LANDING_META_SESSION_KEY)) {
          if (!isStoreProductDetailPath(p)) {
            sessionStorage.setItem(LANDING_META_SESSION_KEY, '1');
            relayLandingPageViewMeta(p);
          }
        }
      } catch (_) {
        if (!landingMetaSentWithoutStorage && !isStoreProductDetailPath(p)) {
          landingMetaSentWithoutStorage = true;
          relayLandingPageViewMeta(p);
        }
      }
    }
  }
}

/** @param {object|string} productOrId — product object (preferred) or legacy id string */
export function trackViewContent(productOrId, value, currency = 'PKR') {
  const cur = normalizeCurrencyCode(currency);
  const contentId =
    typeof productOrId === 'object' && productOrId != null
      ? metaContentId(productOrId)
      : String(productOrId);
  const adsId =
    typeof productOrId === 'object' && productOrId != null ? metaPixelAdvertisingId(productOrId) : '';
  const catId =
    typeof productOrId === 'object' && productOrId != null ? metaCategoryId(productOrId) : '';
  const numItems = metaNumItems(1);
  const val = metaCommerceValue(value);
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('productView', { contentId: String(contentId), value });
  }
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const vc = { content_type: 'product', value: val, currency: cur, num_items: numItems };
    if (adsId) vc.content_ids = [adsId];
    window.fbq('track', 'ViewContent', vc);
  }
  const vcCapiBase = {
    eventSourceUrl: metaEventSourceUrl(),
    currency: cur,
    value: val,
    numItems,
    fbp: typeof document !== 'undefined' ? getCookie('_fbp') : undefined,
    fbc: typeof document !== 'undefined' ? getCookie('_fbc') : undefined,
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  const nsVcEventId = `ns_vc_${String(contentId)}_${Date.now()}`;
  const customContentIds = [String(contentId)];
  const categoryIds = catId ? [String(catId)] : [];
  if (typeof window !== 'undefined') {
    const vcLines = adsId ? metaStandardContentsLines([{ id: adsId, quantity: numItems }]) : null;
    relayMetaCapi({
      eventName: 'NS_EV_CONTENT_VIEW',
      eventId: nsVcEventId,
      ...vcCapiBase,
      contentIds: customContentIds,
      categoryIds,
      ...(vcLines ? { contents: vcLines } : {}),
    });
  }
}

/** Product detail pages — NS_EV_LANDING_PAGE_VIEW via CAPI only (catalog-aligned ids). */
export function trackLandingPageViewForProduct(product, value, currency = 'PKR') {
  if (typeof window === 'undefined' || !product || typeof product !== 'object' || !isMetaPixelEnabledForSession()) return;
  const cur = normalizeCurrencyCode(currency);
  const contentId = metaContentId(product);
  if (!contentId) return;
  const catId = metaCategoryId(product);
  const val = metaCommerceValue(value);
  const numItems = metaNumItems(1);
  const customContentIds = [String(contentId)];
  const categoryIds = catId ? [String(catId)] : [];
  const eventId = `ns_lpv_p_${String(contentId)}_${Date.now()}`.slice(0, 128);
  const capiBase = {
    eventSourceUrl: metaEventSourceUrl(),
    currency: cur,
    value: val,
    numItems,
    fbp: getCookie('_fbp'),
    fbc: getCookie('_fbc'),
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  relayMetaCapi({
    eventName: 'NS_EV_LANDING_PAGE_VIEW',
    eventId,
    ...capiBase,
    contentIds: customContentIds,
    categoryIds,
    contentType: 'product',
  });
}

/** @param {object} product */
export function trackOutOfStockView(product) {
  const metaId = metaContentId(product);
  if (typeof window !== 'undefined' && metaId) {
    useAnalyticsStore.getState().track('outOfStockClick', { contentId: String(metaId) });
  }
}

/** @param {object} product — full product (uses advertisingId when set) */
export function trackAddToCart(product, value, quantity = 1, currency = 'PKR') {
  const cur = normalizeCurrencyCode(currency);
  const metaId = metaContentId(product);
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('addToCart', { contentId: String(metaId), quantity });
  }
  const catId = metaCategoryId(product);
  const adsId = metaPixelAdvertisingId(product);
  const qty = Math.max(1, metaNumItems(quantity));
  const lineValue = metaMonetaryFloat(metaCommerceValue(value) * qty);
  const eventId = `ns_atc_${metaId}_${Date.now()}`;
  const stdAtcEventId = `std_atc_${adsId || metaId}_${Date.now()}`;
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const stdPayload = {
      content_type: 'product',
      value: lineValue,
      currency: cur,
      num_items: qty,
    };
    if (adsId) stdPayload.content_ids = [adsId];
    window.fbq('track', 'AddToCart', stdPayload, { eventID: stdAtcEventId });
  }
  const atcContents = adsId ? metaStandardContentsLines([{ id: adsId, quantity: qty }]) : null;
  const capiBase = {
    eventSourceUrl: metaEventSourceUrl(),
    currency: cur,
    value: lineValue,
    numItems: qty,
    fbp: getCookie('_fbp'),
    fbc: getCookie('_fbc'),
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  if (typeof window !== 'undefined') {
    relayMetaCapi({
      eventName: 'AddToCart',
      eventId: stdAtcEventId,
      ...capiBase,
      contentIds: adsId ? [adsId] : [],
      ...(atcContents ? { contents: atcContents } : {}),
    });
    relayMetaCapi({
      eventName: 'NS_EV_ATC',
      eventId,
      ...capiBase,
      contentIds: [String(metaId)],
      categoryIds: catId ? [String(catId)] : [],
    });
  }
}

/** @param {object} product */
export function trackAddToWishlist(product, value, currency = 'PKR') {
  const cur = normalizeCurrencyCode(currency);
  const metaId = metaContentId(product);
  const adsId = metaPixelAdvertisingId(product);
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('addToWishlist', { contentId: String(metaId), value });
  }
  const wishVal = metaCommerceValue(value);
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const wl = { content_type: 'product', value: wishVal, currency: cur, num_items: 1 };
    if (adsId) wl.content_ids = [adsId];
    window.fbq('track', 'AddToWishlist', wl);
  }
}

/**
 * @param {string[]} contentIds — standard Pixel/CAPI InitiateCheckout: advertising ids only
 * @param {number|null} numItems
 * @param {string[]|null} customContentIds — same as Purchase custom: metaContentId per line (ads id or UUID); defaults to contentIds if omitted
 * @param {string[]|null} categoryIds — category advertising / id per Purchase custom
 * @param {{ id: string, quantity: number }[]|null} standardContents — catalog lines for Pixel/CAPI `contents` (ads id + qty)
 */
export function trackInitiateCheckout(
  value,
  currency = 'PKR',
  contentIds = [],
  numItems = null,
  customContentIds = null,
  categoryIds = null,
  standardContents = null,
) {
  const cur = normalizeCurrencyCode(currency);
  const n = numItems != null ? metaNumItems(numItems) : metaNumItems(contentIds.length);
  const stdIds = contentIds.map((id) => String(id).trim()).filter(Boolean);
  const customIds = (customContentIds != null ? customContentIds : stdIds).map((id) => String(id).trim()).filter(Boolean);
  const cats = (categoryIds != null ? categoryIds : []).map((id) => String(id).trim()).filter(Boolean);
  const val = metaCommerceValue(value);
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('initiateCheckout', { value: val, currency, contentIds: stdIds });
  }
  const icCapiBase = {
    eventSourceUrl: metaEventSourceUrl(),
    currency: cur,
    value: val,
    numItems: n,
    fbp: typeof document !== 'undefined' ? getCookie('_fbp') : undefined,
    fbc: typeof document !== 'undefined' ? getCookie('_fbc') : undefined,
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  const stdIcEventId = `ic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const nsIcEventId = `ns_ic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const icContentsLines = metaStandardContentsLines(standardContents);
  const nIc = Math.max(0, Math.trunc(Number(n)) || 0);
  const icQtySum = icContentsLines ? icContentsLines.reduce((s, l) => s + l.quantity, 0) : 0;
  const pixelIcContents = icContentsLines && icQtySum === nIc ? icContentsLines : null;
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const ic = { value: val, currency: cur, content_type: 'product', num_items: nIc };
    if (pixelIcContents) ic.contents = pixelIcContents;
    else if (stdIds.length) ic.content_ids = stdIds;
    window.fbq('track', 'InitiateCheckout', ic, { eventID: stdIcEventId });
  }
  if (typeof window !== 'undefined') {
    relayMetaCapi({
      eventName: 'InitiateCheckout',
      eventId: stdIcEventId,
      ...icCapiBase,
      contentIds: stdIds,
      ...(icContentsLines ? { contents: icContentsLines } : {}),
    });
    relayMetaCapi({
      eventName: 'NS_EV_INTCHECKOUT',
      eventId: nsIcEventId,
      ...icCapiBase,
      contentIds: customIds,
      categoryIds: cats,
    });
  }
}

/**
 * @param {string} orderId
 * @param {number} value
 * @param {string} currency
 * @param {string[]} contentIds — CAPI NS_EV_PRCHS_SUCCESS: metaContentId per line (ads id or uuid); Pixel uses standard Purchase only
 * @param {string[]} categoryIds — category advertising ids (or category ids fallback)
 * @param {number|null} numItems
 * @param {{
 *   email?: string,
 *   phone?: string,
 *   name?: string,
 *   address?: string,
 *   city?: string,
 *   state?: string,
 *   pincode?: string,
 *   country?: string,
 *   externalId?: string,
 *   orderId?: string,
 * }} customer — PII only on Purchase / NS CAPI (hashed server-side); Pixel user_data set only via `syncMetaPixelUserDataForPurchase` before this call
 * @param {string[]} [pixelStandardContentIds] — optional; Meta standard Purchase content_ids only (advertising ids)
 * @param {{ id: string, quantity: number }[]|null} [pixelStandardContents] — optional; `contents` lines (ads id + qty per line)
 * @param {'product'|'product_group'} [contentType] — Meta `custom_data.content_type` + Pixel Purchase (default `product`)
 */
export async function trackPurchase(
  orderId,
  value,
  currency = 'PKR',
  contentIds = [],
  categoryIds = [],
  numItems = null,
  customer = {},
  pixelStandardContentIds = null,
  pixelStandardContents = null,
  contentType = 'product',
) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('purchase', { orderId, value });
  }
  /** One canonical id for Pixel + CAPI standard Purchase (dedupe + `order_id` / Graph `custom_data.order_id`). */
  const orderKey = String(orderId ?? '')
    .trim()
    .slice(0, 64);
  const cur = normalizeCurrencyCode(currency);
  const metaContentType = normalizeMetaPurchaseContentType(contentType);
  const n = numItems != null ? metaNumItems(numItems) : metaNumItems(contentIds.length);
  const eventId = `ns_prch_${orderKey}`;
  const stdPurchaseEventId = `std_purchase_${orderKey}`;
  const stdPurchaseIds =
    pixelStandardContentIds != null
      ? pixelStandardContentIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
  const purchaseContentsLines = metaStandardContentsLines(pixelStandardContents);
  const purchaseVal = metaCommerceValue(value);
  const purchaseValueNum = Number.isFinite(purchaseVal) ? purchaseVal : 0;
  const nPurchase = Math.max(0, Math.trunc(Number(n)) || 0);
  const purchaseQtySum = purchaseContentsLines
    ? purchaseContentsLines.reduce((s, l) => s + l.quantity, 0)
    : 0;
  /** Pixel: partial `contents` + full-cart `num_items` makes fbevents mis-validate (often bogus "currency" error). */
  const pixelPurchaseContents =
    purchaseContentsLines && purchaseQtySum === nPurchase ? purchaseContentsLines : null;
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    syncMetaPixelUserDataForPurchase(customer);
    const pr = {
      value: Number(purchaseValueNum.toFixed(2)),
      currency: cur,
      content_type: metaContentType,
      num_items: nPurchase,
      order_id: orderKey,
    };
    if (pixelPurchaseContents) pr.contents = pixelPurchaseContents;
    else if (stdPurchaseIds.length) pr.content_ids = stdPurchaseIds;
    window.fbq('track', 'Purchase', pr, { eventID: stdPurchaseEventId });
  }
  const purchaseCapiBase = {
    eventSourceUrl: metaEventSourceUrl(),
    currency: cur,
    value: purchaseVal,
    numItems: n,
    orderId: orderKey,
    contentType: metaContentType,
    email: customer.email,
    phone: customer.phone,
    customerName: customer.name,
    street: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.pincode != null ? String(customer.pincode) : customer.zip,
    country: customer.country || 'pk',
    fbp: typeof document !== 'undefined' ? getCookie('_fbp') : undefined,
    fbc: typeof document !== 'undefined' ? getCookie('_fbc') : undefined,
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  if (typeof window !== 'undefined') {
    await Promise.all([
      relayMetaCapi({
        eventName: 'Purchase',
        eventId: stdPurchaseEventId,
        ...purchaseCapiBase,
        contentIds: stdPurchaseIds,
        ...(purchaseContentsLines ? { contents: purchaseContentsLines } : {}),
      }),
      relayMetaCapi({
        eventName: 'NS_EV_PRCHS_SUCCESS',
        eventId,
        ...purchaseCapiBase,
        contentIds: contentIds.map((id) => String(id)),
        categoryIds: categoryIds.map((id) => String(id)),
      }),
    ]);
  }
}

export function trackCheckoutPageView(value, currency = 'PKR', contentIds = []) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('checkoutPageView', { value, currency, contentIds });
  }
}

export function trackOrderConfirmationView(orderId) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('orderConfirmationView', { orderId });
  }
}

export function trackPlaceOrderClick(value, currency = 'PKR', contentIds = []) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('placeOrderClick', { value, currency, contentIds });
  }
}

/** @param {string} source e.g. floating | footer | contact */
export function trackWhatsAppOpen(source = 'unknown') {
  if (typeof window === 'undefined') return;
  const s = String(source || 'unknown').slice(0, 50);
  useAnalyticsStore.getState().track('whatsappOpen', { source: s });
}
