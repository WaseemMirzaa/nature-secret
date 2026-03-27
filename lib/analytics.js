'use client';

import { useAnalyticsStore } from '@/lib/store';

function splitName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

/** Fields for fbq('init', id, userData) only — do not merge into fbq('track') (breaks capig / 422). */
function buildAdvancedMatchUserData(customer = {}) {
  const { firstName, lastName } = splitName(customer.name);
  const phoneDigits = String(customer.phone || '').replace(/\D/g, '');
  let country = String(customer.country || 'pk').trim().toLowerCase();
  if (country.length !== 2) country = 'pk';
  const city = String(customer.city || '').trim();
  const state = String(customer.state || '').trim();
  const zip = String(customer.zip || customer.pincode || '').trim();
  const email = String(customer.email || '').trim().toLowerCase();
  const gender = String(customer.gender || '').trim().toLowerCase();
  const dob = String(customer.dob || '').trim();
  const externalId = String(customer.externalId || customer.orderId || '').trim();

  const data = {};
  if (city) data.ct = city;
  if (state) data.st = state;
  if (zip) data.zp = zip;
  if (country) data.country = country;
  if (dob) data.db = dob;
  if (email) data.em = email;
  if (externalId) data.external_id = externalId;
  if (gender && (gender === 'f' || gender === 'm')) data.ge = gender;
  if (firstName) data.fn = firstName;
  if (lastName) data.ln = lastName;
  if (phoneDigits) data.ph = phoneDigits;
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
  if (Object.keys(userData).length === 0) return;
  window.fbq('init', pixelId, userData);
}

/**
 * Meta Pixel / internal analytics.
 */

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
      content_ids: [productId],
      content_name: productName,
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
      content_ids: [productId],
      content_name: productName,
      value,
      currency,
      num_items: quantity,
    });
  }
}

export function trackInitiateCheckout(value, currency = 'PKR', contentIds = []) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('initiateCheckout', { value, currency, contentIds });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      value,
      currency,
      content_ids: contentIds,
    });
  }
}

export function trackPurchase(orderId, value, currency = 'PKR', contentIds = []) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('purchase', { orderId, value });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', {
      order_id: orderId,
      value,
      currency,
      content_ids: contentIds,
    });
  }
}

export function trackCheckoutPageView(value, currency = 'PKR', contentIds = []) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('checkoutPageView', { value, currency, contentIds });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'CheckoutPageView', {
      value,
      currency,
      content_ids: contentIds,
    });
  }
}

export function trackOrderConfirmationView(orderId) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('orderConfirmationView', { orderId });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'OrderConfirmationView', { order_id: orderId });
  }
}

export function trackPlaceOrderClick(value, currency = 'PKR', contentIds = []) {
  if (typeof window !== 'undefined') {
    useAnalyticsStore.getState().track('placeOrderClick', { value, currency, contentIds });
  }
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'PlaceOrderClick', {
      value,
      currency,
      content_ids: contentIds,
    });
  }
}
