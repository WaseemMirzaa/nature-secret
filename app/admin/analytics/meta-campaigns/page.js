'use client';

import Link from '@/components/Link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminMetaCampaignAnalytics } from '@/lib/api';
import { InlineLoader } from '@/components/ui/PageLoader';

const TABS = [
  { id: 'adset', label: 'By ad set', hint: 'Best for comparing ad sets', rowsKey: 'byAdset' },
  { id: 'ad', label: 'By ad', hint: 'Creative / ad id level', rowsKey: 'byAd' },
  { id: 'campaign', label: 'By campaign', hint: 'Rollup by campaign', rowsKey: 'byCampaign' },
];

/** Funnel-style columns aligned with Meta + storefront events */
const ACTIVITY_METRICS = [
  { group: 'Traffic', ev: 'uniqueSessions', label: 'Sessions', fromRow: true },
  { group: 'Traffic', ev: 'pageView', label: 'Page views' },
  { group: 'Content', ev: 'productView', label: 'Content views' },
  { group: 'Cart', ev: 'addToCart', label: 'Add to cart' },
  { group: 'Cart', ev: 'addToWishlist', label: 'Wishlist' },
  { group: 'Checkout', ev: 'initiateCheckout', label: 'Checkout started' },
  { group: 'Checkout', ev: 'checkoutPageView', label: 'Checkout page' },
  { group: 'Checkout', ev: 'placeOrderClick', label: 'Place order' },
  { group: 'Checkout', ev: 'orderConfirmationView', label: 'Order seen' },
  { group: 'Purchase', ev: 'purchase', label: 'Purchases' },
];

function cellValue(row, def) {
  if (def.fromRow) return Number(row.uniqueSessions) || 0;
  return Number(row.events?.[def.ev]) || 0;
}

function SortHeader({ label, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-medium text-neutral-700 hover:text-neutral-900 whitespace-nowrap ${
        active ? 'text-neutral-900' : ''
      }`}
    >
      {label}
      {active && <span className="text-gold-600 text-xs">{dir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
}

function MetaActivityTable({ rows, tabId }) {
  const [sortKey, setSortKey] = useState('uniqueSessions');
  const [sortDir, setSortDir] = useState('desc');

  const idCols =
    tabId === 'campaign'
      ? [{ key: 'campaignId', label: 'Campaign ID' }]
      : tabId === 'adset'
        ? [
            { key: 'campaignId', label: 'Campaign ID' },
            { key: 'adsetId', label: 'Ad set ID' },
          ]
        : [
            { key: 'campaignId', label: 'Campaign ID' },
            { key: 'adsetId', label: 'Ad set ID' },
            { key: 'adId', label: 'Ad ID' },
          ];

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'campaignId' || key === 'adsetId' || key === 'adId' ? 'asc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    const list = [...(rows || [])];
    const mult = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'campaignId' || sortKey === 'adsetId' || sortKey === 'adId') {
        const sa = String(a[sortKey] || '');
        const sb = String(b[sortKey] || '');
        return mult * sa.localeCompare(sb);
      }
      if (sortKey === 'uniqueSessions') {
        return mult * ((Number(a.uniqueSessions) || 0) - (Number(b.uniqueSessions) || 0));
      }
      const va = Number(a.events?.[sortKey]) || 0;
      const vb = Number(b.events?.[sortKey]) || 0;
      return mult * (va - vb);
    });
    return list;
  }, [rows, sortKey, sortDir]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[1100px]">
          <thead>
            <tr className="bg-neutral-100/90 border-b border-neutral-200 text-xs text-neutral-600">
              <th colSpan={idCols.length} className="p-2 px-3 font-semibold text-neutral-800 text-left">
                Attribution (URL / Meta ids)
              </th>
              {ACTIVITY_METRICS.reduce((acc, m, i) => {
                const prev = ACTIVITY_METRICS[i - 1];
                const start = i === 0 || prev.group !== m.group;
                if (start) {
                  const count = ACTIVITY_METRICS.filter((x) => x.group === m.group).length;
                  acc.push(
                    <th key={m.group} colSpan={count} className="p-2 px-3 font-semibold text-neutral-800 text-center border-l border-neutral-200">
                      {m.group}
                    </th>,
                  );
                }
                return acc;
              }, [])}
            </tr>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {idCols.map((c) => (
                <th key={c.key} className="p-3 font-medium text-neutral-700 align-bottom">
                  <SortHeader label={c.label} active={sortKey === c.key} dir={sortDir} onClick={() => toggleSort(c.key)} />
                </th>
              ))}
              {ACTIVITY_METRICS.map((m, idx) => {
                const sk = m.fromRow ? 'uniqueSessions' : m.ev;
                const border = idx === 0 || ACTIVITY_METRICS[idx - 1].group !== m.group ? 'border-l border-neutral-200' : '';
                return (
                  <th key={m.fromRow ? 'sess' : m.ev} className={`p-3 text-right align-bottom ${border}`}>
                    <div className="flex justify-end">
                      <SortHeader label={m.label} active={sortKey === sk} dir={sortDir} onClick={() => toggleSort(sk)} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={idCols.length + ACTIVITY_METRICS.length} className="p-8 text-center text-neutral-500">
                  No attributed activity in this date range. Ensure ad URLs include campaign_id, adset_id, ad_id (or UTM fallbacks).
                </td>
              </tr>
            )}
            {sorted.map((row, i) => (
              <tr key={i} className="border-t border-neutral-100 hover:bg-amber-50/40">
                {idCols.map((c) => (
                  <td key={c.key} className="p-3 font-mono text-xs text-neutral-900 max-w-[200px] align-top">
                    <span className="block truncate" title={row[c.key] || ''}>
                      {row[c.key] ? row[c.key] : '—'}
                    </span>
                  </td>
                ))}
                {ACTIVITY_METRICS.map((m, idx) => {
                  const v = cellValue(row, m);
                  const border = idx === 0 || ACTIVITY_METRICS[idx - 1].group !== m.group ? 'border-l border-neutral-100' : '';
                  return (
                    <td key={m.fromRow ? 'sess' : m.ev} className={`p-3 text-right tabular-nums text-neutral-800 font-medium ${border}`}>
                      {v.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminMetaCampaignsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tab, setTab] = useState('adset');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminMetaCampaignAnalytics({
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      setData(res);
    } catch (e) {
      setError(e?.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];
  const tableRows = data?.[activeTab.rowsKey] || [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Meta ad activity</h1>
          <p className="mt-1 text-sm text-neutral-500 max-w-2xl">
            Funnel metrics by campaign, ad set, or ad (from URL attribution). Use tabs to change grain; click column headers to sort.
          </p>
        </div>
        <Link href="/admin/analytics" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
          ← Visitor analytics
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 items-center">
        <input
          type="datetime-local"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm"
        />
        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 min-h-[44px]"
        >
          Refresh
        </button>
        {loading && <InlineLoader className="py-2" />}
      </div>

      {data?.from && data?.to && (
        <p className="mt-2 text-xs text-neutral-400">
          Range: {new Date(data.from).toLocaleString()} — {new Date(data.to).toLocaleString()}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {data && !error && (
        <>
          <div className="mt-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] ${
                  tab === t.id
                    ? 'bg-white text-neutral-900 border border-b-0 border-neutral-200 -mb-px shadow-[0_-1px_0_0_white]'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">{activeTab.hint}</p>
          <div className="mt-4">
            <MetaActivityTable key={tab} rows={tableRows} tabId={tab} />
          </div>
        </>
      )}
    </div>
  );
}
