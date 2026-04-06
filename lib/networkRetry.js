/**
 * Shared retry for chunk load failures and network-related fetch failures (offline / slow).
 * Used by ChunkLoadErrorHandler, app/error.js, and layout inline script — keep keys in sync.
 */

export const NS_PAGE_LOAD_RETRY_KEY = 'ns_page_load_retry';
export const NS_PAGE_LOAD_RETRY_DONE = 'ns_page_load_retry_done';
/** @deprecated migrate — kept for session cleanup */
export const LEGACY_CHUNK_KEY = 'ns_chunk_reload';
export const LEGACY_CHUNK_DONE = 'ns_chunk_reload_done';
/** Number of automatic reload attempts before /404 (slow/offline loads). */
export const MAX_PAGE_LOAD_RETRIES = 5;
export const RETRY_WINDOW_MS = 60000;
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
    s.includes('premature close')
  );
}

export function isRecoverablePageLoadError(message) {
  if (!message) return false;
  const s = String(message);
  return isChunkLoadErrorMessage(s) || isNetworkErrorMessage(s);
}

/** Read current retry count (client only). */
export function readPageLoadRetryState() {
  const now = Date.now();
  let data = { count: 0, first: now };
  if (typeof window === 'undefined') return data;
  try {
    const raw = sessionStorage.getItem(NS_PAGE_LOAD_RETRY_KEY);
    if (raw) {
      data = JSON.parse(raw);
      if (now - data.first > RETRY_WINDOW_MS) data = { count: 0, first: now };
    } else {
      const legacy = sessionStorage.getItem(LEGACY_CHUNK_KEY);
      if (legacy) {
        try {
          const d = JSON.parse(legacy);
          if (now - d.first <= RETRY_WINDOW_MS) data = d;
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

/** Inline script (layout) — must stay ES5-safe, no imports. Shows brief “reconnecting” before reload. */
export function networkRetryInlineScript() {
  const key = NS_PAGE_LOAD_RETRY_KEY;
  const keyDone = NS_PAGE_LOAD_RETRY_DONE;
  const max = MAX_PAGE_LOAD_RETRIES;
  const win = RETRY_WINDOW_MS;
  const delay = RETRY_UI_DELAY_MS;
  return `(function(){
  var key=${JSON.stringify(key)}, keyDone=${JSON.stringify(keyDone)}, max=${max}, win=${win}, delay=${delay};
  function isChunk(m){var s=(m&&m.message)?m.message:String(m);return s.indexOf('ChunkLoadError')!==-1||s.indexOf('Loading chunk')!==-1||s.indexOf('Failed to fetch dynamically imported module')!==-1||s.indexOf('Importing a module script failed')!==-1;}
  function isNet(m){if(!m)return false;var s=String(m).toLowerCase();return s.indexOf('failed to fetch')!==-1||s.indexOf('fetch failed')!==-1||s.indexOf('networkerror')!==-1||s.indexOf('network request failed')!==-1||s.indexOf('load failed')!==-1||s.indexOf('err_internet')!==-1||s.indexOf('net::err')!==-1||s.indexOf('timeout')!==-1||s.indexOf('timed out')!==-1||s.indexOf('aborted')!==-1||s.indexOf('econnreset')!==-1||s.indexOf('socket hang up')!==-1||s.indexOf('err_connection')!==-1||s.indexOf('502')!==-1||s.indexOf('503')!==-1||s.indexOf('504')!==-1;}
  function recoverable(m){return isChunk(m)||isNet(m);}
  function go404(){try{location.replace('/404');}catch(e){location.href='/404';}}
  function showLoader(n){
    try{
      document.body.innerHTML='<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#fafaf9;color:#1c1917"><div style="width:40px;height:40px;border:2px solid #e7e5e4;border-top-color:#1c1917;border-radius:9999px;animation:ns-spin 0.8s linear infinite;margin-bottom:16px"></div><p style="font-size:0.875rem;font-weight:500;margin:0">Connection is slow…</p><p style="font-size:0.75rem;color:#78716c;margin-top:6px">Retrying '+n+' of '+max+'</p><style>@keyframes ns-spin{to{transform:rotate(360deg)}}</style></div>';
    }catch(e){}
  }
  function reload(){
    try{
      if(window.__NS_PAGE_LOAD_RETRY_REACT__)return;
      if(location.pathname==='/404')return;
      var now=Date.now(), raw=sessionStorage.getItem(key), data={count:0,first:now};
      if(raw){try{data=JSON.parse(raw);if(now-data.first>win)data={count:0,first:now};}catch(e){}}
      if(data.count<max){
        data.count++;
        sessionStorage.setItem(key,JSON.stringify(data));
        var attemptNum=data.count;
        showLoader(attemptNum);
        setTimeout(function(){location.reload();},delay);
        return;
      }
      sessionStorage.setItem(keyDone,'1');
      go404();
    }catch(e){try{location.reload();}catch(e2){go404();}}
  }
  window.addEventListener('error',function(e){if(recoverable(e.message))reload();});
  window.addEventListener('unhandledrejection',function(e){var m=e.reason&&e.reason.message?e.reason.message:String(e.reason||'');if(recoverable(m))reload();});
})();`;
}
