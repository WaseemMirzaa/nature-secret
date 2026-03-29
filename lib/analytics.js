'use client';

import { useAnalyticsStore } from '@/lib/store';

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
  if (typeof window === 'undefined' || !window.fbq) return;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return;
  const userData = buildAdvancedMatchUserData(customer);
  if (!userData.em && !userData.ph && !userData.external_id) return;
  window.fbq('init', pixelId, userData);
}

/**
 * Meta Pixel / internal analytics.
 * Standard events: PageView (layout), ViewContent, AddToCart, AddToWishlist, InitiateCheckout, Purchase.
 */

/** sessionStorage key so Purchase (fbq) is not sent twice for the same order id. */
export function metaPurchaseFiredStorageKey(orderId) {
  return `nature_secret_meta_purchase_fired_${String(orderId)}`;
}

export function trackPageView(path = '') {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('pageView', { path: path || window.location?.pathname });
    if (window.fbq) window.fbq('track', 'PageView');
  }
}

export function trackViewContent(productId, productName, value, currency = 'PKR') {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('productView', { productId, productName, value });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: [String(productId)],
      content_name: productName,
      content_type: 'product',
      value,
      currency,
    });
  }
}

export function trackOutOfStockView(productId) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('outOfStockClick', { productId });
  }
}

export function trackAddToCart(productId, productName, value, quantity = 1, currency = 'PKR') {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('addToCart', { productId, productName, quantity });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [String(productId)],
      content_name: productName,
      content_type: 'product',
      value,
      currency,
      num_items: quantity,
    });
  }
}

export function trackAddToWishlist(productId, productName, value, currency = 'PKR') {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('addToWishlist', { productId, productName, value });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'AddToWishlist', {
      content_ids: [String(productId)],
      content_name: productName,
      content_type: 'product',
      value,
      currency,
    });
  }
}

export function trackInitiateCheckout(value, currency = 'PKR', contentIds = [], numItems = null) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('initiateCheckout', { value, currency, contentIds });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    const n = numItems != null ? numItems : contentIds.length;
    window.fbq('track', 'InitiateCheckout', {
      value,
      currency,
      content_ids: contentIds.map((id) => String(id)),
      content_type: 'product',
      num_items: n,
    });
  }
}

export function trackPurchase(orderId, value, currency = 'PKR', contentIds = [], numItems = null) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('purchase', { orderId, value });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    const n = numItems != null ? numItems : contentIds.length;
    window.fbq('track', 'Purchase', {
      order_id: String(orderId),
      value,
      currency,
      content_ids: contentIds.map((id) => String(id)),
      content_type: 'product',
      num_items: n,
    });
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
