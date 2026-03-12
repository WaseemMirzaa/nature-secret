'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import { useParams } from 'next/navigation';
import { useOrdersStore, useProductsStore, useCurrencyStore } from '@/lib/store';
import { generateInvoicePDF } from '@/lib/invoice';
import { formatPrice } from '@/lib/currency';
import { getAdminOrder, getAdminOrdersSameDay, updateOrderStatus as apiUpdateOrderStatus, getAdminProducts } from '@/lib/api';
import { useAdminRealtime } from '@/context/AdminRealtimeContext';
import { InlineLoader } from '@/components/ui/PageLoader';

function _format(amount, currency) {
  return formatPrice(amount, currency || 'PKR');
}

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const STAFF_STATUSES = ['shipped', 'delivered', 'cancelled', 'returned'];

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
  const [sameDayOrders, setSameDayOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const localOrders = useOrdersStore((s) => s.orders);
  const localUpdateStatus = useOrdersStore((s) => s.updateOrderStatus);
  const storeProducts = useProductsStore((s) => s.products);
  const [apiProducts, setApiProducts] = useState([]);
  const currency = useCurrencyStore((s) => s.currency);
  const orderId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
  const isStaff = (() => { try { return JSON.parse(localStorage.getItem('nature_secret_admin') || '{}').role === 'staff'; } catch { return false; } })();
  const products = getAdminToken()
    ? (Array.isArray(apiProducts) && apiProducts.length ? apiProducts : (storeProducts || []))
    : (storeProducts || []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !orderId) return;
    if (getAdminToken()) {
      Promise.all([
        getAdminOrder(orderId).catch(() => null),
        getAdminOrdersSameDay(orderId).catch(() => []),
        getAdminProducts({ limit: 200 }).then((r) => r.data || []).catch(() => []),
      ]).then(([o, sameDay, prods]) => {
        setOrder(o || localOrders.find((x) => x.id === orderId) || null);
        setSameDayOrders(Array.isArray(sameDay) ? sameDay : []);
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
        await apiUpdateOrderStatus(id, status);
        setOrder((o) => (o && o.id === id ? { ...o, status } : o));
        setSameDayOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      } catch (_) {}
    } else {
      localUpdateStatus(id, status, changedBy);
      setOrder((o) => (o && o.id === id ? { ...o, status } : o));
      setSameDayOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    }
  };

  const statusTimeline = order && (Array.isArray(order.statusTimeline) && order.statusTimeline.length > 0
    ? order.statusTimeline
    : [{ status: order.status || 'pending', changedAt: order.createdAt, changedBy: 'system' }]);

  if (!mounted || loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <InlineLoader />
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

  const productsMap = products.reduce((acc, p) => ({ ...acc, [p.id]: { name: p.name, variants: p.variants || [] } }), {});

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
              {(isStaff ? STAFF_STATUSES : STATUSES).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </section>
        {statusTimeline && statusTimeline.length > 0 && (
          <section className="p-6">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Status history (who changed)</h2>
            <ul className="space-y-2 text-sm">
              {[...statusTimeline].reverse().map((entry, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-1.5 border-b border-neutral-100 last:border-0">
                  <span className="font-medium capitalize text-neutral-900">{entry.status}</span>
                  <span className="text-neutral-500">{entry.changedAt ? new Date(entry.changedAt).toLocaleString() : '—'}</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-600">{entry.changedBy === 'staff' ? 'Staff' : entry.changedBy === 'admin' ? 'Admin' : 'System'}</span>
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
                const variant = item.variantId && p?.variants ? p.variants.find((v) => v.id === item.variantId) : null;
                return (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="py-2">
                      <span className="font-medium">{p?.name ?? 'Product'}</span>
                      {variant && <span className="ml-2 text-xs text-neutral-500 bg-neutral-100 rounded-lg px-2 py-0.5">{variant.name}</span>}
                    </td>
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

        {sameDayOrders.length > 1 && (
          <section className="p-6 border-t border-neutral-200">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Orders from this customer on this day ({sameDayOrders.length})</h2>
            <div className="space-y-4">
              {sameDayOrders.map((o) => (
                <div key={o.id} className={`rounded-xl border p-4 ${o.id === order.id ? 'border-neutral-300 bg-neutral-50/80' : 'border-neutral-200 bg-white'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-neutral-900">Order {o.id}</span>
                    {o.id === order.id && <span className="text-xs font-medium text-neutral-600 bg-neutral-200 rounded px-2 py-0.5">Current</span>}
                    <span className="text-sm text-neutral-600">{_format(o.total, currency)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <select
                      value={o.status}
                      onChange={(e) => updateOrderStatus(o.id, e.target.value, getChangedBy())}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm capitalize bg-white"
                    >
                      {(isStaff ? STAFF_STATUSES : STATUSES).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="text-xs text-neutral-500">{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {(o.items || []).map((item, i) => {
                        const p = products.find((x) => x.id === item.productId);
                        const variant = item.variantId && p?.variants ? p.variants.find((v) => v.id === item.variantId) : null;
                        return (
                          <tr key={i} className="border-t border-neutral-100">
                            <td className="py-1">{p?.name ?? 'Product'}{variant ? ` (${variant.name})` : ''} × {item.qty}</td>
                            <td className="py-1 text-right">{_format((item.price || 0) * (item.qty || 1), currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
