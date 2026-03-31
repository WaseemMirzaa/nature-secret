'use client';

import Link from '@/components/Link';
import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useAnalyticsStore, useProductsStore } from '@/lib/store';
import { getEventLabel } from '@/lib/analytics-labels';
import { InlineLoader } from '@/components/ui/PageLoader';

export default function AnalyticsSessionDetailPage() {
  const params = useParams();
  const rawSessionId = params?.sessionId;
  const sessionId = typeof rawSessionId === 'string' ? decodeURIComponent(rawSessionId) : '';
  const events = useAnalyticsStore((s) => s.events);
  const products = useProductsStore((s) => s.products);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const sessionData = useMemo(() => {
    const sessionEvents = events.filter((e) => e.sessionId === sessionId);
    if (!sessionEvents.length) return null;
    const first = sessionEvents[sessionEvents.length - 1];
    const last = sessionEvents[0];
    const customerEvent = sessionEvents.find((e) => e.customerEmail || e.customerName);
    const customer = customerEvent
      ? { email: customerEvent.customerEmail, name: customerEvent.customerName }
      : null;
    return {
      events: sessionEvents,
      firstSeen: first.timestamp,
      lastSeen: last.timestamp,
      customer,
    };
  }, [events, sessionId]);

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

  const productContentId = (id) => {
    if (!id) return id;
    const p = products.find((x) => x.id === id) || products.find((x) => String(x.advertisingId) === String(id));
    const a = p?.advertisingId != null && String(p.advertisingId).trim();
    return a || p?.id || id;
  };

  if (!mounted) {
    return (
      <div>
        <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900">← Analytics</Link>
        <div className="mt-4"><InlineLoader /></div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div>
        <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900">← Analytics</Link>
        <p className="mt-4 text-neutral-500">Invalid session.</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div>
        <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900">← Analytics</Link>
        <p className="mt-4 text-neutral-500">Session not found or no events in range.</p>
      </div>
    );
  }

  const { events: sessionEvents, firstSeen, lastSeen, customer } = sessionData;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Analytics</Link>
      <h1 className="text-2xl font-semibold text-neutral-900">Visitor session</h1>
      <p className="mt-1 text-sm text-neutral-500 font-mono truncate max-w-full">{sessionId}</p>

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

      {customer && (
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-700/90 mb-3">Logged-in visitor</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-neutral-500">Name</dt>
              <dd className="font-medium text-neutral-900">{customer.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Email</dt>
              <dd className="font-medium text-neutral-900">{customer.email || '—'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-neutral-400">Complete user info for this visitor (from customer account).</p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">Visit summary</h2>
        <ul className="space-y-1 text-sm text-neutral-600">
          <li>First seen: {new Date(firstSeen).toLocaleString()}</li>
          <li>Last seen: {new Date(lastSeen).toLocaleString()}</li>
          <li>Actions in this visit: {sessionEvents.length}</li>
        </ul>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <h2 className="p-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100">Activity</h2>
        <p className="px-4 pb-3 text-xs text-neutral-400">Chronological list of what this visitor did on the site.</p>
        <ul className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
          {[...sessionEvents].reverse().map((e, i) => {
            const { label, detail } = getEventLabel(e, productContentId);
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
      </div>
    </div>
  );
}
