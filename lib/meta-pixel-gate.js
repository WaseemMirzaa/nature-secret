/**
 * Meta Pixel / CAPI when the tab’s first full page load was a storefront entry path (home, PDP, checkout).
 * Gate opens for any such landing (organic, direct, or Meta) so PageView / CAPI stay aligned with sessions;
 * Meta-ads attribution still comes from fbc/fbp and URL params captured elsewhere.
 */

const SNAPSHOT_KEY = 'nature_secret_landing_snapshot';
const GATE_KEY = 'nature_secret_meta_pixel_gate';

/** Head bootstrap stores this when early PageView runs; `trackPageView` relays CAPI with same id then clears. */
export const META_HEAD_PAGE_VIEW_EID_KEY = 'nature_secret_meta_head_pv_eid';

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

/** Same URL as inline bootstrap + `<link rel="preload">` in RootLayout. */
export const META_FBE_EVENTS_SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';
const FB_EVENTS_SRC = META_FBE_EVENTS_SCRIPT_URL;

/**
 * Synchronous `<head>` bootstrap: snapshot + gate + fbq stub, then async `fbevents.js` (dispatches `meta-fbevents-loaded`).
 * Call from RootLayout only when `NEXT_PUBLIC_META_PIXEL_ID` is set.
 */
export function buildMetaPixelHeadBootstrapScript() {
  const pixelId = String(process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();
  if (!pixelId) return null;
  const openGate = process.env.NEXT_PUBLIC_META_OPEN_PIXEL_GATE === 'true';
  const testCode = String(process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE || '').trim();
  const pid = JSON.stringify(pixelId);
  const fb = JSON.stringify(FB_EVENTS_SRC);
  return `(function(){
var SK='nature_secret_landing_snapshot';
var GK='nature_secret_meta_pixel_gate';
var PID=${pid};
var OPEN_GATE=${openGate};
var TEST_CODE=${JSON.stringify(testCode)};
var FB=${fb};
try{
  if(!sessionStorage.getItem(SK)){
    sessionStorage.setItem(SK,JSON.stringify({path:location.pathname,href:location.href,ref:document.referrer||''}));
  }
}catch(e){}
var enabled=false;
try{
  var h=String(location.hostname||'');
  var local=h==='localhost'||h==='127.0.0.1'||/\\.local$/.test(h);
  if(OPEN_GATE||(local&&TEST_CODE)){
    try{sessionStorage.setItem(GK,'1');}catch(e){}
    enabled=true;
  }else{
    var g=sessionStorage.getItem(GK);
    if(g==='1')enabled=true;
    else if(g==='0')return;
    else{
      var raw=sessionStorage.getItem(SK);
      if(!raw){try{sessionStorage.setItem(GK,'0');}catch(e){}return;}
      var snap;
      try{snap=JSON.parse(raw);}catch(e){try{sessionStorage.setItem(GK,'0');}catch(e2){}return;}
      var path=String(snap.path||'/');
      function elig(pp){
        var p=String(pp||'');
        while(p.length>1&&p.charAt(p.length-1)==='/')p=p.slice(0,-1);
        if(!p)p='/';
        if(p===''||p==='/')return true;
        if(p==='/shop')return true;
        if(p.length>6&&p.indexOf('/shop/')===0){
          var rest=p.slice(6);
          if(rest&&rest.indexOf('/')===-1)return true;
        }
        if(p==='/checkout')return true;
        if(p.indexOf('/checkout/')===0)return true;
        return false;
      }
      enabled=elig(path);
      try{sessionStorage.setItem(GK,enabled?'1':'0');}catch(e){}
    }
  }
}catch(e){return;}
if(!enabled||!PID)return;
if(window.fbq)return;
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;try{t.fetchPriority='high';}catch(_){}t.onload=function(){try{window.dispatchEvent(new CustomEvent('meta-fbevents-loaded'));}catch(_){}};s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',FB);
var AM_EID='';
try{
  var AM_SK='nature_secret_capi_external_id';
  AM_EID=localStorage.getItem(AM_SK)||'';
  if(!AM_EID){
    AM_EID=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():('ns_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,14));
    AM_EID=String(AM_EID).slice(0,64);
    localStorage.setItem(AM_SK,AM_EID);
  }else{AM_EID=String(AM_EID).trim().slice(0,64);}
}catch(e){AM_EID='';}
fbq('init',PID,AM_EID?{external_id:AM_EID}:{});
fbq('set','autoConfig',false,PID);
function headPvElig(pp){
  var p=String(pp||'');
  while(p.length>1&&p.charAt(p.length-1)==='/')p=p.slice(0,-1);
  if(!p)p='/';
  if(p===''||p==='/')return true;
  if(p.length>6&&p.indexOf('/shop/')===0){var rest=p.slice(6);if(rest&&rest.indexOf('/')===-1)return true;}
  return false;
}
if(headPvElig(location.pathname)){
  var eid=('pv_'+Date.now()+'_'+Math.random().toString(36).slice(2,11)).slice(0,128);
  try{sessionStorage.setItem(${JSON.stringify(META_HEAD_PAGE_VIEW_EID_KEY)},eid);}catch(e){}
  fbq('track','PageView',{}, {eventID:eid});
}
})();`;
}

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
 * First paint path that opens the Meta gate (Pixel + CAPI hooks). Not blog/admin/etc.
 * Home, `/shop`, product detail `/shop/:segment`, checkout.
 */
export function isEligibleFirstLandingPath(path) {
  if (isHomePath(path)) return true;
  const p = String(path || '').replace(/\/+$/, '') || '/';
  if (p === '/shop') return true;
  if (/^\/shop\/[^/]+/.test(p)) return true;
  if (p === '/checkout' || /^\/checkout\//.test(p)) return true;
  return false;
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
      open = isEligibleFirstLandingPath(snap.path);
    } catch {
      open = false;
    }
    sessionStorage.setItem(GATE_KEY, open ? '1' : '0');
    return open;
  } catch {
    return false;
  }
}
