'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import { useParams } from 'next/navigation';
import { useOrdersStore, useProductsStore, useCurrencyStore } from '@/lib/store';
import { generateInvoicePDF } from '@/lib/invoice';
import { formatPrice } from '@/lib/currency';
import { getAdminOrder, updateOrderStatus as apiUpdateOrderStatus, getAdminProducts } from '@/lib/api';
import { useAdminRealtime } from '@/context/AdminRealtimeContext';

function _format(amount, currency) {
  return formatPrice(amount, currency || 'PKR');
}

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'confirmed'];

function getChangedBy() {
  if (typeof window === 'undefined') return 'admin';
  try {
    const a = JSON.parse(localStorage.getItem('nature_secret_admin') || '{}');
    return a.role === 'staff' ? 'staff' : 'admin';
  } catch {
    return 'admin';
  }
}

function getAdminToken() {
  try {
    const raw = localStorage.getItem('nature_secret_admin');
    const data = raw ? JSON.parse(raw) : null;
    return data?.access_token || null;
  } catch { return null; }
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const { realtimeKey } = useAdminRealtime();
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const localOrders = useOrdersStore((s) => s.orders);
  const localUpdateStatus = useOrdersStore((s) => s.updateOrderStatus);
  const storeProducts = useProductsStore((s) => s.products);
  const [apiProducts, setApiProducts] = useState([]);
  const currency = useCurrencyStore((s) => s.currency);
  const orderId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
  const products = getAdminToken()
    ? (Array.isArray(apiProducts) && apiProducts.length ? apiProducts : (storeProducts || []))
    : (storeProducts || []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !orderId) return;
    if (getAdminToken()) {
      Promise.all([
        getAdminOrder(orderId).catch(() => null),
        getAdminProducts({ limit: 200 }).then((r) => r.data || []).catch(() => []),
      ]).then(([o, prods]) => {
        setOrder(o || localOrders.find((x) => x.id === orderId) || null);
        setApiProducts(prods || []);
      }).finally(() => setLoading(false));
    } else {
      setOrder(localOrders.find((o) => o.id === orderId) || null);
      setLoading(false);
    }
  }, [mounted, orderId, localOrders, realtimeKey]);

  const updateOrderStatus = async (id, status, changedBy) => {
    if (getAdminToken()) {
      try {
        const updated = await apiUpdateOrderStatus(id, status);
        setOrder(updated);
      } catch (_) {}
    } else {
      localUpdateStatus(id, status, changedBy);
      setOrder((o) => (o && o.id === id ? { ...o, status } : o));
    }
  };

  const statusTimeline = order && (Array.isArray(order.statusTimeline) && order.statusTimeline.length > 0
    ? order.statusTimeline
    : [{ status: order.status || 'pending', changedAt: order.createdAt, changedBy: 'system' }]);

  if (!mounted || loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="min-h-[200px]">
        <Link href="/admin/orders" className="text-sm text-neutral-500 hover:text-neutral-900">← Orders</Link>
        <p className="mt-4 text-neutral-500">Order not found.</p>
      </div>
    );
  }

  const productsMap = products.reduce((acc, p) => ({ ...acc, [p.id]: { name: p.name } }), {});

  return (
    <div className="max-w-3xl min-h-[400px]">
      <Link href="/admin/orders" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Orders</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Order {order.id}</h1>
        <button
          type="button"
          onClick={() => generateInvoicePDF(order, productsMap, currency)}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
        >
          Download invoice
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Customer</h2>
          <p className="font-medium text-neutral-900">{order.customerName}</p>
          <p className="text-neutral-600">{order.email}</p>
          {order.phone && <p className="text-neutral-600">Phone: {order.phone}</p>}
          <p className="mt-2 text-neutral-600 whitespace-pre-wrap">{order.address}</p>
        </section>
        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Order info</h2>
          <ul className="space-y-1 text-sm">
            <li><span className="text-neutral-500">Created:</span> {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</li>
            {order.dispatchedAt && <li><span className="text-neutral-500">Dispatched:</span> {new Date(order.dispatchedAt).toLocaleString()}</li>}
            <li><span className="text-neutral-500">Payment:</span> {order.paymentMethod === 'cash_on_delivery' ? 'Cash on delivery' : order.paymentMethod || '—'}</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Change status</label>
            <select
              value={order.status}
              onChange={(e) => updateOrderStatus(order.id, e.target.value, getChangedBy())}
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-900 capitalize bg-white hover:border-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30 min-w-[160px]"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </section>
        {statusTimeline && statusTimeline.length > 0 && (
          <section className="p-6">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Status timeline</h2>
            <ul className="space-y-2 text-sm">
              {[...statusTimeline].reverse().map((entry, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-1.5 border-b border-neutral-100 last:border-0">
                  <span className="font-medium capitalize text-neutral-900">{entry.status}</span>
                  <span className="text-neutral-500">{entry.changedAt ? new Date(entry.changedAt).toLocaleString() : '—'}</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-600 capitalize">{entry.changedBy === 'staff' ? 'Staff' : entry.changedBy === 'admin' ? 'Admin' : 'System'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Items</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="pb-2">Product</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, i) => {
                const p = products.find((x) => x.id === item.productId);
                return (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="py-2 font-medium">{p?.name || item.productId}</td>
                    <td className="py-2">{item.qty}</td>
                    <td className="py-2 text-right">{_format(item.price, currency)}</td>
                    <td className="py-2 text-right">{_format((item.price || 0) * (item.qty || 1), currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 font-semibold text-neutral-900">Total: {_format(order.total, currency)}</p>
        </section>
      </div>
    </div>
  );
}
