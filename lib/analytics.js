'use client';

import { useAnalyticsStore } from '@/lib/store';

/**
 * Meta Pixel / Conversion API — placeholder implementation.
 * Replace with your Pixel ID and CAPI token when ready.
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
