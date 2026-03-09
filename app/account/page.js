'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import { useRouter } from 'next/navigation';
import { useCustomerStore, useCartStore, useCartOpenStore, useCurrencyStore } from '@/lib/store';
import { getCustomerOrders } from '@/lib/api';
import { formatPrice } from '@/lib/currency';

export default function AccountPage() {
  const router = useRouter();
  const customer = useCustomerStore((s) => s.customer);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const currency = useCurrencyStore((s) => s.currency);

  useEffect(() => {
    if (typeof window !== 'undefined' && !customer) {
      router.replace('/login');
    }
  }, [customer, router]);

  useEffect(() => {
    if (!customer) return;
    getCustomerOrders({ limit: 50 })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [customer]);

  function handleReorder(order) {
    const items = order?.items || [];
    items.forEach((item) => {
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900">Your account</h1>
      <p className="mt-1 text-neutral-500">{customer.email}</p>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-neutral-900">Order history</h2>
        {loading ? (
          <p className="mt-4 text-sm text-neutral-500">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No orders yet. <Link href="/shop" className="text-neutral-900 font-medium underline">Browse shop</Link></p>
        ) : (
          <ul className="mt-4 space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-neutral-900">Order {String(order.id).slice(0, 8)}…</span>
                    <span className="ml-2 text-sm text-neutral-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium capitalize text-neutral-700">
                    {order.status || 'pending'}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-neutral-900">{formatPrice(order.total ?? 0, currency)}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                  >
                    View details
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    className="inline-flex items-center rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Reorder
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => { useCustomerStore.getState().logout(); router.push('/'); }}
        className="mt-10 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
      >
        Log out
      </button>
    </div>
  );
}
