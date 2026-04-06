/**
 * Shared retry for chunk load failures and network-related fetch failures (offline / slow).
 * Used by ChunkLoadErrorHandler, app/error.js, and layout inline script — keep keys in sync.
 */

export const NS_PAGE_LOAD_RETRY_KEY = 'ns_page_load_retry';
export const NS_PAGE_LOAD_RETRY_DONE = 'ns_page_load_retry_done';
/** @deprecated migrate — kept for session cleanup */
export const LEGACY_CHUNK_KEY = 'ns_chunk_reload';
export const LEGACY_CHUNK_DONE = 'ns_chunk_reload_done';
/** Number of automatic reload attempts before showing the exhausted error UI. */
export const MAX_PAGE_LOAD_RETRIES = 5;
/** Delay so the retry loader is visible before reload. */
export const RETRY_UI_DELAY_MS = 450;

export function isChunkLoadErrorMessage(msg) {
  if (typeof msg !== 'string') return false;
  return (
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed')
  );
}

export function isNetworkErrorMessage(msg) {
  if (typeof msg !== 'string') return false;
  const s = msg.toLowerCase();
  return (
    s.includes('failed to fetch') ||
    s.includes('fetch failed') ||
    s.includes('networkerror') ||
    s.includes('network request failed') ||
    s.includes('load failed') ||
    s.includes('err_internet') ||
    s.includes('net::err') ||
    s.includes('networkerror when attempting to fetch') ||
    s.includes('the internet connection appears to be offline') ||
    s.includes('connection refused') ||
    s.includes('timeout') ||
    s.includes('timed out') ||
    s.includes('aborted') ||
    s.includes('abort') ||
    s.includes('econnreset') ||
    s.includes('socket hang up') ||
    s.includes('err_connection') ||
    s.includes('err_network') ||
    s.includes('err_name_not_resolved') ||
    s.includes('err_timed_out') ||
    s.includes('err_connection_reset') ||
    s.includes('bad gateway') ||
    s.includes('service unavailable') ||
    s.includes('gateway timeout') ||
    s.includes('502') ||
    s.includes('503') ||
    s.includes('504') ||
    s.includes('unexpectedly closed') ||
    s.includes('premature close') ||
    (s.includes('failed to load') && (s.includes('script') || s.includes('stylesheet')))
  );
}

export function isRecoverablePageLoadError(message) {
  if (!message) return false;
  const s = String(message);
  return isChunkLoadErrorMessage(s) || isNetworkErrorMessage(s);
}

/** Read current retry count (client only). Resets only on successful load (clearPageLoadRetryState) or manual retry. */
export function readPageLoadRetryState() {
  const now = Date.now();
  let data = { count: 0, first: now };
  if (typeof window === 'undefined') return data;
  try {
    const raw = sessionStorage.getItem(NS_PAGE_LOAD_RETRY_KEY);
    if (raw) {
      data = JSON.parse(raw);
      if (typeof data.count !== 'number' || Number.isNaN(data.count)) data.count = 0;
      if (!data.first) data.first = now;
    } else {
      const legacy = sessionStorage.getItem(LEGACY_CHUNK_KEY);
      if (legacy) {
        try {
          const d = JSON.parse(legacy);
          if (typeof d.count === 'number' && !Number.isNaN(d.count)) data = { count: d.count, first: d.first || now };
        } catch (_) {}
      }
    }
  } catch (_) {}
  return data;
}

export function clearPageLoadRetryState() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(NS_PAGE_LOAD_RETRY_KEY);
    sessionStorage.removeItem(NS_PAGE_LOAD_RETRY_DONE);
  } catch (_) {}
}

/** Inline script (layout) — must stay ES5-safe, no imports. Spinner only before reload; exhausted UI after max retries. */
export function networkRetryInlineScript() {
  const key = NS_PAGE_LOAD_RETRY_KEY;
  const keyDone = NS_PAGE_LOAD_RETRY_DONE;
  const max = MAX_PAGE_LOAD_RETRIES;
  const delay = RETRY_UI_DELAY_MS;
  return `(function(){
  var key=${JSON.stringify(key)}, keyDone=${JSON.stringify(keyDone)}, max=${max}, delay=${delay};
  function isChunk(m){var s=(m&&m.message)?m.message:String(m);return s.indexOf('ChunkLoadError')!==-1||s.indexOf('Loading chunk')!==-1||s.indexOf('Failed to fetch dynamically imported module')!==-1||s.indexOf('Importing a module script failed')!==-1;}
  function isNet(m){if(!m)return false;var s=String(m).toLowerCase();if(s.indexOf('failed to load')!==-1&&(s.indexOf('script')!==-1||s.indexOf('stylesheet')!==-1))return true;return s.indexOf('failed to fetch')!==-1||s.indexOf('fetch failed')!==-1||s.indexOf('networkerror')!==-1||s.indexOf('network request failed')!==-1||s.indexOf('load failed')!==-1||s.indexOf('err_internet')!==-1||s.indexOf('net::err')!==-1||s.indexOf('timeout')!==-1||s.indexOf('timed out')!==-1||s.indexOf('aborted')!==-1||s.indexOf('abort')!==-1||s.indexOf('econnreset')!==-1||s.indexOf('socket hang up')!==-1||s.indexOf('err_connection')!==-1||s.indexOf('err_network')!==-1||s.indexOf('err_name_not_resolved')!==-1||s.indexOf('err_timed_out')!==-1||s.indexOf('err_connection_reset')!==-1||s.indexOf('bad gateway')!==-1||s.indexOf('service unavailable')!==-1||s.indexOf('gateway timeout')!==-1||s.indexOf('502')!==-1||s.indexOf('503')!==-1||s.indexOf('504')!==-1||s.indexOf('unexpectedly closed')!==-1||s.indexOf('premature close')!==-1;}
  function recoverable(m){return isChunk(m)||isNet(m);}
  function showExhausted(){
    try{
      document.body.innerHTML='<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#fafaf9;color:#1c1917"><h1 style="font-size:1.25rem;font-weight:600;margin:0 0 8px">Couldn\\'t load page</h1><p style="font-size:0.875rem;color:#78716c;margin:0 0 24px;text-align:center;max-width:28rem">We tried several times but the page could not load. Check your connection and try again.</p><button type="button" id="ns-pl-exhausted-btn" style="border-radius:0.75rem;background:#1c1917;color:#fff;padding:0.625rem 1.5rem;font-size:0.875rem;font-weight:500;border:none;cursor:pointer">Try again</button></div>';
      var b=document.getElementById('ns-pl-exhausted-btn');
      if(b)b.onclick=function(){try{sessionStorage.removeItem(key);sessionStorage.removeItem(keyDone);location.reload();}catch(e2){try{location.reload();}catch(e3){}}};
    }catch(e){}
  }
  function showLoader(){
    try{
      document.body.innerHTML='<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#fafaf9" aria-hidden="true"><div style="width:40px;height:40px;border:2px solid #e7e5e4;border-top-color:#1c1917;border-radius:9999px;animation:ns-spin 0.8s linear infinite"></div><style>@keyframes ns-spin{to{transform:rotate(360deg)}}</style></div>';
    }catch(e){}
  }
  function reload(){
    try{
      if(window.__NS_PAGE_LOAD_RETRY_REACT__)return;
      if(location.pathname==='/404')return;
      var now=Date.now(), raw=sessionStorage.getItem(key), data={count:0,first:now};
      if(raw){try{data=JSON.parse(raw);if(typeof data.count!=='number'||data.count!==data.count)data.count=0;if(!data.first)data.first=now;}catch(e){data={count:0,first:now};}}
      if(data.count<max){
        data.count++;
        sessionStorage.setItem(key,JSON.stringify(data));
        showLoader();
        setTimeout(function(){location.reload();},delay);
        return;
      }
      sessionStorage.setItem(keyDone,'1');
      showExhausted();
    }catch(e){try{location.reload();}catch(e2){showExhausted();}}
  }
  window.addEventListener('error',function(e){
    var msg=e&&e.message?String(e.message):'';
    if(!msg&&e&&e.target&&e.target.tagName==='SCRIPT'&&e.target.src){msg='Failed to load script '+e.target.src;}
    if(!msg&&e&&e.target&&e.target.tagName==='LINK'&&e.target.href){msg='Failed to load stylesheet '+e.target.href;}
    if(recoverable(msg))reload();
  });
  window.addEventListener('unhandledrejection',function(e){var m=e.reason&&e.reason.message?e.reason.message:String(e.reason||'');if(recoverable(m))reload();});
})();`;
}
