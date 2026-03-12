'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import { getAdminSupportTickets, updateAdminSupportTicket, formatApiError } from '@/lib/api';
import { InlineLoader } from '@/components/ui/PageLoader';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [statusEdit, setStatusEdit] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    getAdminSupportTickets({ status: statusFilter || undefined, limit: 100 })
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function handleUpdate(id) {
    setSavingId(id);
    setError('');
    try {
      await updateAdminSupportTicket(id, {
        status: statusEdit[id] || undefined,
        adminReply: replyText[id] !== undefined ? replyText[id] : undefined,
      });
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      setStatusEdit((prev) => ({ ...prev, [id]: undefined }));
      load();
    } catch (err) {
      setError(formatApiError(err, 'Update failed'));
    } finally {
      setSavingId(null);
    }
  }

  function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString();
  }

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-900">← Dashboard</Link>
      <h1 className="text-2xl font-semibold text-neutral-900 mt-4">Support tickets</h1>
      <p className="mt-1 text-sm text-neutral-600">View and reply to customer support requests.</p>

      <div className="mt-4 flex items-center gap-4">
        <label className="text-sm text-neutral-600">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="mt-6"><InlineLoader /></div>
      ) : tickets.length === 0 ? (
        <p className="mt-6 text-neutral-500">No tickets.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-neutral-50"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-neutral-900 truncate block">{t.subject}</span>
                  <span className="text-xs text-neutral-500">{t.name} · {t.email} · {formatDate(t.createdAt)}</span>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                  t.status === 'closed' ? 'bg-neutral-200 text-neutral-700' :
                  t.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                }`}>
                  {t.status}
                </span>
                <span className="text-neutral-400">{expandedId === t.id ? '▼' : '▶'}</span>
              </button>
              {expandedId === t.id && (
                <div className="px-4 pb-4 pt-0 border-t border-neutral-100 space-y-3">
                  <div className="pt-3">
                    <p className="text-xs font-medium text-neutral-500 uppercase">Message</p>
                    <p className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{t.message}</p>
                  </div>
                  {t.adminReply && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase">Your reply</p>
                      <p className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{t.adminReply}</p>
                      {t.repliedAt && <p className="mt-0.5 text-xs text-neutral-500">{formatDate(t.repliedAt)}</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Reply (optional)</label>
                      <textarea
                        value={replyText[t.id] ?? t.adminReply ?? ''}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        rows={3}
                        placeholder="Type your reply…"
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Status</label>
                      <select
                        value={statusEdit[t.id] ?? t.status}
                        onChange={(e) => setStatusEdit((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdate(t.id)}
                      disabled={savingId === t.id}
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {savingId === t.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
