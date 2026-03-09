/**
 * WebSocket (Socket.IO) client for real-time admin updates. No polling.
 * Must match API origin (same host when on public URL so Nginx can proxy WS).
 */

export const WS_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
};

export function getWsUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}
