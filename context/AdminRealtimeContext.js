'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getWsUrl, WS_EVENTS } from '@/lib/websocket';
import { playBell } from '@/lib/notification-sound';

const AdminRealtimeContext = createContext({ realtimeKey: 0 });

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nature_secret_admin');
    const data = raw ? JSON.parse(raw) : null;
    return data?.access_token || null;
  } catch {
    return null;
  }
}

function showNewOrderNotification(order) {
  if (typeof window === 'undefined') return;
  try {
    if (window.Notification?.permission === 'granted') {
      const n = new window.Notification('New order', {
        body: order?.id ? `Order received. View in admin.` : 'A new order has been placed.',
        tag: order?.id ? `order-${order.id}` : 'new-order',
        icon: '/favicon.ico',
      });
      n.onclick = () => { n.close(); window.focus(); };
    }
    playBell();
  } catch (_) {}
}

export function AdminRealtimeProvider({ children }) {
  const [realtimeKey, setRealtimeKey] = useState(0);
  const socketRef = useRef(null);
  const permissionAsked = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Notification && !permissionAsked.current) {
      permissionAsked.current = true;
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (!getAdminToken()) return;
    const url = getWsUrl();
    const token = getAdminToken();
    const socket = io(url, {
      path: '/api/v1/ws',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token },
    });
    socketRef.current = socket;

    const onOrderCreated = (payload) => {
      setRealtimeKey((k) => k + 1);
      showNewOrderNotification(payload || {});
    };
    const onOrderUpdated = () => setRealtimeKey((k) => k + 1);
    const onDashboardRefresh = () => setRealtimeKey((k) => k + 1);

    socket.on(WS_EVENTS.ORDER_CREATED, onOrderCreated);
    socket.on(WS_EVENTS.ORDER_UPDATED, onOrderUpdated);
    socket.on(WS_EVENTS.DASHBOARD_REFRESH, onDashboardRefresh);

    return () => {
      socket.off(WS_EVENTS.ORDER_CREATED, onOrderCreated);
      socket.off(WS_EVENTS.ORDER_UPDATED, onOrderUpdated);
      socket.off(WS_EVENTS.DASHBOARD_REFRESH, onDashboardRefresh);
      socket.close();
      socketRef.current = null;
    };
  }, []);

  return (
    <AdminRealtimeContext.Provider value={{ realtimeKey }}>
      {children}
    </AdminRealtimeContext.Provider>
  );
}

export function useAdminRealtime() {
  return useContext(AdminRealtimeContext);
}
