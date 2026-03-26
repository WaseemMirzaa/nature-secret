'use client';

import Link from '@/components/Link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { InlineLoader } from '@/components/ui/PageLoader';
import { trackOrderConfirmationView } from '@/lib/analytics';

const LAST_ORDER_KEY = 'nature_secret_last_order_date';
const LAST_ORDER_ID_KEY = 'nature_secret_last_order_id';
const LAST_ORDER_META_CUSTOMER_KEY = 'nature_secret_last_order_meta_customer';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    let metaCustomer = {};
    try {
      localStorage.setItem(LAST_ORDER_KEY, String(now));
      if (orderId) localStorage.setItem(LAST_ORDER_ID_KEY, orderId);
      const raw = localStorage.getItem(LAST_ORDER_META_CUSTOMER_KEY);
      if (raw) metaCustomer = JSON.parse(raw);
    } catch (_) {}
    trackOrderConfirmationView(orderId || '', metaCustomer);
  }, [orderId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16 lg:py-20 text-center">
      <div className="rounded-full w-16 h-16 bg-neutral-900 text-white flex items-center justify-center text-2xl mx-auto mb-6">✓</div>
      <h1 className="text-2xl font-semibold text-neutral-900">Order confirmed</h1>
      {orderId && <p className="mt-2 text-sm text-neutral-500">Order #{orderId}</p>}
      <p className="mt-2 text-neutral-600">Thank you. We’ll deliver your order and collect payment on delivery.</p>
      <Link href="/shop" className="mt-5 sm:mt-8 inline-block rounded-2xl bg-neutral-900 px-8 py-3 text-sm font-medium text-white">Continue shopping</Link>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-10 sm:py-20"><InlineLoader /></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
