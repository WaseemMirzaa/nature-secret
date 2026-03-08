'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from '@/components/Link';
import { useOrdersStore, useProductsStore, useCurrencyStore } from '@/lib/store';
import { generateInvoicePDF } from '@/lib/invoice';
import { formatPrice } from '@/lib/currency';
import { getAdminOrders, updateOrderStatus as apiUpdateOrderStatus, getAdminProducts } from '@/lib/api';
import { TableSkeleton } from '@/components/ui/PageLoader';
import { useAdminRealtime } from '@/context/AdminRealtimeContext';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const PAGE_SIZE = 50;

function getChangedBy() {
  if (typeof window === 'undefined') return 'admin';
  try {
    const a = JSON.parse(localStorage.getItem('nature_secret_admin') || '{}');
    return a.role === 'staff' ? 'staff' : 'admin';
  } catch {
    return 'admin';
  }
}

export default function AdminOrdersPage() {
  const { realtimeKey } = useAdminRealtime();
  const { orders: localOrders, updateOrderStatus: localUpdateStatus } = useOrdersStore();
  const products = useProductsStore((s) => s.products);
  const currency = useCurrencyStore((s) => s.currency);
  const [apiOrders, setApiOrders] = useState([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [apiProducts, setApiProducts] = useState([]);
  const [useApi, setUseApi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem('nature_secret_admin') || '{}');
      setIsStaff(a.role === 'staff');
    } catch {
      setIsStaff(false);
    }
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setUseApi(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
        getAdminOrders({ page, limit: PAGE_SIZE, status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }).catch(() => ({ data: [], total: 0 })),
        getAdminProducts({ limit: 500 }).catch(() => ({ data: [] })),
      ])
      .then(([ordersRes, productsRes]) => {
        if (!cancelled) {
          setApiOrders(Array.isArray(ordersRes?.data) ? ordersRes.data : []);
          setApiTotal(typeof ordersRes?.total === 'number' ? ordersRes.total : 0);
          setApiProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
          setUseApi(true);
        }
      })
      .catch(() => { if (!cancelled) setUseApi(false); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, statusFilter, search, dateFrom, dateTo, realtimeKey]);

  function getAdminToken() {
    try {
      const a = JSON.parse(localStorage.getItem('nature_secret_admin') || '{}');
      return a?.access_token || null;
    } catch { return null; }
  }

  const orders = useApi ? apiOrders : (localOrders || []);
  const totalCount = useApi ? apiTotal : (localOrders || []).length;

  async function handleStatusChange(orderId, status) {
    if (useApi) {
      try {
        await apiUpdateOrderStatus(orderId, status);
        setApiOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      } catch (_) {}
    } else {
      localUpdateStatus(orderId, status, getChangedBy());
    }
  }

  const filtered = useMemo(() => {
    if (useApi) return Array.isArray(apiOrders) ? apiOrders : [];
    let list = localOrders || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.email?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter);
    if (dateFrom) list = list.filter((o) => o.createdAt && new Date(o.createdAt) >= new Date(dateFrom));
    if (dateTo) list = list.filter((o) => o.createdAt && new Date(o.createdAt) <= new Date(dateTo + 'T23:59:59'));
    return list;
  }, [useApi, apiOrders, localOrders, search, statusFilter, dateFrom, dateTo]);

  const ordersList = useApi ? (Array.isArray(apiOrders) ? apiOrders : []) : filtered;
  const totalPages = useApi ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages);
  const paginated = useApi ? ordersList : useMemo(() => filtered.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE), [filtered, pageIndex]);
  const displayTotal = useApi ? totalCount : filtered.length;
  const productsForMap = useApi ? apiProducts : products;
  const productsMap = useMemo(() => (productsForMap || []).reduce((acc, p) => ({ ...acc, [p.id]: { name: p.name } }), {}), [productsForMap]);
  useEffect(() => setPage(1), [search, statusFilter, dateFrom, dateTo]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Orders</h1>
      <div className="mt-4 flex flex-wrap gap-3 sm:gap-4 items-center">
        <input
          type="text"
          placeholder="Search by order ID, customer, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm w-full sm:w-64 min-w-0"
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm min-w-0" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm min-w-0" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm min-w-0">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Showing {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, displayTotal)} of {displayTotal.toLocaleString()}
      </p>
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white overflow-hidden flex flex-col max-h-[calc(100vh-12rem)] sm:max-h-[calc(100vh-16rem)]">
        <div className="overflow-y-auto overflow-x-auto min-h-0 flex-1">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Order</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Customer</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Total</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Status</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <TableSkeleton rows={8} cols={5} /> : (Array.isArray(paginated) ? paginated : []).map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                  <td className="p-4 font-medium">
                    <Link href={`/admin/orders/${o.id}`} prefetch={false} className="text-neutral-900 hover:underline">{o.id}</Link>
                  </td>
                  <td className="p-4">{o.customerName}<br /><span className="text-neutral-500 text-xs">{o.email}</span></td>
                  <td className="p-4">{formatPrice(o.total, currency)}</td>
                  <td className="p-4">
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-900 capitalize bg-white hover:border-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/orders/${o.id}`} prefetch={false} className="inline-flex items-center rounded-xl bg-neutral-900 text-white px-3 py-2 text-sm font-medium hover:bg-neutral-800">View</Link>
                      {!isStaff && (
                        <button type="button" onClick={() => generateInvoicePDF(o, productsMap, currency)} className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50">Invoice</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
        {totalPages > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between gap-4 p-4 border-t border-neutral-200 bg-neutral-50">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageIndex <= 1}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-neutral-600">
              Page {pageIndex} of {totalPages.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageIndex >= totalPages}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
