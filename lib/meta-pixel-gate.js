/**
 * Meta Pixel / CAPI only when the tab's first full page load was "/" and traffic looks Meta (fbclid, utm, referrer).
 */

const SNAPSHOT_KEY = 'nature_secret_landing_snapshot';
const GATE_KEY = 'nature_secret_meta_pixel_gate';

/** Inline in layout — must run before React so SPA navigations don't overwrite path. */
export const META_LANDING_SNAPSHOT_SCRIPT = `(function(){
  try{
    if(sessionStorage.getItem('nature_secret_landing_snapshot')) return;
    sessionStorage.setItem('nature_secret_landing_snapshot', JSON.stringify({
      path: location.pathname,
      href: location.href,
      ref: document.referrer || ''
    }));
  }catch(e){}
})();`;

function parseSnapshot() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {string} path */
export function isHomePath(path) {
  const p = String(path || '').replace(/\/+$/, '') || '/';
  return p === '' || p === '/';
}

/**
 * @param {URL} url
 * @param {string} referrer
 */
export function isMetaTraffic(url, referrer) {
  try {
    const fbclid = url.searchParams.get('fbclid');
    if (fbclid && String(fbclid).trim()) return true;
    const src = (url.searchParams.get('utm_source') || '').toLowerCase().trim();
    if (['facebook', 'fb', 'instagram', 'ig', 'meta', 'fbpaid'].includes(src)) return true;
    const med = (url.searchParams.get('utm_medium') || '').toLowerCase().trim();
    if (med === 'facebook' || med === 'instagram' || med === 'paid_social') return true;
    const ref = String(referrer || '').toLowerCase();
    if (!ref) return false;
    const hosts = [
      'facebook.com',
      'fb.com',
      'instagram.com',
      'messenger.com',
      'meta.com',
      'fb.me',
    ];
    return hosts.some((h) => ref.includes(h));
  } catch {
    return false;
  }
}

/**
 * When true, Pixel + gated Meta hooks run even if the tab did not land on `/` with Meta traffic.
 * Use for Test events / QA: set `NEXT_PUBLIC_META_OPEN_PIXEL_GATE=true`, or use test code on localhost (see below).
 */
function shouldOpenMetaPixelGateForTesting() {
  if (typeof window === 'undefined' || typeof process === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_META_OPEN_PIXEL_GATE === 'true') return true;
  const host = String(window.location.hostname || '');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  if (isLocal && process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE?.trim()) return true;
  return false;
}

/** Whether Meta Pixel + matching CAPI should run for this browser tab. */
export function isMetaPixelEnabledForSession() {
  if (typeof window === 'undefined') return false;
  try {
    if (shouldOpenMetaPixelGateForTesting()) {
      try {
        sessionStorage.setItem(GATE_KEY, '1');
      } catch (_) {}
      return true;
    }
    const g = sessionStorage.getItem(GATE_KEY);
    if (g === '1') return true;
    if (g === '0') return false;
    const snap = parseSnapshot();
    if (!snap) {
      sessionStorage.setItem(GATE_KEY, '0');
      return false;
    }
    let open = false;
    try {
      const u = new URL(snap.href || window.location.href);
      open = isHomePath(snap.path) && isMetaTraffic(u, snap.ref || '');
    } catch {
      open = false;
    }
    sessionStorage.setItem(GATE_KEY, open ? '1' : '0');
    return open;
  } catch {
    return false;
  }
}
