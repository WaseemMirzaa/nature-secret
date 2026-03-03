'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useAnalyticsStore, useProductsStore, useOrdersStore } from '@/lib/store';
import { getEventLabel } from '@/lib/analytics-labels';

export default function AnalyticsVisitorDetailPage() {
  const params = useParams();
  const rawEmail = params?.email;
  const email = (() => {
    if (Array.isArray(rawEmail)) return decodeURIComponent(rawEmail[0] || '');
    return typeof rawEmail === 'string' ? decodeURIComponent(rawEmail) : '';
  })();
  const events = useAnalyticsStore((s) => s.events);
  const products = useProductsStore((s) => s.products);
  const orders = useOrdersStore((s) => s.orders);
  const [mounted, setMounted] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all'); // 'all' | 'purchases' | 'exclude_purchases'

  useEffect(() => setMounted(true), []);

  const visitorData = useMemo(() => {
    if (!email) return null;
    const visitorEvents = events.filter((e) => e.customerEmail === email);
    if (!visitorEvents.length) return null;
    const first = visitorEvents[visitorEvents.length - 1];
    const last = visitorEvents[0];
    const sessions = new Set(visitorEvents.map((e) => e.sessionId).filter(Boolean));
    const name = visitorEvents.find((e) => e.customerName)?.customerName || '—';
    const purchased = visitorEvents.some((e) => e.type === 'purchase');
    const orderForEmail = orders.find((o) => o.email && o.email.toLowerCase() === email.toLowerCase());
    return {
      name,
      email,
      firstSeen: first.timestamp,
      lastSeen: last.timestamp,
      eventCount: visitorEvents.length,
      sessionCount: sessions.size,
      sessionIds: Array.from(sessions),
      events: visitorEvents,
      purchased,
      phone: orderForEmail?.phone,
      address: orderForEmail?.address,
    };
  }, [events, email, orders]);

  const categoryCounts = useMemo(() => {
    const byEmail = new Map();
    const bySession = new Map();
    events.forEach((e) => {
      const sid = e.sessionId || 'unknown';
      if (!bySession.has(sid)) bySession.set(sid, { sessionId: sid, hasEmail: false, hasPurchase: false });
      const s = bySession.get(sid);
      if (e.customerEmail) s.hasEmail = true;
      if (e.type === 'purchase') s.hasPurchase = true;
      if (e.customerEmail) {
        const em = e.customerEmail;
        if (!byEmail.has(em)) byEmail.set(em, { purchased: false });
        if (e.type === 'purchase') byEmail.get(em).purchased = true;
      }
    });
    const guestSessions = Array.from(bySession.values()).filter((s) => !s.hasEmail);
    const guestPurchased = guestSessions.filter((s) => s.hasPurchase).length;
    const loggedInList = Array.from(byEmail.values());
    return {
      loggedInTotal: loggedInList.length,
      loggedInPurchased: loggedInList.filter((v) => v.purchased).length,
      loggedInNotPurchased: loggedInList.filter((v) => !v.purchased).length,
      guestTotal: guestSessions.length,
      guestPurchased,
      guestNotPurchased: guestSessions.length - guestPurchased,
    };
  }, [events]);

  const visitorEvents = visitorData?.events ?? [];
  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return [...visitorEvents].reverse();
    if (activityFilter === 'purchases') return visitorEvents.filter((e) => e.type === 'purchase').reverse();
    return visitorEvents.filter((e) => e.type !== 'purchase').reverse();
  }, [visitorEvents, activityFilter]);

  const productName = (id) => products.find((p) => p.id === id)?.name || id;

  if (!mounted) {
    return (
      <div>
        <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900">← Analytics</Link>
        <p className="mt-4 text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div>
        <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900">← Analytics</Link>
        <p className="mt-4 text-neutral-500">Invalid visitor.</p>
      </div>
    );
  }

  if (!visitorData) {
    return (
      <div>
        <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900">← Analytics</Link>
        <p className="mt-4 text-neutral-500">No events found for this visitor.</p>
      </div>
    );
  }

  const { name, firstSeen, lastSeen, eventCount, sessionCount, sessionIds, purchased, phone, address } = visitorData;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Analytics</Link>
      <h1 className="text-2xl font-semibold text-neutral-900">Visitor detail</h1>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">Visitor categories (all time)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-neutral-700">Logged-in:</span>{' '}
            {categoryCounts.loggedInTotal} (Purchased: <span className="text-green-700 font-medium">{categoryCounts.loggedInPurchased}</span>, Did not: {categoryCounts.loggedInNotPurchased})
          </div>
          <div>
            <span className="font-medium text-neutral-700">Guest (not logged in):</span>{' '}
            {categoryCounts.guestTotal} (Purchased: <span className="text-green-700 font-medium">{categoryCounts.guestPurchased}</span>, Did not: {categoryCounts.guestNotPurchased})
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-700/90 mb-4">Complete user info</h2>
        <div className="mb-4">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${purchased ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'}`}>
            {purchased ? 'Purchased' : 'Did not purchase'}
          </span>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-neutral-500">Name</dt>
            <dd className="font-medium text-neutral-900 mt-0.5">{name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Email</dt>
            <dd className="font-medium text-neutral-900 mt-0.5">{email}</dd>
          </div>
          {phone != null && phone !== '' && (
            <div>
              <dt className="text-neutral-500">Phone</dt>
              <dd className="text-neutral-700 mt-0.5">{phone}</dd>
            </div>
          )}
          {address != null && address !== '' && (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Address (from orders)</dt>
              <dd className="text-neutral-700 mt-0.5 whitespace-pre-wrap">{address}</dd>
            </div>
          )}
          <div>
            <dt className="text-neutral-500">First seen</dt>
            <dd className="text-neutral-700 mt-0.5">{new Date(firstSeen).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Last seen</dt>
            <dd className="text-neutral-700 mt-0.5">{new Date(lastSeen).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Sessions</dt>
            <dd className="text-neutral-700 mt-0.5">{sessionCount}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Total events</dt>
            <dd className="text-neutral-700 mt-0.5">{eventCount}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">Sessions</h2>
        <ul className="space-y-2">
          {sessionIds.map((sid) => (
            <li key={sid}>
              <Link
                href={`/admin/analytics/sessions/${encodeURIComponent(sid)}`}
                className="text-sm font-medium text-gold-700 hover:text-gold-600 font-mono truncate block max-w-full"
                title={sid}
              >
                {sid}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Activity</h2>
            <p className="text-xs text-neutral-400 mt-0.5">What this visitor did on the site.</p>
          </div>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
          >
            <option value="all">All activity</option>
            <option value="purchases">Orders only</option>
            <option value="exclude_purchases">Exclude orders</option>
          </select>
        </div>
        <ul className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
          {filteredActivity.map((e, i) => {
            const { label, detail } = getEventLabel(e, productName);
            return (
              <li key={i} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium text-neutral-900">{label}</span>
                  {detail && <span className="text-neutral-500 ml-1">— {detail}</span>}
                </div>
                <span className="text-neutral-400 text-xs shrink-0">{new Date(e.timestamp).toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
        {filteredActivity.length === 0 && <p className="p-4 text-neutral-500 text-sm">No activity matches the filter.</p>}
      </div>
    </div>
  );
}
