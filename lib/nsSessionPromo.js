/**
 * First-customer NS150 promo: Rs 150 off within countdown (per browser session — new visit after closing the tab gets a fresh window).
 * Prices in the app are in paisa (÷100 for display).
 */

export const NS_PROMO_CODE = 'NS150';
/** 150 PKR in paisa */
export const NS_PROMO_OFF_PAISE = 150 * 100;
/** Window length in minutes (banner copy + deadline stay in sync) */
export const NS_PROMO_DURATION_MINUTES = 10;
/** Countdown length (ms) — time to claim / use the code */
export const NS_PROMO_COUNTDOWN_MS = NS_PROMO_DURATION_MINUTES * 60 * 1000;

/** Bump when duration/rules change so old sessionStorage deadlines are not reused */
const KEY_DEADLINE = 'nature_secret_ns_promo_deadline_v2_10m';

export function normalizePromoCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function isNsPromoCode(code) {
  return normalizePromoCode(code) === NS_PROMO_CODE;
}

/** Call once per session when the promo UI mounts; starts the countdown if not started. */
export function initNsPromoDeadline() {
  if (typeof window === 'undefined') return;
  try {
    if (!sessionStorage.getItem(KEY_DEADLINE)) {
      sessionStorage.setItem(KEY_DEADLINE, String(Date.now() + NS_PROMO_COUNTDOWN_MS));
    }
  } catch (_) {}
}

export function getNsPromoDeadlineMs() {
  if (typeof window === 'undefined') return null;
  try {
    const s = sessionStorage.getItem(KEY_DEADLINE);
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
