'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from '@/components/Link';
import { useRouter, useParams } from 'next/navigation';
import { useCustomerStore, useCartStore, useCartOpenStore, useCurrencyStore } from '@/lib/store';
import { getCustomerOrder, getProducts, resolveImageUrl } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { CustomerPageLoader, OrderDetailSkeleton } from '@/components/ui/PageLoader';

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  returned: 'bg-orange-50 text-orange-700 border-orange-200',
};

const STATUS_ICONS = {
  pending: '⏳', confirmed: '✓', processing: '⚙️', shipped: '🚚', delivered: '✅', cancelled: '✕', returned: '↩',
};

export default function AccountOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const customer = useCustomerStore((s) => s.customer);
  const [order, setOrder] = useState(null);
  const [products, setProductsList] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartOpenStore((s) => s.open);
  const currency = useCurrencyStore((s) => s.currency);

  useEffect(() => {
    if (typeof window !== 'undefined' && !customer) router.replace('/login');
  }, [customer, router]);

  useEffect(() => {
    if (!id || !customer) return;
    Promise.all([
      getCustomerOrder(id).catch(() => null),
      getProducts({ limit: 200 }).then((r) => r?.data || []).catch(() => []),
    ]).then(([o, p]) => {
      setOrder(o);
      setProductsList(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, [id, customer]);

  const productsMap = useMemo(() => (products || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {}), [products]);

  function handleReorder() {
    if (!order?.items?.length) return;
    order.items.forEach((item) => {
      addToCart({ productId: item.productId, variantId: item.variantId || undefined, qty: item.qty || 1, price: item.price ?? 0 });
    });
    openCart();
  }

  if (!customer) return <CustomerPageLoader message="Loading your account" />;

  if (loading) return <OrderDetailSkeleton />;


  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-3 sm:px-5 lg:px-8 py-6 sm:py-12 text-center">
        <p className="text-neutral-600">Order not found.</p>
        <Link href="/account" className="mt-4 inline-flex items-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Back to Orders</Link>
      </div>
    );
  }

  const timeline = order.statusTimeline || [];
  const items = order.items || [];
  const statusClass = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const subtotal = items.reduce((s, item) => s + (item.price || 0) * (item.qty || 1), 0);
  const shipping = (order.total ?? 0) - subtotal;

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-5 lg:px-8 py-5 sm:py-7 lg:py-12">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs sm:text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Orders
      </Link>

      <div className="mt-4 sm:mt-6 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">Order #{String(order.id).slice(0, 8)}</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-neutral-500">Placed on {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</p>
        </div>
        <span className={`rounded-full border px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium capitalize ${statusClass}`}>
          {STATUS_ICONS[order.status] || '⏳'} {order.status || 'pending'}
        </span>
      </div>

      {timeline.length > 0 && (
        <div className="mt-5 sm:mt-8 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Order Timeline</h2>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-neutral-200" />
            {timeline.map((t, i) => {
              const isLast = i === timeline.length - 1;
              return (
                <div key={t.id} className="relative flex items-start gap-3">
                  <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${isLast ? 'bg-neutral-900 border-neutral-900' : 'bg-white border-neutral-300'}`} />
                  <div>
                    <p className={`text-sm font-medium capitalize ${isLast ? 'text-neutral-900' : 'text-neutral-600'}`}>{t.status}</p>
                    <p className="text-xs text-neutral-400">{t.changedAt ? new Date(t.changedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <h2 className="text-sm font-semibold text-neutral-900">{items.length} Item{items.length !== 1 ? 's' : ''}</h2>
        </div>
        <div className="divide-y divide-neutral-100">
          {items.map((item, i) => {
            const p = productsMap[item.productId];
            const variant = item.variantId && p?.variants ? p.variants.find((v) => v.id === item.variantId) : null;
            const imgSrc = p?.images?.[0] ? resolveImageUrl(p.images[0]) : '/assets/nature-secret-logo.svg';
            return (
              <div key={i} className="p-4 sm:p-5 flex items-center gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-100">
                  <Image src={imgSrc} alt={p?.name || ''} fill className="object-cover" sizes="80px" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900">{p?.name || 'Product'}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {variant && <span className="text-xs bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5">{variant.name}</span>}
                    <span className="text-xs text-neutral-500">Qty: {item.qty || 1}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">{formatPrice(item.price || 0, currency)} each</p>
                </div>
                <p className="text-sm font-semibold text-neutral-900 flex-shrink-0">{formatPrice((item.price || 0) * (item.qty || 1), currency)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{formatPrice(subtotal, currency)}</span></div>
          {shipping > 0 && <div className="flex justify-between text-neutral-600"><span>Shipping</span><span>{formatPrice(shipping, currency)}</span></div>}
          <div className="flex justify-between font-semibold text-neutral-900 pt-2 border-t border-neutral-100"><span>Total</span><span className="text-base">{formatPrice(order.total ?? 0, currency)}</span></div>
        </div>
      </div>

      {order.shippingAddress && (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">Shipping Address</h2>
          <p className="text-sm text-neutral-600 whitespace-pre-line">
            {[order.shippingAddress.name, order.shippingAddress.address, order.shippingAddress.city, order.shippingAddress.phone].filter(Boolean).join('\n')}
          </p>
        </div>
      )}

      <div className="mt-5 sm:mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={handleReorder} className="inline-flex items-center rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition-colors">
          Reorder Items
        </button>
        <Link href="/account" className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors">
          Back to Orders
        </Link>
      </div>
    </div>
  );
}
