/**
 * Shared retry for chunk load failures and network-related fetch failures (offline / slow).
 * Used by ChunkLoadErrorHandler, app/error.js, and layout inline script — keep keys in sync.
 */

export const NS_PAGE_LOAD_RETRY_KEY = 'ns_page_load_retry';
export const NS_PAGE_LOAD_RETRY_DONE = 'ns_page_load_retry_done';
/** @deprecated migrate — kept for session cleanup */
export const LEGACY_CHUNK_KEY = 'ns_chunk_reload';
export const LEGACY_CHUNK_DONE = 'ns_chunk_reload_done';
/**
 * Automatic full reload attempts (sequential) after a recoverable load failure, shared across
 * layout inline script, ChunkLoadErrorHandler, and app/error.js via sessionStorage count.
 */
export const MAX_PAGE_LOAD_RETRIES = 10;
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

/** Fetch user-cancel / navigation — not a broken deploy; do not full-page retry. */
function isGenericUserAbortMessage(msg) {
  if (typeof msg !== 'string') return false;
  const s = msg.toLowerCase().trim();
  return s === 'the user aborted a request.' || s === 'the user aborted a request';
}

/** For unhandledrejection: Error, DOMException, or plain object → searchable string. */
export function stringifyErrorReason(reason) {
  if (reason == null || reason === '') return '';
  if (typeof reason === 'string') return reason;
  if (typeof reason === 'object') {
    const m = reason.message;
    const st = reason.stack;
    const d = reason.digest;
    const parts = [m, st, d].filter(Boolean).map(String);
    if (parts.length) return parts.join(' ');
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

export function isNetworkErrorMessage(msg) {
  if (typeof msg !== 'string') return false;
  if (isGenericUserAbortMessage(msg)) return false;
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

/** CDN / origin / Next.js RSC / edge — reload may recover transient web-server or deploy issues. */
export function isWebServerLoadErrorMessage(msg) {
  if (typeof msg !== 'string') return false;
  if (isGenericUserAbortMessage(msg)) return false;
  const s = msg.toLowerCase();
  return (
    s.includes('internal server error') ||
    s.includes('unexpected server') ||
    s.includes('server error') ||
    s.includes('server components') ||
    s.includes('server component') ||
    s.includes('an error occurred in the server') ||
    s.includes('failed to fetch rsc') ||
    s.includes('rsc payload') ||
    (s.includes('flight') && (s.includes('fail') || s.includes('error'))) ||
    s.includes('econnrefused') ||
    s.includes('err_empty_response') ||
    s.includes('err_http2') ||
    s.includes('err_connection_closed') ||
    s.includes('remote protocol error') ||
    s.includes('http response code') ||
    s.includes('non-ok') ||
    s.includes('non-200') ||
    s.includes('hydration failed') ||
    s.includes('error while hydrating') ||
    s.includes('minified react error') ||
    s.includes('loading css chunk') ||
    s.includes('static file')
  );
}

export function isRecoverablePageLoadError(message) {
  if (!message) return false;
  const s = String(message);
  return (
    isChunkLoadErrorMessage(s) ||
    isNetworkErrorMessage(s) ||
    isWebServerLoadErrorMessage(s)
  );
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
  function isGenAbort(m){var s=String(m||'').toLowerCase().trim();return s==='the user aborted a request.'||s==='the user aborted a request';}
  function isNet(m){if(!m)return false;if(isGenAbort(m))return false;var s=String(m).toLowerCase();if(s.indexOf('failed to load')!==-1&&(s.indexOf('script')!==-1||s.indexOf('stylesheet')!==-1))return true;return s.indexOf('failed to fetch')!==-1||s.indexOf('fetch failed')!==-1||s.indexOf('networkerror')!==-1||s.indexOf('network request failed')!==-1||s.indexOf('load failed')!==-1||s.indexOf('err_internet')!==-1||s.indexOf('net::err')!==-1||s.indexOf('timeout')!==-1||s.indexOf('timed out')!==-1||s.indexOf('aborted')!==-1||s.indexOf('abort')!==-1||s.indexOf('econnreset')!==-1||s.indexOf('socket hang up')!==-1||s.indexOf('err_connection')!==-1||s.indexOf('err_network')!==-1||s.indexOf('err_name_not_resolved')!==-1||s.indexOf('err_timed_out')!==-1||s.indexOf('err_connection_reset')!==-1||s.indexOf('bad gateway')!==-1||s.indexOf('service unavailable')!==-1||s.indexOf('gateway timeout')!==-1||s.indexOf('502')!==-1||s.indexOf('503')!==-1||s.indexOf('504')!==-1||s.indexOf('unexpectedly closed')!==-1||s.indexOf('premature close')!==-1;}
  function isSrv(m){if(!m)return false;if(isGenAbort(m))return false;var s=String(m).toLowerCase();return s.indexOf('internal server error')!==-1||s.indexOf('unexpected server')!==-1||s.indexOf('server error')!==-1||s.indexOf('server components')!==-1||s.indexOf('server component')!==-1||s.indexOf('an error occurred in the server')!==-1||s.indexOf('failed to fetch rsc')!==-1||s.indexOf('rsc payload')!==-1||(s.indexOf('flight')!==-1&&(s.indexOf('fail')!==-1||s.indexOf('error')!==-1))||s.indexOf('econnrefused')!==-1||s.indexOf('err_empty_response')!==-1||s.indexOf('err_http2')!==-1||s.indexOf('err_connection_closed')!==-1||s.indexOf('remote protocol error')!==-1||s.indexOf('http response code')!==-1||s.indexOf('non-ok')!==-1||s.indexOf('non-200')!==-1||s.indexOf('hydration failed')!==-1||s.indexOf('error while hydrating')!==-1||s.indexOf('minified react error')!==-1||s.indexOf('loading css chunk')!==-1||s.indexOf('static file')!==-1;}
  function reasonStr(r){if(r==null)return'';if(typeof r==='string')return r;if(r&&typeof r==='object'){var a=[];if(r.message)a.push(String(r.message));if(r.stack)a.push(String(r.stack));if(r.digest)a.push(String(r.digest));if(a.length)return a.join(' ');}try{return JSON.stringify(r);}catch(e1){return String(r);}}
  function recoverable(m){return isChunk(m)||isNet(m)||isSrv(m);}
  function showExhausted(){
    try{
      document.body.innerHTML='<div id="ns-pl-exhausted-root" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#fafaf9;cursor:pointer" role="button" tabindex="0" aria-label="Reload"><div style="width:40px;height:40px;border:2px solid #e7e5e4;border-top-color:#1c1917;border-radius:9999px;animation:ns-spin 0.8s linear infinite"></div><style>@keyframes ns-spin{to{transform:rotate(360deg)}}</style></div>';
      var el=document.getElementById('ns-pl-exhausted-root');
      function go(){try{sessionStorage.removeItem(key);sessionStorage.removeItem(keyDone);location.reload();}catch(e2){try{location.reload();}catch(e3){}}}
      if(el){el.onclick=go;el.onkeydown=function(ev){if(ev.key==='Enter'||ev.key===' ')go();};}
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
  window.addEventListener('unhandledrejection',function(e){var m=reasonStr(e.reason);if(recoverable(m))reload();});
})();`;
}
