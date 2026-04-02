'use client';

import Link from '@/components/Link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminMetaCampaignAnalytics, getAdminMetaPurchaseExport } from '@/lib/api';
import { InlineLoader } from '@/components/ui/PageLoader';

const TABS = [
  { id: 'adset', label: 'By ad set', hint: 'Check rows to narrow other tabs (intersection)', rowsKey: 'byAdset' },
  { id: 'ad', label: 'By ad', hint: 'Creative / ad id — picks filter campaigns & ad sets too', rowsKey: 'byAd' },
  { id: 'campaign', label: 'By campaign', hint: 'Pick campaigns to limit ad sets & ads', rowsKey: 'byCampaign' },
];

/** Composite keys (tab is unlikely in Meta numeric ids). */
const K = '\t';
function adsetKeyRow(r) {
  return `${String(r.campaignId || '')}${K}${String(r.adsetId || '')}`;
}
function adKeyRow(r) {
  return `${String(r.campaignId || '')}${K}${String(r.adsetId || '')}${K}${String(r.adId || '')}`;
}

function campaignRowVisible(row, pickC, pickA, pickD) {
  const cid = String(row.campaignId || '');
  if (pickC.size && !pickC.has(cid)) return false;
  if (pickA.size && ![...pickA].some((k) => k.startsWith(cid + K))) return false;
  if (pickD.size && ![...pickD].some((k) => k.startsWith(cid + K))) return false;
  return true;
}

function adsetRowVisible(row, pickC, pickA, pickD) {
  const cid = String(row.campaignId || '');
  const ak = adsetKeyRow(row);
  if (pickA.size && !pickA.has(ak)) return false;
  if (pickC.size && !pickC.has(cid)) return false;
  if (pickD.size && ![...pickD].some((k) => k.startsWith(ak + K))) return false;
  return true;
}

function adRowVisible(row, pickC, pickA, pickD) {
  const cid = String(row.campaignId || '');
  const ak = adsetKeyRow(row);
  const dk = adKeyRow(row);
  if (pickD.size && !pickD.has(dk)) return false;
  if (pickA.size && !pickA.has(ak)) return false;
  if (pickC.size && !pickC.has(cid)) return false;
  return true;
}

/** Funnel-style columns aligned with Meta + storefront events */
const ACTIVITY_METRICS = [
  { group: 'Traffic', ev: 'uniqueSessions', label: 'Sessions', fromRow: true },
  { group: 'Traffic', ev: 'pageView', label: 'Page views' },
  { group: 'Contact', ev: 'whatsappOpen', label: 'WhatsApp opened' },
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

function csvEscape(val) {
  const s = val == null ? '' : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** @param {{ key: string, header: string }[]} columns */
function rowsToCsv(columns, rows) {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(','));
  return `\uFEFF${[header, ...lines].join('\n')}`;
}

function triggerCsvDownload(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const META_ACT_STORAGE = 'ns_meta_act_id';

/** Deep link into Meta Ads Manager (same IDs as URL attribution / tested ads). */
function metaAdsManagerUrl(level, id, actId) {
  const trimmed = String(id || '').trim();
  if (!trimmed) return null;
  const act = String(actId || '').replace(/\D/g, '');
  const paths = {
    campaign: 'campaigns',
    adset: 'adsets',
    ad: 'ads',
  };
  const paramKeys = {
    campaign: 'selected_campaign_ids',
    adset: 'selected_adset_ids',
    ad: 'selected_ad_ids',
  };
  const path = paths[level];
  const pk = paramKeys[level];
  if (!path || !pk) return null;
  const base = `https://business.facebook.com/adsmanager/manage/${path}`;
  const q = new URLSearchParams();
  if (act) q.set('act', act);
  q.set(pk, trimmed);
  return `${base}?${q}`;
}

function toDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setDatePresetDays(setFrom, setTo, days) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  setTo(toDatetimeLocal(end));
  setFrom(toDatetimeLocal(start));
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

function formatAvg(total, rowCount) {
  if (!rowCount || rowCount < 1) return '—';
  const x = Number(total) / rowCount;
  if (!Number.isFinite(x)) return '—';
  return x < 10 ? x.toFixed(2) : x.toFixed(1);
}

/** Grand totals for filtered date range + averages per visible table rows. */
function MetaFilterSummary({ summary, tabId, displayedRowCount, scopedRowCount, hasCheckboxFilter }) {
  if (!summary) return null;
  const rowKey =
    tabId === 'campaign' ? 'rowCountCampaign' : tabId === 'adset' ? 'rowCountAdset' : 'rowCountAd';
  const nFull = Number(summary[rowKey]) || 0;
  const n = typeof displayedRowCount === 'number' ? displayedRowCount : nFull;
  const nScoped = typeof scopedRowCount === 'number' ? scopedRowCount : n;
  const ev = summary.events || {};

  return (
    <div className="mt-6 rounded-2xl border border-gold-200/60 bg-gradient-to-br from-amber-50/80 to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900">Totals & averages</h2>
        <p className="text-xs text-neutral-500">
          <span className="font-medium text-neutral-700">{n}</span> row{n === 1 ? '' : 's'} in table
          {n < nScoped ? (
            <span className="text-neutral-400"> (of {nScoped} after checkbox picks)</span>
          ) : null}
          {hasCheckboxFilter && nScoped < nFull ? (
            <span className="text-neutral-400"> · {nFull} in range for this tab</span>
          ) : null}
          {' · '}
          Sessions = distinct visitors in range (full data)
        </p>
      </div>
      <p className="text-[11px] text-neutral-500 mt-1 max-w-3xl">
        Counts below are server totals for your date range and ID filters. “Avg/row” uses visible rows (checkbox picks + table filters).
      </p>
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
        <div className="min-w-[130px] flex-1 rounded-xl border border-neutral-200/80 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">Distinct sessions</p>
          <p className="text-lg font-semibold tabular-nums text-neutral-900">{Number(summary.uniqueSessions || 0).toLocaleString()}</p>
        </div>
        {ACTIVITY_METRICS.filter((m) => !m.fromRow).map((m) => {
          const t = Number(ev[m.ev]) || 0;
          return (
            <div
              key={m.ev}
              className="min-w-[120px] flex-1 rounded-xl border border-neutral-200/80 bg-white px-3 py-2.5 shadow-sm"
            >
              <p className="text-[10px] uppercase tracking-wide text-neutral-500 leading-tight">{m.label}</p>
              <p className="text-lg font-semibold tabular-nums text-neutral-900">{t.toLocaleString()}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Avg/row {formatAvg(t, n)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetaActivityTable({
  rows,
  tabId,
  pickKind,
  pickKeyFn,
  pickedSet,
  onTogglePick,
  metaActId,
}) {
  const [sortKey, setSortKey] = useState('uniqueSessions');
  const [sortDir, setSortDir] = useState('desc');

  const idCols =
    tabId === 'campaign'
      ? [{ key: 'campaignId', label: 'Campaign ID', metaLevel: 'campaign' }]
      : tabId === 'adset'
        ? [
            { key: 'campaignId', label: 'Campaign ID', metaLevel: 'campaign' },
            { key: 'adsetId', label: 'Ad set ID', metaLevel: 'adset' },
          ]
        : [
            { key: 'campaignId', label: 'Campaign ID', metaLevel: 'campaign' },
            { key: 'adsetId', label: 'Ad set ID', metaLevel: 'adset' },
            { key: 'adId', label: 'Ad ID', metaLevel: 'ad' },
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
              <th className="p-2 px-2 w-10 font-semibold text-neutral-800 text-center border-r border-neutral-200/80">
                Pick
              </th>
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
              <th className="p-2 w-10 border-r border-neutral-100 align-bottom" aria-label="Select rows" />
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
                <td colSpan={idCols.length + ACTIVITY_METRICS.length + 1} className="p-8 text-center text-neutral-500">
                  No rows match your checkbox selection and filters, or no data in range. Clear picks or widen ID filters.
                </td>
              </tr>
            )}
            {sorted.map((row, i) => {
              const pk = pickKeyFn ? pickKeyFn(row) : '';
              const checked = pk && pickedSet && pickedSet.has(pk);
              return (
              <tr key={pk || i} className="border-t border-neutral-100 hover:bg-amber-50/40">
                <td className="p-2 text-center align-top border-r border-neutral-100">
                  {pickKeyFn ? (
                    pk ? (
                      <input
                        type="checkbox"
                        checked={!!checked}
                        onChange={() => onTogglePick(pk)}
                        className="h-4 w-4 rounded border-neutral-300 text-gold-600 focus:ring-gold-500"
                        aria-label={`${pickKind} ${pk}`}
                      />
                    ) : (
                      <span className="text-neutral-300 text-xs">—</span>
                    )
                  ) : null}
                </td>
                {idCols.map((c) => {
                  const raw = row[c.key];
                  const href = c.metaLevel && raw ? metaAdsManagerUrl(c.metaLevel, raw, metaActId) : null;
                  return (
                    <td key={c.key} className="p-3 font-mono text-xs text-neutral-900 max-w-[220px] align-top">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className="block truncate flex-1 min-w-0" title={raw || ''}>
                          {raw ? raw : '—'}
                        </span>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-[10px] font-sans font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2"
                            title="Open in Meta Ads Manager"
                          >
                            Ads
                          </a>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminMetaCampaignsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterAdset, setFilterAdset] = useState('');
  const [filterAd, setFilterAd] = useState('');
  /** IDs sent to API (update via Apply so typing does not refetch every keystroke). */
  const [appliedIds, setAppliedIds] = useState({ campaignId: '', adsetId: '', adId: '' });
  const [metaActId, setMetaActId] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [minSessions, setMinSessions] = useState('');
  const [minPurchases, setMinPurchases] = useState('');
  const [onlyWithPurchases, setOnlyWithPurchases] = useState(false);
  const [hideZeroSessions, setHideZeroSessions] = useState(false);
  const [tab, setTab] = useState('adset');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(META_ACT_STORAGE);
      if (v) setMetaActId(v);
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(META_ACT_STORAGE, metaActId);
    } catch (_) {}
  }, [metaActId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminMetaCampaignAnalytics({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        campaignId: appliedIds.campaignId || undefined,
        adsetId: appliedIds.adsetId || undefined,
        adId: appliedIds.adId || undefined,
      });
      setData(res);
    } catch (e) {
      setError(e?.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, appliedIds]);

  useEffect(() => {
    load();
  }, [load]);

  const [pickCampaigns, setPickCampaigns] = useState(() => new Set());
  const [pickAdsets, setPickAdsets] = useState(() => new Set());
  const [pickAds, setPickAds] = useState(() => new Set());

  useEffect(() => {
    if (!data) return;
    setPickCampaigns(new Set());
    setPickAdsets(new Set());
    setPickAds(new Set());
  }, [data]);

  const toggleCampaignPick = useCallback((id) => {
    setPickCampaigns((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleAdsetPick = useCallback((key) => {
    setPickAdsets((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }, []);

  const toggleAdPick = useCallback((key) => {
    setPickAds((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }, []);

  const filteredByCampaign = useMemo(
    () => (data?.byCampaign || []).filter((r) => campaignRowVisible(r, pickCampaigns, pickAdsets, pickAds)),
    [data?.byCampaign, pickCampaigns, pickAdsets, pickAds],
  );
  const filteredByAdset = useMemo(
    () => (data?.byAdset || []).filter((r) => adsetRowVisible(r, pickCampaigns, pickAdsets, pickAds)),
    [data?.byAdset, pickCampaigns, pickAdsets, pickAds],
  );
  const filteredByAd = useMemo(
    () => (data?.byAd || []).filter((r) => adRowVisible(r, pickCampaigns, pickAdsets, pickAds)),
    [data?.byAd, pickCampaigns, pickAdsets, pickAds],
  );

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];
  const scopedRows =
    tab === 'campaign' ? filteredByCampaign : tab === 'adset' ? filteredByAdset : filteredByAd;

  const displayRows = useMemo(() => {
    let rows = scopedRows;
    const q = tableSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const c = String(r.campaignId || '').toLowerCase();
        const a = String(r.adsetId || '').toLowerCase();
        const d = String(r.adId || '').toLowerCase();
        return c.includes(q) || a.includes(q) || d.includes(q);
      });
    }
    const ms = parseInt(minSessions, 10);
    if (Number.isFinite(ms) && ms > 0) {
      rows = rows.filter((r) => (Number(r.uniqueSessions) || 0) >= ms);
    }
    const mp = parseInt(minPurchases, 10);
    if (Number.isFinite(mp) && mp > 0) {
      rows = rows.filter((r) => (Number(r.events?.purchase) || 0) >= mp);
    }
    if (onlyWithPurchases) {
      rows = rows.filter((r) => (Number(r.events?.purchase) || 0) > 0);
    }
    if (hideZeroSessions) {
      rows = rows.filter((r) => (Number(r.uniqueSessions) || 0) > 0);
    }
    return rows;
  }, [scopedRows, tableSearch, minSessions, minPurchases, onlyWithPurchases, hideZeroSessions]);

  const hasCheckboxFilter = pickCampaigns.size > 0 || pickAdsets.size > 0 || pickAds.size > 0;

  const tablePickProps =
    tab === 'campaign'
      ? {
          pickKind: 'Campaign',
          pickKeyFn: (r) => String(r.campaignId || ''),
          pickedSet: pickCampaigns,
          onTogglePick: toggleCampaignPick,
        }
      : tab === 'adset'
        ? {
            pickKind: 'Ad set',
            pickKeyFn: adsetKeyRow,
            pickedSet: pickAdsets,
            onTogglePick: toggleAdsetPick,
          }
        : {
            pickKind: 'Ad',
            pickKeyFn: adKeyRow,
            pickedSet: pickAds,
            onTogglePick: toggleAdPick,
          };

  const handleExportPurchases = useCallback(async () => {
    setExportBusy(true);
    try {
      const res = await getAdminMetaPurchaseExport({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        campaignId: appliedIds.campaignId || undefined,
        adsetId: appliedIds.adsetId || undefined,
        adId: appliedIds.adId || undefined,
      });
      let rows = Array.isArray(res.rows) ? res.rows : [];
      if (pickCampaigns.size > 0 || pickAdsets.size > 0 || pickAds.size > 0) {
        rows = rows.filter((r) =>
          adRowVisible(
            { campaignId: r.campaignId, adsetId: r.adsetId, adId: r.adId },
            pickCampaigns,
            pickAdsets,
            pickAds,
          ),
        );
      }
      const columns = [
        { key: 'timestamp', header: 'Timestamp (UTC)' },
        { key: 'sessionId', header: 'Session ID' },
        { key: 'orderId', header: 'Order ID' },
        { key: 'campaignId', header: 'Campaign ID' },
        { key: 'adsetId', header: 'Ad set ID' },
        { key: 'adId', header: 'Ad ID' },
        { key: 'customerName', header: 'Customer name' },
        { key: 'customerEmail', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'orderValue', header: 'Order value (from analytics)' },
        { key: 'whatsappOpensBeforePurchase', header: 'WhatsApp opens (same session, before purchase)' },
        { key: 'whatsappOpenSources', header: 'WhatsApp open sources (floating/footer/contact)' },
      ];
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      triggerCsvDownload(`meta-attributed-purchases-${stamp}.csv`, rowsToCsv(columns, rows));
    } catch (e) {
      alert(e?.message || 'Export failed');
    } finally {
      setExportBusy(false);
    }
  }, [dateFrom, dateTo, appliedIds, pickCampaigns, pickAdsets, pickAds]);

  const handleExportActivityTable = useCallback(() => {
    const metricsCols = ACTIVITY_METRICS.filter((m) => !m.fromRow).map((m) => ({ key: m.ev, header: m.label }));
    const idCols =
      tab === 'campaign'
        ? [{ key: 'campaignId', header: 'Campaign ID' }]
        : tab === 'adset'
          ? [
              { key: 'campaignId', header: 'Campaign ID' },
              { key: 'adsetId', header: 'Ad set ID' },
            ]
          : [
              { key: 'campaignId', header: 'Campaign ID' },
              { key: 'adsetId', header: 'Ad set ID' },
              { key: 'adId', header: 'Ad ID' },
            ];
    const columns = [...idCols, { key: 'uniqueSessions', header: 'Distinct sessions' }, ...metricsCols];
    const rows = displayRows.map((row) => {
      const o = {
        campaignId: row.campaignId || '',
        adsetId: row.adsetId || '',
        adId: row.adId || '',
        uniqueSessions: row.uniqueSessions ?? 0,
      };
      for (const m of ACTIVITY_METRICS) {
        if (!m.fromRow) o[m.ev] = row.events?.[m.ev] ?? 0;
      }
      return o;
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    triggerCsvDownload(`meta-activity-${tab}-${stamp}.csv`, rowsToCsv(columns, rows));
  }, [tab, displayRows]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Meta ad activity</h1>
          <p className="mt-1 text-sm text-neutral-500 max-w-2xl">
            Use checkboxes on any tab to narrow the others (empty = no constraint). Picks combine with AND across campaign / ad set / ad.
          </p>
        </div>
        <Link href="/admin/analytics" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
          ← Visitor analytics
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">From</label>
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">To</label>
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 items-end pb-0.5">
          <span className="text-[10px] text-neutral-400 w-full mb-0.5">Presets</span>
          {[
            { d: 7, l: '7d' },
            { d: 30, l: '30d' },
            { d: 90, l: '90d' },
          ].map(({ d, l }) => (
            <button
              key={l}
              type="button"
              onClick={() => setDatePresetDays(setDateFrom, setDateTo, d)}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 min-h-[44px]"
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={exportBusy || loading}
          onClick={handleExportPurchases}
          className="rounded-xl border border-gold-400/70 bg-gold-50/90 text-gold-950 px-4 py-2 text-sm font-medium hover:bg-gold-100 min-h-[44px] disabled:opacity-50"
        >
          {exportBusy ? 'Exporting…' : 'Export purchases (CSV)'}
        </button>
        <button
          type="button"
          disabled={loading || displayRows.length === 0}
          onClick={handleExportActivityTable}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 min-h-[44px] disabled:opacity-50"
        >
          Export this table (CSV)
        </button>
        {loading && <InlineLoader className="py-2" />}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Purchase CSV: email/phone from the order when <code className="text-[11px] bg-neutral-100 px-1 rounded">orderId</code> matches; respects date, ID, and checkbox filters. Table CSV = current tab rows.
      </p>

      <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-neutral-600 mb-2">API / server filters (exact id match — same ids as Meta URL params & Ads Manager)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[160px] flex-1 max-w-xs">
              <label className="block text-xs text-neutral-500 mb-1">Campaign ID</label>
              <input
                type="text"
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                placeholder="e.g. 120245605193630400"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="min-w-[160px] flex-1 max-w-xs">
              <label className="block text-xs text-neutral-500 mb-1">Ad set ID</label>
              <input
                type="text"
                value={filterAdset}
                onChange={(e) => setFilterAdset(e.target.value)}
                placeholder="e.g. 120245605560330400"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="min-w-[160px] flex-1 max-w-xs">
              <label className="block text-xs text-neutral-500 mb-1">Ad ID</label>
              <input
                type="text"
                value={filterAd}
                onChange={(e) => setFilterAd(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="min-w-[140px] flex-1 max-w-[200px]">
              <label className="block text-xs text-neutral-500 mb-1">Meta ad account ID (optional)</label>
              <input
                type="text"
                inputMode="numeric"
                value={metaActId}
                onChange={(e) => setMetaActId(e.target.value.replace(/\D/g, '').slice(0, 20))}
                placeholder="For Ads links"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setAppliedIds({
                  campaignId: filterCampaign.trim(),
                  adsetId: filterAdset.trim(),
                  adId: filterAd.trim(),
                })
              }
              className="rounded-xl bg-neutral-800 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-700 min-h-[44px]"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterCampaign('');
                setFilterAdset('');
                setFilterAd('');
                setAppliedIds({ campaignId: '', adsetId: '', adId: '' });
              }}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 min-h-[44px]"
            >
              Clear
            </button>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 max-w-3xl">
            Use the numeric ids from your tested/live campaigns in Ads Manager (or from <code className="text-[10px] bg-white px-1 rounded border border-neutral-200">utm</code> / fbclid landing URLs). Each row’s <strong className="font-medium">Ads</strong> link opens that entity in Business Suite when ad account id is set.
          </p>
        </div>
        <div className="border-t border-neutral-200 pt-4">
          <p className="text-xs font-medium text-neutral-600 mb-2">Table filters (this browser only — refine rows after load)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[200px] flex-1 max-w-md">
              <label className="block text-xs text-neutral-500 mb-1">Search ids (contains)</label>
              <input
                type="search"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Substring in campaign / ad set / ad id"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="w-[100px]">
              <label className="block text-xs text-neutral-500 mb-1">Min sessions</label>
              <input
                type="number"
                min={0}
                value={minSessions}
                onChange={(e) => setMinSessions(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="w-[110px]">
              <label className="block text-xs text-neutral-500 mb-1">Min purchases</label>
              <input
                type="number"
                min={0}
                value={minPurchases}
                onChange={(e) => setMinPurchases(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer pb-1">
              <input
                type="checkbox"
                checked={onlyWithPurchases}
                onChange={(e) => setOnlyWithPurchases(e.target.checked)}
                className="rounded border-neutral-300 text-gold-600"
              />
              Purchases only
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer pb-1">
              <input
                type="checkbox"
                checked={hideZeroSessions}
                onChange={(e) => setHideZeroSessions(e.target.checked)}
                className="rounded border-neutral-300 text-gold-600"
              />
              Hide 0 sessions
            </label>
            <button
              type="button"
              onClick={() => {
                setTableSearch('');
                setMinSessions('');
                setMinPurchases('');
                setOnlyWithPurchases(false);
                setHideZeroSessions(false);
              }}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 min-h-[44px]"
            >
              Reset table filters
            </button>
          </div>
        </div>
      </div>

      {data?.from && data?.to && (
        <p className="mt-2 text-xs text-neutral-400">
          Range: {new Date(data.from).toLocaleString()} — {new Date(data.to).toLocaleString()}
          {data.filters &&
          (data.filters.campaignId || data.filters.adsetId || data.filters.adId) ? (
            <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0 text-neutral-500">
              · Active filters:{' '}
              {[data.filters.campaignId && `campaign=${data.filters.campaignId}`, data.filters.adsetId && `adset=${data.filters.adsetId}`, data.filters.adId && `ad=${data.filters.adId}`]
                .filter(Boolean)
                .join(' · ')}
            </span>
          ) : null}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {data && !error && (
        <>
          {data.summary ? (
            <MetaFilterSummary
              summary={data.summary}
              tabId={tab}
              displayedRowCount={displayRows.length}
              scopedRowCount={scopedRows.length}
              hasCheckboxFilter={hasCheckboxFilter}
            />
          ) : null}
          {hasCheckboxFilter ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-xs text-neutral-600">
                Checkbox filter: {pickCampaigns.size} campaign(s), {pickAdsets.size} ad set(s), {pickAds.size} ad(s)
              </p>
              <button
                type="button"
                onClick={() => {
                  setPickCampaigns(new Set());
                  setPickAdsets(new Set());
                  setPickAds(new Set());
                }}
                className="text-xs font-medium text-gold-800 hover:text-gold-700 border-b border-gold-500/50"
              >
                Clear all picks
              </button>
            </div>
          ) : null}
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
            <MetaActivityTable
              key={tab}
              rows={displayRows}
              tabId={tab}
              metaActId={metaActId}
              {...tablePickProps}
            />
          </div>
        </>
      )}
    </div>
  );
}
