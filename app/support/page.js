'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import { getMySupportTickets } from '@/lib/api';
import { useCustomerStore } from '@/lib/store';
import { InlineLoader } from '@/components/ui/PageLoader';

export default function SupportPage() {
  const customer = useCustomerStore((s) => s.customer);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!customer) {
      setLoading(false);
      return;
    }
    getMySupportTickets({ limit: 50 })
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [customer]);

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-8 sm:py-16">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-neutral-900">Support tickets</h1>
          <p className="mt-2 text-sm text-neutral-600">Please log in to view your support tickets.</p>
          <Link href="/contact" className="mt-4 inline-block text-sm font-medium text-gold-600 hover:text-gold-700">Submit a ticket (no login required) →</Link>
          <p className="mt-6">
            <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">← Back to home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-5 sm:py-8 lg:py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">My support tickets</h1>
        <p className="mt-1 text-sm text-neutral-600">View the status of your support requests.</p>
        <Link href="/contact" className="mt-4 inline-block rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
          New ticket
        </Link>

        {loading ? (
          <div className="mt-5 sm:mt-8"><InlineLoader /></div>
        ) : tickets.length === 0 ? (
          <p className="mt-5 sm:mt-8 text-neutral-500">No tickets yet. <Link href="/contact" className="text-gold-600 hover:underline">Submit one</Link>.</p>
        ) : (
          <ul className="mt-5 sm:mt-8 space-y-3 sm:space-y-4">
            {tickets.map((t) => (
              <li key={t.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-900 truncate">{t.subject}</span>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    t.status === 'closed' ? 'bg-neutral-200 text-neutral-700' :
                    t.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {t.status}
                  </span>
                  <span className="text-neutral-400 text-sm">{formatDate(t.createdAt)}</span>
                  <span className="text-neutral-400">{expandedId === t.id ? '▼' : '▶'}</span>
                </button>
                {expandedId === t.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-neutral-100 space-y-3">
                    <div className="pt-3">
                      <p className="text-xs font-medium text-neutral-500 uppercase">Your message</p>
                      <p className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{t.message}</p>
                    </div>
                    {t.adminReply && (
                      <div className="rounded-lg bg-neutral-50 p-3">
                        <p className="text-xs font-medium text-neutral-500 uppercase">Reply from support</p>
                        <p className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{t.adminReply}</p>
                        {t.repliedAt && <p className="mt-0.5 text-xs text-neutral-500">{formatDate(t.repliedAt)}</p>}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 sm:mt-10">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
