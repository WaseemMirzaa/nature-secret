'use client';

import { sendMetaCapi } from '@/lib/api';
import { useAnalyticsStore } from '@/lib/store';
import { isMetaPixelEnabledForSession } from '@/lib/meta-pixel-gate';

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
  const c = String(currency || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : 'PKR';
}

/** ASCII-only trim for city/state (avoids capig validation issues). */
function asciiName(s, max = 50) {
  const t = String(s || '')
    .trim()
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, max);
  return t || '';
}

/** Minimal safe set for fbq('init', id, userData) — capig rejects bad/odd fields. */
function buildAdvancedMatchUserData(customer = {}) {
  const { firstName, lastName } = splitName(customer.name);
  const ph = normalizePhoneForMeta(customer.phone);
  let country = String(customer.country || 'pk').trim().toLowerCase();
  if (country.length !== 2) country = 'pk';
  const emailRaw = String(customer.email || '').trim().toLowerCase();
  const email = isValidEmail(emailRaw) ? emailRaw : '';
  const fn = asciiName(firstName, 40);
  const ln = asciiName(lastName, 40);
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
  return data;
}

/**
 * Updates Meta advanced matching via fbq init (merge). Call when checkout fields change — not inside track().
 */
export function syncMetaPixelUserData(customer = {}) {
  if (typeof window === 'undefined' || !isMetaPixelEnabledForSession() || !window.fbq) return;
  const userData = buildAdvancedMatchUserData(customer);
  if (!userData.em && !userData.ph && !userData.external_id) return;
  if (typeof window.fbq === 'function') {
    window.fbq('set', 'user_data', userData);
  }
}

/** Meta / catalog content id: admin “Advertising ID” when set, else product UUID. */
export function metaContentId(product) {
  if (!product || typeof product !== 'object') return '';
  const a = product.advertisingId != null && String(product.advertisingId).trim();
  return a || String(product.id || '');
}

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

function compactPayload(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));
}

function relayMetaCapi(payload) {
  sendMetaCapi(compactPayload(payload)).catch(() => {});
}

/**
 * Meta Pixel + CAPI (only if first landing was `/` + Meta traffic — see meta-pixel-gate.js):
 * browser `fbq` events are mirrored server-side with matching event_id when Pixel fires.
 */

/** sessionStorage key so Pixel + CAPI purchase is not sent twice for the same order id. */
export function metaPurchaseFiredStorageKey(orderId) {
  return `nature_secret_meta_purchase_fired_${String(orderId)}`;
}

export function trackPageView(path = '') {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('pageView', { path: path || window.location?.pathname });
    if (isMetaPixelEnabledForSession() && window.fbq) window.fbq('track', 'PageView');
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
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('productView', { contentId: String(contentId), value });
  }
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const vc = { content_type: 'product', value, currency: cur };
    if (adsId) vc.content_ids = [adsId];
    window.fbq('track', 'ViewContent', vc);
  }
  if (typeof window !== 'undefined') {
    relayMetaCapi({
      eventName: 'ViewContent',
      eventId: `vc_${adsId || contentId}_${Date.now()}`,
      eventSourceUrl: window.location.href,
      currency: cur,
      value,
      contentIds: adsId ? [adsId] : [],
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc'),
      clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  }
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
  const lineValue = (Number(value) || 0) * (Number(quantity) || 1);
  const eventId = `ns_atc_${metaId}_${Date.now()}`;
  const stdAtcEventId = `std_atc_${adsId || metaId}_${Date.now()}`;
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const stdPayload = {
      content_type: 'product',
      value: lineValue,
      currency: cur,
      num_items: quantity,
    };
    if (adsId) stdPayload.content_ids = [adsId];
    window.fbq('track', 'AddToCart', stdPayload, { eventID: stdAtcEventId });
    window.fbq(
      'trackCustom',
      'NS_EV_ATC',
      {
        content_ids: [String(metaId)],
        content_type: 'product',
        content_category_ids: catId ? [String(catId)] : [],
        value: lineValue,
        currency: cur,
        num_items: quantity,
      },
      { eventID: eventId },
    );
  }
  const capiBase = {
    eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
    currency: cur,
    value: lineValue,
    numItems: quantity,
    fbp: getCookie('_fbp'),
    fbc: getCookie('_fbc'),
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  relayMetaCapi({
    eventName: 'AddToCart',
    eventId: stdAtcEventId,
    ...capiBase,
    contentIds: adsId ? [adsId] : [],
  });
  relayMetaCapi({
    eventName: 'NS_EV_ATC',
    eventId,
    ...capiBase,
    contentIds: [String(metaId)],
    categoryIds: catId ? [String(catId)] : [],
  });
}

/** @param {object} product */
export function trackAddToWishlist(product, value, currency = 'PKR') {
  const cur = normalizeCurrencyCode(currency);
  const metaId = metaContentId(product);
  const adsId = metaPixelAdvertisingId(product);
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('addToWishlist', { contentId: String(metaId), value });
  }
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const wl = { content_type: 'product', value, currency: cur };
    if (adsId) wl.content_ids = [adsId];
    window.fbq('track', 'AddToWishlist', wl);
  }
  if (typeof window !== 'undefined') {
    relayMetaCapi({
      eventName: 'AddToWishlist',
      eventId: `wl_${metaId}_${Date.now()}`,
      eventSourceUrl: window.location.href,
      currency: cur,
      value,
      contentIds: adsId ? [adsId] : [],
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc'),
      clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  }
}

export function trackInitiateCheckout(value, currency = 'PKR', contentIds = [], numItems = null) {
  const cur = normalizeCurrencyCode(currency);
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('initiateCheckout', { value, currency, contentIds });
  }
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const n = numItems != null ? numItems : contentIds.length;
    const stdIds = contentIds.map((id) => String(id).trim()).filter(Boolean);
    const ic = { value, currency: cur, content_type: 'product', num_items: n };
    if (stdIds.length) ic.content_ids = stdIds;
    window.fbq('track', 'InitiateCheckout', ic);
  }
  if (typeof window !== 'undefined') {
    const n = numItems != null ? numItems : contentIds.length;
    const stdIds = contentIds.map((id) => String(id).trim()).filter(Boolean);
    relayMetaCapi({
      eventName: 'InitiateCheckout',
      eventId: `ic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      eventSourceUrl: window.location.href,
      currency: cur,
      value,
      contentIds: stdIds,
      numItems: n,
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc'),
      clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  }
}

/**
 * @param {string} orderId
 * @param {number} value
 * @param {string} currency
 * @param {string[]} contentIds — CAPI + custom Pixel: metaContentId per line (ads id or uuid)
 * @param {string[]} categoryIds — category advertising ids (or category ids fallback)
 * @param {number|null} numItems
 * @param {{ email?: string, phone?: string, name?: string }} customer — for CAPI hashing
 * @param {string[]} [pixelStandardContentIds] — optional; Meta standard Purchase content_ids only (advertising ids)
 */
export function trackPurchase(
  orderId,
  value,
  currency = 'PKR',
  contentIds = [],
  categoryIds = [],
  numItems = null,
  customer = {},
  pixelStandardContentIds = null,
) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('purchase', { orderId, value });
  }
  const cur = normalizeCurrencyCode(currency);
  const n = numItems != null ? numItems : contentIds.length;
  const eventId = `ns_prch_${String(orderId)}`;
  const stdPurchaseEventId = `std_purchase_${String(orderId)}`;
  const stdPurchaseIds =
    pixelStandardContentIds != null
      ? pixelStandardContentIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
  if (typeof window !== 'undefined' && isMetaPixelEnabledForSession() && window.fbq) {
    const pr = {
      order_id: String(orderId),
      value: Number(value) || 0,
      currency: cur,
      content_type: 'product',
      num_items: n,
    };
    if (stdPurchaseIds.length) pr.content_ids = stdPurchaseIds;
    window.fbq('track', 'Purchase', pr, { eventID: stdPurchaseEventId });
    window.fbq(
      'trackCustom',
      'NS_EV_PRCHS_SUCCESS',
      {
        order_id: String(orderId),
        value: Number(value) || 0,
        currency: cur,
        content_ids: contentIds.map((id) => String(id)),
        content_category_ids: categoryIds.map((id) => String(id)),
        content_type: 'product',
        num_items: n,
      },
      { eventID: eventId },
    );
  }
  const purchaseCapiBase = {
    eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
    currency: cur,
    value: Number(value) || 0,
    numItems: n,
    orderId: String(orderId),
    email: customer.email,
    phone: customer.phone,
    fbp: typeof document !== 'undefined' ? getCookie('_fbp') : undefined,
    fbc: typeof document !== 'undefined' ? getCookie('_fbc') : undefined,
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  relayMetaCapi({
    eventName: 'Purchase',
    eventId: stdPurchaseEventId,
    ...purchaseCapiBase,
    contentIds: stdPurchaseIds,
  });
  relayMetaCapi({
    eventName: 'NS_EV_PRCHS_SUCCESS',
    eventId,
    ...purchaseCapiBase,
    contentIds: contentIds.map((id) => String(id)),
    categoryIds: categoryIds.map((id) => String(id)),
  });
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
