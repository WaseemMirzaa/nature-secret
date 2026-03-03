'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOrdersStore, useCustomerNotesStore, useCurrencyStore } from '@/lib/store';
import { formatPrice } from '@/lib/currency';
import { getAdminCustomer } from '@/lib/api';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const idOrEmail = decodeURIComponent(params.id || '');
  const isUuid = UUID_REGEX.test(idOrEmail);
  const orders = useOrdersStore((s) => s.orders);
  const [apiCustomer, setApiCustomer] = useState(null);
  const [loading, setLoading] = useState(isUuid);

  useEffect(() => {
    if (!isUuid) return;
    getAdminCustomer(idOrEmail)
      .then((c) => setApiCustomer(c))
      .catch(() => setApiCustomer(null))
      .finally(() => setLoading(false));
  }, [idOrEmail, isUuid]);

  const customerOrders = orders.filter((o) => o.email === idOrEmail || o.email === apiCustomer?.email);
  const notes = useCustomerNotesStore((s) => s.notes);
  const setNote = useCustomerNotesStore((s) => s.setNote);
  const currency = useCurrencyStore((s) => s.currency);
  const noteKey = apiCustomer?.email ?? idOrEmail;
  const [noteValue, setNoteValue] = useState('');
  useEffect(() => setNoteValue(notes[noteKey] ?? ''), [noteKey, notes]);

  const customerFromOrders = customerOrders[0]
    ? { name: customerOrders[0].customerName, email: customerOrders[0].email, phone: customerOrders[0].phone, address: customerOrders[0].address }
    : null;
  const customer = apiCustomer
    ? { name: apiCustomer.name, email: apiCustomer.email, phone: apiCustomer.phone, address: apiCustomer.address }
    : customerFromOrders;

  const saveNote = () => setNote(noteKey, noteValue);

  if (loading) {
    return (
      <div>
        <Link href="/admin/customers" className="text-sm text-neutral-500 hover:text-neutral-900">← Customers</Link>
        <p className="mt-4 text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (!customer && customerOrders.length === 0 && !apiCustomer) {
    return (
      <div>
        <Link href="/admin/customers" className="text-sm text-neutral-500 hover:text-neutral-900">← Customers</Link>
        <p className="mt-4 text-neutral-500">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/customers" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Customers</Link>
      <h1 className="text-2xl font-semibold text-neutral-900">{customer?.name || idOrEmail}</h1>
      <p className="text-neutral-600">{customer?.email ?? idOrEmail}</p>
      {customer?.phone && <p className="text-neutral-600">Phone: {customer.phone}</p>}
      {customer?.address && <p className="mt-2 text-neutral-600 whitespace-pre-wrap">{customer.address}</p>}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Admin notes</h2>
        <textarea
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          onBlur={saveNote}
          rows={3}
          className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900"
          placeholder="Add notes about this customer..."
        />
        <button type="button" onClick={saveNote} className="mt-2 rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium">Save note</button>
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <h2 className="p-4 text-sm font-medium text-neutral-500 uppercase tracking-wider border-b border-neutral-100">Order history ({customerOrders.length})</h2>
        <ul className="divide-y divide-neutral-100">
          {customerOrders.map((o) => (
            <li key={o.id} className="p-4 flex items-center justify-between">
              <Link href={`/admin/orders/${o.id}`} className="font-medium text-neutral-900 hover:underline">{o.id}</Link>
              <span className="text-neutral-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</span>
              <span className="font-medium">{formatPrice(o.total, currency)}</span>
              <span className="capitalize text-sm text-neutral-600">{o.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
