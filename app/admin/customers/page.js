'use client';

import { useOrdersStore } from '@/lib/store';
import { useMemo, useState, useEffect } from 'react';
import Link from '@/components/Link';
import { getAdminCustomers } from '@/lib/api';
import { TableSkeleton } from '@/components/ui/PageLoader';

const PAGE_SIZE = 50;

function getAdminToken() {
  try {
    const a = JSON.parse(localStorage.getItem('nature_secret_admin') || '{}');
    return a?.access_token || null;
  } catch { return null; }
}

export default function AdminCustomersPage() {
  const orders = useOrdersStore((s) => s.orders);
  const [apiCustomers, setApiCustomers] = useState([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [useApi, setUseApi] = useState(false);
  const [loading, setLoading] = useState(!!getAdminToken());
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!getAdminToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getAdminCustomers({ page, limit: PAGE_SIZE, search: search || undefined })
      .then((r) => {
        if (!cancelled) {
          setApiCustomers(r.data || []);
          setApiTotal(r.total ?? 0);
          setUseApi(true);
        }
      })
      .catch(() => { if (!cancelled) setUseApi(false); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search]);

  const customersFromOrders = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      if (!map.has(o.email)) {
        map.set(o.email, {
          id: o.email,
          email: o.email,
          name: o.customerName,
          orderCount: 0,
          lastOrder: o.createdAt,
        });
      }
      const c = map.get(o.email);
      c.orderCount += 1;
      if (new Date(o.createdAt) > new Date(c.lastOrder)) c.lastOrder = o.createdAt;
    });
    return Array.from(map.values());
  }, [orders]);

  const customers = useApi ? apiCustomers : customersFromOrders;
  const totalFromOrders = useApi ? apiTotal : customersFromOrders.length;

  const filtered = useMemo(() => {
    let list = customers;
    if (!useApi && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => (c.name && c.name.toLowerCase().includes(q)) || (c.email && c.email.toLowerCase().includes(q)));
    }
    if (!useApi && dateFrom) list = list.filter((c) => c.lastOrder && new Date(c.lastOrder) >= new Date(dateFrom));
    if (!useApi && dateTo) list = list.filter((c) => c.lastOrder && new Date(c.lastOrder) <= new Date(dateTo + 'T23:59:59'));
    return list;
  }, [customers, search, dateFrom, dateTo, useApi]);

  const total = useApi ? apiTotal : filtered.length;
  const totalPages = Math.max(1, Math.ceil((useApi ? apiTotal : filtered.length) / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages);
  const paginated = useMemo(
    () => (useApi ? apiCustomers : filtered.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE)),
    [useApi, apiCustomers, filtered, pageIndex]
  );

  useEffect(() => setPage(1), [search, dateFrom, dateTo]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Customers</h1>
      <div className="mt-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm w-56"
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm" />
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        {loading ? 'Loading…' : `Showing ${total ? (pageIndex - 1) * PAGE_SIZE + 1 : 0}–${Math.min(pageIndex * PAGE_SIZE, total)} of ${total.toLocaleString()}`}
      </p>
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white overflow-hidden flex flex-col max-h-[calc(100vh-16rem)]">
        <div className="overflow-y-auto overflow-x-auto min-h-0 flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Name</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Email</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Orders</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Last order</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <TableSkeleton rows={8} cols={5} /> : paginated.map((c) => (
                <tr key={c.id || c.email} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                  <td className="p-4 font-medium">
                    <Link href={`/admin/customers/${encodeURIComponent(c.id || c.email)}`} className="text-neutral-900 hover:underline">{c.name ?? '—'}</Link>
                  </td>
                  <td className="p-4 text-neutral-600">{c.email ?? '—'}</td>
                  <td className="p-4">{c.orderCount ?? '—'}</td>
                  <td className="p-4 text-neutral-500">{c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : '—'}</td>
                  <td className="p-4">
                    <Link href={`/admin/customers/${encodeURIComponent(c.id || c.email)}`} className="text-neutral-600 hover:text-neutral-900">View</Link>
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
