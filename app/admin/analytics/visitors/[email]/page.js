'use client';

import Link from '@/components/Link';
import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useProductsStore, useOrdersStore } from '@/lib/store';
import { getEventLabel } from '@/lib/analytics-labels';
import { formatAttributionLine, getAttributionFromSessionEvents } from '@/lib/attribution';
import { InlineLoader } from '@/components/ui/PageLoader';
import { useAdminAnalyticsEvents } from '@/lib/useAdminAnalyticsEvents';

export default function AnalyticsVisitorDetailPage() {
  const params = useParams();
  const rawEmail = params?.email;
  const email = (() => {
    if (Array.isArray(rawEmail)) return decodeURIComponent(rawEmail[0] || '');
    return typeof rawEmail === 'string' ? decodeURIComponent(rawEmail) : '';
  })();
  const products = useProductsStore((s) => s.products);
  const orders = useOrdersStore((s) => s.orders);
  const [mounted, setMounted] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all'); // 'all' | 'purchases' | 'exclude_purchases'

  const { events, loading, error } = useAdminAnalyticsEvents({
    email: email || undefined,
  });

  useEffect(() => setMounted(true), []);

  const visitorData = useMemo(() => {
    if (!email) return null;
    const visitorEvents = events.filter(
      (e) => e.customerEmail && e.customerEmail.toLowerCase() === email.toLowerCase(),
    );
    if (!visitorEvents.length) return null;
    const sorted = [...visitorEvents].sort((a, b) =>
      String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const sessions = new Set(visitorEvents.map((e) => e.sessionId).filter(Boolean));
    const name = visitorEvents.find((e) => e.customerName)?.customerName || '—';
    const purchased = visitorEvents.some((e) => e.type === 'purchase');
    const orderForEmail = orders.find((o) => o.email && o.email.toLowerCase() === email.toLowerCase());
    const attribution = getAttributionFromSessionEvents(visitorEvents);
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
      attribution,
      attributionLine: attribution ? formatAttributionLine(attribution) : '',
    };
  }, [events, email, orders]);

  const filteredActivity = useMemo(() => {
    const visitorEvents = visitorData?.events ?? [];
    if (activityFilter === 'all') return [...visitorEvents].reverse();
    if (activityFilter === 'purchases') return visitorEvents.filter((e) => e.type === 'purchase').reverse();
    return visitorEvents.filter((e) => e.type !== 'purchase').reverse();
  }, [visitorData, activityFilter]);

  const productContentId = (id) => {
    if (!id) return id;
    const p = products.find((x) => x.id === id) || products.find((x) => String(x.advertisingId) === String(id));
    const a = p?.advertisingId != null && String(p.advertisingId).trim();
    return a || p?.id || id;
  };

  if (!mounted || (loading && events.length === 0)) {
    return (
      <div>
        <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900">← Analytics</Link>
        <div className="mt-4"><InlineLoader /></div>
      </div>
    );
  }

  if (!loading && error) {
    return (
      <div>
        <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900">← Analytics</Link>
        <p className="mt-4 text-red-600 text-sm">Could not load visitor events.</p>
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

  const { name, firstSeen, lastSeen, eventCount, sessionCount, sessionIds, purchased, phone, address, attribution, attributionLine } =
    visitorData;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Analytics</Link>
      <h1 className="text-2xl font-semibold text-neutral-900">Visitor detail</h1>

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
          {attribution ? (
            <div className="sm:col-span-2">
              <p className="text-sm text-neutral-500">Meta / URL attribution (first-touch)</p>
              <dl className="mt-2 grid gap-2 font-mono text-xs text-neutral-800">
                <div>
                  <dt className="text-neutral-400 font-sans text-[10px] uppercase">Campaign ID</dt>
                  <dd className="break-all">{attribution.campaignId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-400 font-sans text-[10px] uppercase">Ad set ID</dt>
                  <dd className="break-all">{attribution.adsetId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-400 font-sans text-[10px] uppercase">Ad ID</dt>
                  <dd className="break-all">{attribution.adId || '—'}</dd>
                </div>
              </dl>
            </div>
          ) : attributionLine ? (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Campaign / ad (first-touch)</dt>
              <dd className="text-neutral-800 mt-0.5 font-mono text-xs break-all">{attributionLine}</dd>
            </div>
          ) : null}
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
        {filteredActivity.length === 0 && <p className="p-4 text-neutral-500 text-sm">No activity matches the filter.</p>}
      </div>
    </div>
  );
}
