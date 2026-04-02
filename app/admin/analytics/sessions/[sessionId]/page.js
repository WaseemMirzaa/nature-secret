'use client';

import Link from '@/components/Link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useProductsStore } from '@/lib/store';
import { getEventLabel, formatSessionEventBreakdown } from '@/lib/analytics-labels';
import { formatAttributionLine, getAttributionFromSessionEvents } from '@/lib/attribution';
import { InlineLoader } from '@/components/ui/PageLoader';
import { useAdminAnalyticsEvents } from '@/lib/useAdminAnalyticsEvents';
import { deleteAdminAnalyticsSession } from '@/lib/api';

export default function AnalyticsSessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawSessionId = params?.sessionId;
  const sessionId = typeof rawSessionId === 'string' ? decodeURIComponent(rawSessionId) : '';
  const products = useProductsStore((s) => s.products);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { events, loading, error } = useAdminAnalyticsEvents({
    sessionId: sessionId || undefined,
  });

  useEffect(() => setMounted(true), []);

  const sessionData = useMemo(() => {
    const sessionEvents = events.filter((e) => e.sessionId === sessionId);
    if (!sessionEvents.length) return null;
    const sorted = [...sessionEvents].sort((a, b) =>
      String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const customerEvent = sessionEvents.find((e) => e.customerEmail || e.customerName);
    const customer = customerEvent
      ? { email: customerEvent.customerEmail, name: customerEvent.customerName }
      : null;
    const attribution = getAttributionFromSessionEvents(sessionEvents);
    const sortedAsc = [...sessionEvents].sort((a, b) =>
      String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
    );
    const landingPath =
      sortedAsc.find((e) => e.type === 'pageView' && e.path)?.path ||
      sortedAsc.find((e) => e.path)?.path ||
      '';
    return {
      events: sessionEvents,
      firstSeen: first.timestamp,
      lastSeen: last.timestamp,
      customer,
      attribution,
      attributionLine: attribution ? formatAttributionLine(attribution) : '',
      activitySummary: formatSessionEventBreakdown(sessionEvents),
      landingPath,
    };
  }, [events, sessionId]);

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
        <p className="mt-4 text-red-600 text-sm">Could not load session events.</p>
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

  const { events: sessionEvents, firstSeen, lastSeen, customer, attribution, attributionLine, activitySummary, landingPath } =
    sessionData;

  async function handleDeleteSession() {
    if (!window.confirm('Delete all analytics for this session? Cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteAdminAnalyticsSession(sessionId);
      router.push('/admin/analytics');
    } catch (e) {
      alert(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/analytics" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Analytics</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-neutral-900">Visitor session</h1>
          <p className="mt-1 text-sm text-neutral-500 font-mono truncate max-w-full">{sessionId}</p>
        </div>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDeleteSession}
          className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete session'}
        </button>
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
        <ul className="space-y-2 text-sm text-neutral-600">
          {landingPath ? (
            <li>
              <span className="text-neutral-500">Landing path:</span>{' '}
              <span className="font-mono text-xs text-neutral-800 break-all">{landingPath}</span>
            </li>
          ) : null}
          {attribution ? (
            <li className="space-y-1">
              <span className="text-neutral-500 block">Meta / URL attribution (first touch)</span>
              <dl className="grid gap-2 font-mono text-xs text-neutral-800 pl-0">
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
            </li>
          ) : attributionLine ? (
            <li>
              <span className="text-neutral-500">Campaign / ad:</span>{' '}
              <span className="font-mono text-xs text-neutral-800">{attributionLine}</span>
            </li>
          ) : null}
          {activitySummary ? (
            <li>
              <span className="text-neutral-500">Activity breakdown:</span>{' '}
              <span className="text-neutral-800">{activitySummary}</span>
            </li>
          ) : null}
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
