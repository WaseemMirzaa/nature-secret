'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from '@/components/Link';
import { useRouter } from 'next/navigation';
import { useCustomerStore, useCartStore, useCartOpenStore, useCurrencyStore } from '@/lib/store';
import { getCustomerOrders, getProducts, resolveImageUrl } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { CustomerPageLoader, OrderCardSkeleton } from '@/components/ui/PageLoader';

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  returned: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function AccountPage() {
  const router = useRouter();
  const customer = useCustomerStore((s) => s.customer);
  const [orders, setOrders] = useState([]);
  const [products, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const currency = useCurrencyStore((s) => s.currency);

  useEffect(() => {
    if (typeof window !== 'undefined' && !customer) router.replace('/login');
  }, [customer, router]);

  useEffect(() => {
    if (!customer) return;
    Promise.all([
      getCustomerOrders({ limit: 50 }).catch(() => []),
      getProducts({ limit: 200 }).then((r) => r?.data || []).catch(() => []),
    ]).then(([o, p]) => {
      setOrders(Array.isArray(o) ? o : []);
      setProductsList(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, [customer]);

  const productsMap = useMemo(() => (products || []).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {}), [products]);

  function handleReorder(order) {
    (order?.items || []).forEach((item) => {
      addToCart({ productId: item.productId, variantId: item.variantId || undefined, qty: item.qty || 1, price: item.price ?? 0 });
    });
    openCart();
  }

  if (!customer) {
    return <CustomerPageLoader message="Loading your account" />;
  }

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-5 lg:px-8 py-5 sm:py-7 lg:py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">My Orders</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-neutral-500">{customer.email}</p>
        </div>
        <button
          type="button"
          onClick={() => { useCustomerStore.getState().logout(); router.push('/'); }}
          className="self-start rounded-full sm:rounded-2xl border border-neutral-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
        >
          Log out
        </button>
      </div>

      <section className="mt-6 sm:mt-8">
        {loading ? (
          <OrderCardSkeleton count={3} />
        ) : orders.length === 0 ? (
          <div className="text-center py-8 sm:py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <p className="text-neutral-600 font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-neutral-500">Start shopping to see your orders here.</p>
            <Link href="/shop" className="mt-4 inline-flex items-center rounded-full sm:rounded-2xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">Browse Shop</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = order.items || [];
              const statusClass = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
              return (
                <div key={order.id} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 bg-neutral-50/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-neutral-900">#{String(order.id).slice(0, 8)}</span>
                      <span className="text-xs text-neutral-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass}`}>
                      {order.status || 'pending'}
                    </span>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="space-y-3">
                      {items.slice(0, 3).map((item, i) => {
                        const p = productsMap[item.productId];
                        const variant = item.variantId && p?.variants ? p.variants.find((v) => v.id === item.variantId) : null;
                        const imgSrc = p?.images?.[0] ? resolveImageUrl(p.images[0]) : '/assets/nature-secret-logo.svg';
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-100">
                              <Image src={imgSrc} alt={p?.name || ''} fill className="object-cover" sizes="64px" unoptimized />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 truncate">{p?.name || 'Product'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {variant && <span className="text-xs text-neutral-500 bg-neutral-100 rounded px-1.5 py-0.5">{variant.name}</span>}
                                <span className="text-xs text-neutral-500">Qty: {item.qty || 1}</span>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-neutral-900 flex-shrink-0">{formatPrice((item.price || 0) * (item.qty || 1), currency)}</p>
                          </div>
                        );
                      })}
                      {items.length > 3 && (
                        <p className="text-xs text-neutral-500 pl-[68px] sm:pl-[76px]">+{items.length - 3} more item{items.length - 3 > 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-base font-semibold text-neutral-900">{formatPrice(order.total ?? 0, currency)}</p>
                      <div className="flex gap-2">
                        <Link href={`/account/orders/${order.id}`} className="inline-flex items-center rounded-full sm:rounded-2xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors">
                          View Details
                        </Link>
                        <button type="button" onClick={() => handleReorder(order)} className="inline-flex items-center rounded-full sm:rounded-2xl bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors">
                          Reorder
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
