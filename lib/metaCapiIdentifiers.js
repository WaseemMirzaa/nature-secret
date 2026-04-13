'use client';

import { useCustomerStore } from '@/lib/store';

const FBCLID_SESSION_KEY = 'nature_secret_fbclid';
const EXTERNAL_ID_STORAGE_KEY = 'nature_secret_capi_external_id';

function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp(`(?:^|; )${esc}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}

/** Persist latest fbclid from URL for synthetic _fbc when Meta cookie is missing. */
export function captureFbclidFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const u = new URL(window.location.href);
    const fb = u.searchParams.get('fbclid');
    if (fb && String(fb).trim()) {
      sessionStorage.setItem(FBCLID_SESSION_KEY, String(fb).trim().slice(0, 512));
    }
  } catch (_) {}
}

export function getStoredFbclid() {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(FBCLID_SESSION_KEY) || '';
  } catch {
    return '';
  }
}

/** Meta _fbc-style value when cookie absent but fbclid is known (CAPI). */
export function synthesizeFbcFromFbclid(fbclid) {
  const id = String(fbclid || '').trim();
  if (!id) return '';
  const ts = Date.now();
  return `fb.1.${ts}.${id}`.slice(0, 512);
}

export function getFbcForCapi() {
  const fromCookie = getCookie('_fbc');
  if (fromCookie) return fromCookie;
  const fbclid = getStoredFbclid();
  if (!fbclid) return '';
  try {
    const k = `nature_secret_fbc_synth_${fbclid.slice(0, 200)}`;
    let s = sessionStorage.getItem(k);
    if (!s) {
      s = `fb.1.${Date.now()}.${fbclid}`.slice(0, 512);
      sessionStorage.setItem(k, s);
    }
    return s;
  } catch {
    return synthesizeFbcFromFbclid(fbclid);
  }
}

/** When Meta never set `_fbc` but we have `fbclid`, mirror stable synthetic value into `_fbc` so Pixel (not just CAPI) sends Click ID. */
export function ensureFbcCookieFromStoredFbclid() {
  if (typeof document === 'undefined') return;
  if (getCookie('_fbc')) return;
  const fbc = getFbcForCapi();
  if (!fbc) return;
  try {
    const secure =
      typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `_fbc=${encodeURIComponent(fbc)}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax${secure}`;
  } catch (_) {}
}

/**
 * Poll for Meta browser ID cookie (set async by fbevents.js).
 * @returns {Promise<string>}
 */
export function waitForFbp(maxMs = 450, intervalMs = 45) {
  return new Promise((resolve) => {
    const start = Date.now();
    function tick() {
      const fbp = getCookie('_fbp');
      if (fbp) {
        resolve(fbp);
        return;
      }
      if (Date.now() - start >= maxMs) {
        resolve('');
        return;
      }
      setTimeout(tick, intervalMs);
    }
    tick();
  });
}

export function getOrCreateAnonymousExternalId() {
  if (typeof window === 'undefined') return '';
  try {
    let x = localStorage.getItem(EXTERNAL_ID_STORAGE_KEY);
    if (x && String(x).trim()) return String(x).trim().slice(0, 64);
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ns_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    const clipped = id.slice(0, 64);
    localStorage.setItem(EXTERNAL_ID_STORAGE_KEY, clipped);
    return clipped;
  } catch {
    return `ns_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`.slice(0, 64);
  }
}

/** Logged-in customer id, else stable anonymous id (CAPI `externalId` plain — server hashes). */
export function getExternalIdPlainForCapi() {
  if (typeof window === 'undefined') return '';
  try {
    const c = useCustomerStore.getState().customer;
    if (c?.id) return String(c.id).trim().slice(0, 64);
  } catch (_) {}
  return getOrCreateAnonymousExternalId();
}

export async function getMetaCapiUserDataAsync() {
  ensureFbcCookieFromStoredFbclid();
  let fbp = getCookie('_fbp');
  const fbc = getFbcForCapi();
  if (!fbp) {
    fbp = await waitForFbp(450, 45);
  }
  const externalId = getExternalIdPlainForCapi();
  return {
    fbp: fbp || undefined,
    fbc: fbc || undefined,
    externalId: externalId || undefined,
    clientUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
}

/** Purchase events use order-based external_id on server; omit client relay externalId. */
export function shouldIncludeExternalIdInRelay(eventName) {
  if (!eventName) return true;
  const e = String(eventName);
  if (e === 'Purchase') return false;
  return true;
}
