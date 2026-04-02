'use client';

/**
 * Mobile: https/wa.me in a new tab often hits in-app browsers → wrong store (e.g. Business).
 * Use whatsapp:// to open the installed app; keep https href as fallback / desktop.
 */

import { trackWhatsAppOpen } from '@/lib/analytics';

export function normalizeWhatsAppDigits(phoneDigits) {
  const n = String(phoneDigits || '').replace(/\D/g, '');
  return n || null;
}

/** Public https link (desktop, fallback, copy-paste). */
export function getWhatsAppHref(phoneDigits) {
  const n = normalizeWhatsAppDigits(phoneDigits);
  if (!n) return '#';
  return `https://api.whatsapp.com/send?phone=${n}`;
}

export function isMobileForWhatsApp() {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Call from <a onClick>; opens native WhatsApp on mobile instead of browser redirect.
 * @param {string} [source] analytics: floating | footer | contact
 */
export function handleWhatsAppClick(e, phoneDigits, source = 'link') {
  const n = normalizeWhatsAppDigits(phoneDigits);
  if (!n) return;
  trackWhatsAppOpen(source);
  if (!isMobileForWhatsApp()) return;
  e.preventDefault();
  window.location.href = `whatsapp://send?phone=${n}`;
}
