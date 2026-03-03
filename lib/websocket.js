/**
 * WebSocket (Socket.IO) client for real-time admin updates. No polling.
 */

export const WS_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
};

export function getWsUrl() {
  const base =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
    (typeof window !== 'undefined' && window.__NEXT_PUBLIC_API_URL__) ||
    'http://localhost:4000';
  return base.replace(/\/$/, '');
}
