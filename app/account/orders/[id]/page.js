'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import { useRouter, useParams } from 'next/navigation';
import { useCustomerStore, useCartStore, useCartOpenStore, useCurrencyStore } from '@/lib/store';
import { getCustomerOrder } from '@/lib/api';
import { formatPrice } from '@/lib/currency';

export default function AccountOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const customer = useCustomerStore((s) => s.customer);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const currency = useCurrencyStore((s) => s.currency);

  useEffect(() => {
    if (typeof window !== 'undefined' && !customer) {
      router.replace('/login');
    }
  }, [customer, router]);

  useEffect(() => {
    if (!id || !customer) return;
    getCustomerOrder(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id, customer]);

  function handleReorder() {
    if (!order?.items?.length) return;
    order.items.forEach((item) => {
      addToCart({
        productId: item.productId,
        variantId: item.variantId || undefined,
        qty: item.qty || 1,
        price: item.price ?? 0,
      });
    });
    openCart();
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-500">
        Loading…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-neutral-500">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-neutral-600">Order not found or you don’t have access.</p>
        <Link href="/account" className="mt-4 inline-block text-sm font-medium text-neutral-900 underline">← Back to account</Link>
      </div>
    );
  }

  const timeline = order.statusTimeline || [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/account" className="text-sm text-neutral-500 hover:text-neutral-900">← Account</Link>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Order {String(order.id).slice(0, 8)}…</h1>
      <p className="mt-1 text-sm text-neutral-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</p>
      <span className="mt-2 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-sm font-medium capitalize text-neutral-700">
        {order.status || 'pending'}
      </span>

      {timeline.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-neutral-700">Status</h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {timeline.map((t) => (
              <li key={t.id}>
                {t.status} — {t.changedAt ? new Date(t.changedAt).toLocaleString() : ''} ({t.changedBy || 'system'})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-medium text-neutral-700">Items</h2>
        <ul className="mt-2 space-y-2">
          {(order.items || []).map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>Product {String(item.productId).slice(0, 8)}… × {item.qty ?? 1}</span>
              <span>{formatPrice((item.price ?? 0) * (item.qty ?? 1), currency)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 font-semibold text-neutral-900">Total: {formatPrice(order.total ?? 0, currency)}</p>

      <button
        type="button"
        onClick={handleReorder}
        className="mt-6 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Reorder same items
      </button>
    </div>
  );
}
