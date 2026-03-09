/**
 * WebSocket (Socket.IO) client for real-time admin updates. No polling.
 * Must match API origin (same host when on public URL so Nginx can proxy WS).
 */

export const WS_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
};

function isLoopback(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getWsUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location?.hostname || '';
    const onPublicHost = host && host !== 'localhost' && host !== '127.0.0.1';
    if (onPublicHost && window.location?.origin) {
      const env = (window.__NEXT_PUBLIC_API_URL__ || process.env?.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      if (!env || isLoopback(env)) return window.location.origin;
    }
    const base =
      (typeof window !== 'undefined' && window.__NEXT_PUBLIC_API_URL__) ||
      (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
      'http://localhost:4000';
    return String(base).replace(/\/$/, '');
  }
  return (process.env?.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}
