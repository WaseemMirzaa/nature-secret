'use client';

import Link from '@/components/Link';
import { useEffect, useState } from 'react';
import { useOrdersStore } from '@/lib/store';
import { formatPrice } from '@/lib/currency';
import { useCurrencyStore } from '@/lib/store';
import { getAdminDashboard, getAdminOrders } from '@/lib/api';
import { useAdminRealtime } from '@/context/AdminRealtimeContext';

function _format(n, currency) {
  return formatPrice(n, currency || 'PKR');
}

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nature_secret_admin');
    const data = raw ? JSON.parse(raw) : null;
    return data?.access_token || null;
  } catch { return null; }
}

export default function AdminDashboardPage() {
  const { realtimeKey } = useAdminRealtime();
  const localOrders = useOrdersStore((s) => s.orders);
  const currency = useCurrencyStore((s) => s.currency);
  const [apiStats, setApiStats] = useState(null);
  const [apiOrders, setApiOrders] = useState([]);
  const [useApi, setUseApi] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      setUseApi(false);
      setApiFailed(false);
      return;
    }
    setApiFailed(false);
    Promise.all([getAdminDashboard().catch(() => null), getAdminOrders({ limit: 5 }).catch(() => null)])
      .then(([dashboard, ordersRes]) => {
        if (dashboard) {
          setApiStats({ totalSales: dashboard.totalRevenue || 0, ordersCount: dashboard.orderCount || 0, ordersToday: dashboard.todayOrders || 0, revenueToday: 0 });
          setUseApi(true);
        } else {
          setApiFailed(true);
        }
        if (ordersRes?.data?.length) setApiOrders(ordersRes.data);
      })
      .catch(() => {
        setUseApi(false);
        setApiFailed(true);
      });
  }, [realtimeKey]);

  const ordersList = useApi ? apiOrders : (localOrders || []);
  const orders = Array.isArray(ordersList) ? ordersList : [];
  const stats = useApi && apiStats
    ? { ...apiStats, revenueToday: apiStats.revenueToday }
    : (() => {
        const list = localOrders || [];
        const totalSales = list.reduce((s, o) => s + (o.total || 0), 0);
        const today = new Date().toDateString();
        const ordersToday = list.filter((o) => new Date(o.createdAt).toDateString() === today).length;
        const revenueToday = list.filter((o) => new Date(o.createdAt).toDateString() === today).reduce((s, o) => s + (o.total || 0), 0);
        return { totalSales, ordersCount: list.length, ordersToday, revenueToday };
      })();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <p className="text-neutral-500 mt-1">{useApi ? 'Overview from server' : apiFailed ? 'Unable to load from server. Showing local cache.' : 'Overview from local cache'}</p>
      {apiFailed && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2 text-sm text-amber-800">
          API unavailable. Stats and recent orders may be from local cache.
        </div>
      )}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Total sales</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{_format(stats.totalSales, currency)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Orders (all)</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{stats.ordersCount}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Orders today</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{stats.ordersToday}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Revenue today</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{_format(stats.revenueToday ?? 0, currency)}</p>
        </div>
      </div>
      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium text-neutral-900">Recent orders</h2>
        {orders.length === 0 && apiFailed ? (
          <p className="mt-4 text-neutral-500 text-sm">No orders to show. API unavailable—try again later.</p>
        ) : (
        <ul className="mt-4 space-y-0">
          {orders.slice(0, 5).map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`} prefetch={false}
                className="flex justify-between items-center py-3 border-b border-neutral-100 last:border-0 text-left hover:bg-neutral-50 rounded-lg px-2 -mx-2 transition"
              >
                <span className="font-medium text-neutral-900">{o.id}</span>
                <span className="text-neutral-500">{o.customerName}</span>
                <span className="text-neutral-900">{_format(o.total, currency)}</span>
                <span className="text-sm text-neutral-500 capitalize">{o.status}</span>
              </Link>
            </li>
          ))}
        </ul>
        )}
      </div>
    </div>
  );
}
