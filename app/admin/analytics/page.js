'use client';

import Link from '@/components/Link';
import { useMemo, useState, useEffect } from 'react';
import { useAnalyticsStore, useProductsStore } from '@/lib/store';
import { formatAttributionLine, getAttributionFromSessionEvents } from '@/lib/attribution';
import { TableSkeleton, InlineLoader } from '@/components/ui/PageLoader';

const PAGE_SIZE = 50;

/** `datetime-local` is `yyyy-mm-ddThh:mm` (local). Do not append `T23:59:59` to that — it becomes invalid. */
function parseRangeStart(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseRangeEnd(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  if (v.length === 10) {
    const d = new Date(`${v}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function AdminAnalyticsPage() {
  const rawEvents = useAnalyticsStore((s) => s.events);
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const products = useProductsStore((s) => s.products);
  const [mounted, setMounted] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visitorFilter, setVisitorFilter] = useState('all'); // 'all' | 'purchased' | 'not_purchased'
  const [sessionPage, setSessionPage] = useState(1);
  const [visitorPage, setVisitorPage] = useState(1);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const from = parseRangeStart(dateFrom);
    const to = parseRangeEnd(dateTo);
    let list = events;
    if (from) {
      const fromMs = from.getTime();
      list = list.filter((e) => {
        const t = e.timestamp ? new Date(e.timestamp).getTime() : NaN;
        return !Number.isNaN(t) && t >= fromMs;
      });
    }
    if (to) {
      const toMs = to.getTime();
      list = list.filter((e) => {
        const t = e.timestamp ? new Date(e.timestamp).getTime() : NaN;
        return !Number.isNaN(t) && t <= toMs;
      });
    }
    return list;
  }, [events, dateFrom, dateTo]);

  const sessionsList = useMemo(() => {
    const bySession = new Map();
    filtered.forEach((e) => {
      const sid = e.sessionId || 'unknown';
      if (!bySession.has(sid)) {
        bySession.set(sid, {
          sessionId: sid,
          firstSeen: e.timestamp,
          lastSeen: e.timestamp,
          count: 0,
          customerEmail: e.customerEmail,
          customerName: e.customerName,
        });
      }
      const s = bySession.get(sid);
      s.count += 1;
      if (e.timestamp < s.firstSeen) s.firstSeen = e.timestamp;
      if (e.timestamp > s.lastSeen) s.lastSeen = e.timestamp;
      if (e.customerEmail) s.customerEmail = e.customerEmail;
      if (e.customerName) s.customerName = e.customerName;
    });
    return Array.from(bySession.values())
      .map((s) => {
        const evs = filtered.filter((e) => e.sessionId === s.sessionId);
        const attr = getAttributionFromSessionEvents(evs);
        return { ...s, attributionLine: attr ? formatAttributionLine(attr) : '' };
      })
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [filtered]);

  const sessionTotalPages = Math.max(1, Math.ceil(sessionsList.length / PAGE_SIZE));
  const sessionPageIndex = Math.min(sessionPage, sessionTotalPages);
  const paginatedSessions = useMemo(
    () => sessionsList.slice((sessionPageIndex - 1) * PAGE_SIZE, sessionPageIndex * PAGE_SIZE),
    [sessionsList, sessionPageIndex]
  );
  useEffect(() => setSessionPage(1), [dateFrom, dateTo]);

  const loggedInVisitors = useMemo(() => {
    const byEmail = new Map();
    filtered.forEach((e) => {
      const email = e.customerEmail;
      if (!email) return;
      if (!byEmail.has(email)) {
        byEmail.set(email, {
          email,
          name: e.customerName || '—',
          firstSeen: e.timestamp,
          lastSeen: e.timestamp,
          sessionIds: new Set(),
          purchased: false,
        });
      }
      const v = byEmail.get(email);
      v.lastSeen = e.timestamp > v.lastSeen ? e.timestamp : v.lastSeen;
      v.firstSeen = e.timestamp < v.firstSeen ? e.timestamp : v.firstSeen;
      if (e.sessionId) v.sessionIds.add(e.sessionId);
      if (e.type === 'purchase') v.purchased = true;
    });
    return Array.from(byEmail.values())
      .map((v) => {
        const evs = filtered.filter((e) => e.customerEmail === v.email);
        const attr = getAttributionFromSessionEvents(evs);
        return { ...v, sessionCount: v.sessionIds.size, attributionLine: attr ? formatAttributionLine(attr) : '' };
      })
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [filtered]);

  const filteredLoggedInVisitors = useMemo(() => {
    if (visitorFilter === 'all') return loggedInVisitors;
    if (visitorFilter === 'purchased') return loggedInVisitors.filter((v) => v.purchased);
    return loggedInVisitors.filter((v) => !v.purchased);
  }, [loggedInVisitors, visitorFilter]);

  const visitorTotalPages = Math.max(1, Math.ceil(filteredLoggedInVisitors.length / PAGE_SIZE));
  const visitorPageIndex = Math.min(visitorPage, visitorTotalPages);
  const paginatedVisitors = useMemo(
    () => filteredLoggedInVisitors.slice((visitorPageIndex - 1) * PAGE_SIZE, visitorPageIndex * PAGE_SIZE),
    [filteredLoggedInVisitors, visitorPageIndex]
  );
  useEffect(() => setVisitorPage(1), [visitorFilter, dateFrom, dateTo]);

  const visitorCategoryCounts = useMemo(() => {
    const loggedInPurchased = loggedInVisitors.filter((v) => v.purchased).length;
    const loggedInNotPurchased = loggedInVisitors.filter((v) => !v.purchased).length;
    const guestSessions = sessionsList.filter((s) => !s.customerEmail && !s.customerName);
    const guestSessionIds = new Set(guestSessions.map((s) => s.sessionId));
    const purchaseSessionIds = new Set(
      filtered.filter((e) => e.type === 'purchase').map((e) => e.sessionId).filter(Boolean)
    );
    let guestPurchased = 0;
    let guestNotPurchased = 0;
    guestSessionIds.forEach((sid) => {
    if (purchaseSessionIds.has(sid)) guestPurchased += 1;
    else guestNotPurchased += 1;
    });
    return {
      loggedInTotal: loggedInVisitors.length,
      loggedInPurchased,
      loggedInNotPurchased,
      guestTotal: guestSessionIds.size,
      guestPurchased,
      guestNotPurchased,
    };
  }, [loggedInVisitors, sessionsList, filtered]);

  const stats = useMemo(() => {
    const sessions = new Set(filtered.map((e) => e.sessionId).filter(Boolean));
    const sessionsWithPurchase = new Set(
      filtered.filter((e) => e.type === 'purchase').map((e) => e.sessionId).filter(Boolean)
    );
    const dailyVisits = {};
    filtered.forEach((e) => {
      if (e.type !== 'pageView') return;
      const day = e.timestamp.slice(0, 10);
      if (!dailyVisits[day]) dailyVisits[day] = new Set();
      dailyVisits[day].add(e.sessionId);
    });
    const productViews = {};
    filtered.filter((e) => e.type === 'productView').forEach((e) => {
      const id = e.contentId || e.productId || 'unknown';
      productViews[id] = (productViews[id] || 0) + 1;
    });
    const outOfStockClicks = {};
    filtered.filter((e) => e.type === 'outOfStockClick').forEach((e) => {
      const id = e.contentId || e.productId || 'unknown';
      outOfStockClicks[id] = (outOfStockClicks[id] || 0) + 1;
    });
    const addToCarts = filtered.filter((e) => e.type === 'addToCart').length;
    const noPurchaseSessions = [...sessions].filter((s) => !sessionsWithPurchase.has(s)).length;
    return {
      totalSessions: sessions.size,
      sessionsWithPurchase: sessionsWithPurchase.size,
      noPurchaseSessions,
      dailyVisits: Object.entries(dailyVisits).map(([day, set]) => ({ day, count: set.size })).sort((a, b) => b.day.localeCompare(a.day)),
      productViews,
      outOfStockClicks,
      addToCarts,
    };
  }, [filtered]);

  const productContentId = (id) => {
    if (!id || id === 'unknown') return id;
    const p = products.find((x) => x.id === id) || products.find((x) => String(x.advertisingId) === String(id));
    const a = p?.advertisingId != null && String(p.advertisingId).trim();
    return a || p?.id || id;
  };

  if (!mounted) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Visitor analytics</h1>
        <div className="mt-2"><InlineLoader className="py-2" /></div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
              <div className="mt-2 h-8 w-16 rounded bg-neutral-200 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200"><tr><th className="p-4">Sessions</th></tr></thead>
            <tbody><TableSkeleton rows={5} cols={6} /></tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Visitor analytics</h1>
      <p className="mt-1 text-sm text-neutral-500">See how visitors use your site: pages viewed, products seen, cart and orders.</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm" />
        <input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm" />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Total visits</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{stats.totalSessions}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Unique sessions in date range</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Visits that led to order</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{stats.sessionsWithPurchase}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Sessions where customer placed an order</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Visited but did not order</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{stats.noPurchaseSessions}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Left without purchasing</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-500">Items added to cart</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{stats.addToCarts}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Total add-to-cart actions</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium text-neutral-900">Daily visits</h2>
        <p className="text-sm text-neutral-500 mt-0.5">Number of unique visitors per day (by page views).</p>
        <ul className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          {stats.dailyVisits.slice(0, 31).map(({ day, count }) => (
            <li key={day} className="flex justify-between text-sm">
              <span>{day}</span>
              <span className="font-medium">{count} visitors</span>
            </li>
          ))}
          {stats.dailyVisits.length === 0 && <li className="text-neutral-500 text-sm">No data in range</li>}
        </ul>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium text-neutral-900">Product views</h2>
        <p className="text-sm text-neutral-500 mt-0.5">How many times each product page was opened.</p>
        <table className="w-full mt-4 text-sm text-left">
          <thead>
            <tr className="text-neutral-500">
              <th className="pb-2">Product</th>
              <th className="pb-2 text-right">Views</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.productViews)
              .sort((a, b) => b[1] - a[1])
              .map(([id, count]) => (
                <tr key={id} className="border-t border-neutral-100">
                  <td className="py-2">{productContentId(id)}</td>
                  <td className="py-2 text-right">{count}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {Object.keys(stats.productViews).length === 0 && <p className="text-neutral-500 text-sm mt-2">No product views in range</p>}
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium text-neutral-900">Clicks on out-of-stock products</h2>
        <p className="text-sm text-neutral-500 mt-0.5">Visitors who tried to add or view a product that was unavailable.</p>
        <table className="w-full mt-4 text-sm text-left">
          <thead>
            <tr className="text-neutral-500">
              <th className="pb-2">Product</th>
              <th className="pb-2 text-right">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.outOfStockClicks)
              .sort((a, b) => b[1] - a[1])
              .map(([id, count]) => (
                <tr key={id} className="border-t border-neutral-100">
                  <td className="py-2">{productContentId(id)}</td>
                  <td className="py-2 text-right">{count}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {Object.keys(stats.outOfStockClicks).length === 0 && <p className="text-neutral-500 text-sm mt-2">No out-of-stock clicks in range</p>}
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium text-neutral-900">Visitor sessions</h2>
        <p className="text-sm text-neutral-500 mt-0.5">Each row is one visit. Click View to see what pages and products that visitor looked at.</p>
        <p className="mt-2 text-sm text-neutral-500">
          Showing {(sessionPageIndex - 1) * PAGE_SIZE + 1}–{Math.min(sessionPageIndex * PAGE_SIZE, sessionsList.length)} of {sessionsList.length.toLocaleString()}
        </p>
        <div className="mt-4 overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-white border-b border-neutral-200">
              <tr className="text-neutral-500">
                <th className="pb-2 pr-4">Visit</th>
                <th className="pb-2 pr-4">Campaign / ad</th>
                <th className="pb-2 pr-4">First / Last seen</th>
                <th className="pb-2 pr-4">Actions</th>
                <th className="pb-2 pr-4">Visitor (if logged in)</th>
                <th className="pb-2">View</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSessions.map((s) => (
                <tr key={s.sessionId} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-mono text-xs text-neutral-600 truncate max-w-[120px]" title={s.sessionId}>{s.sessionId}</td>
                  <td className="py-3 pr-4 text-xs text-neutral-600 max-w-[200px] truncate" title={s.attributionLine || undefined}>
                    {s.attributionLine || <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="py-3 pr-4 text-neutral-600">
                    {new Date(s.firstSeen).toLocaleString()} — {new Date(s.lastSeen).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">{s.count} actions</td>
                  <td className="py-3 pr-4">
                    {s.customerEmail || s.customerName ? (
                      <span className="text-neutral-900">{s.customerName || '—'} <span className="text-neutral-500">({s.customerEmail || '—'})</span></span>
                    ) : (
                      <span className="text-neutral-400">Guest</span>
                    )}
                  </td>
                  <td className="py-3">
                    <Link href={`/admin/analytics/sessions/${encodeURIComponent(s.sessionId)}`} className="font-medium text-gold-700 hover:text-gold-600">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessionsList.length === 0 && <p className="text-neutral-500 text-sm mt-4">No sessions in range</p>}
        {sessionTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-4 pt-4 border-t border-neutral-100">
            <button type="button" onClick={() => setSessionPage((p) => Math.max(1, p - 1))} disabled={sessionPageIndex <= 1} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-neutral-600">Page {sessionPageIndex} of {sessionTotalPages}</span>
            <button type="button" onClick={() => setSessionPage((p) => Math.min(sessionTotalPages, p + 1))} disabled={sessionPageIndex >= sessionTotalPages} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium text-neutral-900">Visitor categories</h2>
        <p className="text-sm text-neutral-500 mt-0.5">Logged-in users vs guests, and how many in each group placed an order.</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
            <h3 className="text-sm font-semibold text-neutral-700">Logged-in visitors</h3>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{visitorCategoryCounts.loggedInTotal}</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              <li>Purchased: <span className="font-medium text-green-700">{visitorCategoryCounts.loggedInPurchased}</span></li>
              <li>Did not purchase: <span className="font-medium">{visitorCategoryCounts.loggedInNotPurchased}</span></li>
            </ul>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
            <h3 className="text-sm font-semibold text-neutral-700">Guest (not logged in)</h3>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{visitorCategoryCounts.guestTotal}</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              <li>Purchased: <span className="font-medium text-green-700">{visitorCategoryCounts.guestPurchased}</span></li>
              <li>Did not purchase: <span className="font-medium">{visitorCategoryCounts.guestNotPurchased}</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium text-neutral-900">Logged-in visitors</h2>
        <p className="text-sm text-neutral-500 mt-0.5">Customers who signed in. Use filter to see who ordered vs who did not. View shows full profile and activity.</p>
        <div className="mt-4 flex items-center gap-4">
          <label htmlFor="visitor-filter" className="text-sm text-neutral-600">Filter:</label>
          <select
            id="visitor-filter"
            value={visitorFilter}
            onChange={(e) => setVisitorFilter(e.target.value)}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
          >
            <option value="all">All</option>
            <option value="purchased">Purchased</option>
            <option value="not_purchased">Did not purchase</option>
          </select>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Showing {(visitorPageIndex - 1) * PAGE_SIZE + 1}–{Math.min(visitorPageIndex * PAGE_SIZE, filteredLoggedInVisitors.length)} of {filteredLoggedInVisitors.length.toLocaleString()}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-200">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Campaign / ad</th>
                <th className="pb-2 pr-4">Last seen</th>
                <th className="pb-2 pr-4">Sessions</th>
                <th className="pb-2 pr-4">Purchased</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisitors.map((v) => (
                <tr key={v.email} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-medium text-neutral-900">{v.name}</td>
                  <td className="py-3 pr-4 text-neutral-600">{v.email}</td>
                  <td className="py-3 pr-4 text-xs text-neutral-600 max-w-[180px] truncate" title={v.attributionLine || undefined}>
                    {v.attributionLine || <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="py-3 pr-4 text-neutral-600">{new Date(v.lastSeen).toLocaleString()}</td>
                  <td className="py-3 pr-4">{v.sessionCount}</td>
                  <td className="py-3 pr-4">{v.purchased ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-neutral-400">No</span>}</td>
                  <td className="py-3">
                    <Link href={`/admin/analytics/visitors/${encodeURIComponent(v.email)}`} className="font-medium text-gold-700 hover:text-gold-600">View detail</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLoggedInVisitors.length === 0 && <p className="text-neutral-500 text-sm mt-4">No logged-in visitors match the filter</p>}
        {visitorTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-4 pt-4 border-t border-neutral-100">
            <button type="button" onClick={() => setVisitorPage((p) => Math.max(1, p - 1))} disabled={visitorPageIndex <= 1} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-neutral-600">Page {visitorPageIndex} of {visitorTotalPages}</span>
            <button type="button" onClick={() => setVisitorPage((p) => Math.min(visitorTotalPages, p + 1))} disabled={visitorPageIndex >= visitorTotalPages} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
