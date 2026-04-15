/**
 * First-customer NS150 promo: Rs 150 off within a fixed window from first exposure on this device.
 * Deadline is stored in localStorage so returning days later shows real time left (or expired), not a reset timer.
 * Prices in the app are in paisa (÷100 for display).
 */

export const NS_PROMO_CODE = 'NS150';
/** 150 PKR in paisa */
export const NS_PROMO_OFF_PAISE = 150 * 100;
/** Window length in hours (banner copy + deadline stay in sync) */
export const NS_PROMO_DURATION_HOURS = 12;
/** Countdown length (ms) — time to claim / use the code */
export const NS_PROMO_COUNTDOWN_MS = NS_PROMO_DURATION_HOURS * 60 * 60 * 1000;

/** Bump when duration/rules change. v4: localStorage (was sessionStorage v3 — reset every session hurt trust). */
const KEY_DEADLINE = 'nature_secret_ns_promo_deadline_v4_local_12h';
const KEY_DEADLINE_SESSION_LEGACY = 'nature_secret_ns_promo_deadline_v3_12h';

export function normalizePromoCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function isNsPromoCode(code) {
  return normalizePromoCode(code) === NS_PROMO_CODE;
}

/** Call when promo UI mounts; starts countdown from first visit on this device if none stored. */
export function initNsPromoDeadline() {
  if (typeof window === 'undefined') return;
  try {
    if (!localStorage.getItem(KEY_DEADLINE)) {
      const legacy = sessionStorage.getItem(KEY_DEADLINE_SESSION_LEGACY);
      if (legacy) {
        const n = parseInt(legacy, 10);
        if (Number.isFinite(n) && Date.now() < n) {
          localStorage.setItem(KEY_DEADLINE, legacy);
        }
        sessionStorage.removeItem(KEY_DEADLINE_SESSION_LEGACY);
      }
    }
    if (!localStorage.getItem(KEY_DEADLINE)) {
      localStorage.setItem(KEY_DEADLINE, String(Date.now() + NS_PROMO_COUNTDOWN_MS));
    }
  } catch (_) {}
}

export function getNsPromoDeadlineMs() {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(KEY_DEADLINE);
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function isNsPromoWindowActive() {
  const d = getNsPromoDeadlineMs();
  if (!d) return false;
  return Date.now() < d;
}

/** Whole seconds left (0 when expired). */
export function getNsPromoSecondsRemaining() {
  const d = getNsPromoDeadlineMs();
  if (!d) return 0;
  return Math.max(0, Math.ceil((d - Date.now()) / 1000));
}

const KEY_APPLIED = 'nature_secret_discount_code';

export function setSessionDiscountCode(code) {
  if (typeof window === 'undefined') return;
  try {
    const c = normalizePromoCode(code);
    if (c) sessionStorage.setItem(KEY_APPLIED, c);
    else sessionStorage.removeItem(KEY_APPLIED);
  } catch (_) {}
}

export function getSessionDiscountCode() {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(KEY_APPLIED) || '';
  } catch {
    return '';
  }
}

/**
 * @param {number} subtotalPaise
 * @param {string} appliedCode normalized or raw
 * @param {Record<string, number>} percentCodes from getDiscountCodes() — values are percent 0–100
 * @returns {number} discount in paisa
 */
export function getDiscountAmountForCode(subtotalPaise, appliedCode, percentCodes) {
  const code = normalizePromoCode(appliedCode);
  if (!code || subtotalPaise <= 0) return 0;
  if (isNsPromoCode(code)) {
    if (!isNsPromoWindowActive()) return 0;
    return Math.min(NS_PROMO_OFF_PAISE, subtotalPaise);
  }
  const pct = percentCodes[code];
  if (pct != null) return Math.round((subtotalPaise * pct) / 100);
  return 0;
}
