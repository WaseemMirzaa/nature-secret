'use client';

import Link from '@/components/Link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { InlineLoader } from '@/components/ui/PageLoader';
import { trackOrderConfirmationView } from '@/lib/analytics';

const LAST_ORDER_KEY = 'nature_secret_last_order_date';
const LAST_ORDER_ID_KEY = 'nature_secret_last_order_id';
const LAST_ORDER_META_CUSTOMER_KEY = 'nature_secret_last_order_meta_customer';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const [showEmailConfirmationNote, setShowEmailConfirmationNote] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    let metaCustomer = {};
    try {
      localStorage.setItem(LAST_ORDER_KEY, String(now));
      if (orderId) localStorage.setItem(LAST_ORDER_ID_KEY, orderId);
      const raw = localStorage.getItem(LAST_ORDER_META_CUSTOMER_KEY);
      if (raw) metaCustomer = JSON.parse(raw);
      const e = metaCustomer?.email && String(metaCustomer.email).trim();
      setShowEmailConfirmationNote(!!e);
    } catch (_) {}
    trackOrderConfirmationView(orderId || '');
  }, [orderId]);

  return (
    <div className="mx-auto max-w-lg px-3 sm:px-5 py-8 sm:py-14 lg:py-20 text-center">
      <div className="rounded-full w-14 h-14 sm:w-16 sm:h-16 bg-neutral-900 text-white flex items-center justify-center text-xl sm:text-2xl mx-auto mb-4 sm:mb-6">✓</div>
      <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">Order placed</h1>
      {orderId && <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-neutral-500">Order #{orderId}</p>}
      {showEmailConfirmationNote && (
        <p className="mt-2 text-sm sm:text-base text-neutral-600">We sent a confirmation email to your address.</p>
      )}
      <p className="mt-2 text-sm sm:text-base text-neutral-600">Thank you. We’ll deliver your order and collect payment on delivery.</p>
      <Link href="/shop" className="mt-4 sm:mt-8 inline-block rounded-full sm:rounded-2xl bg-neutral-900 px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-white">Continue shopping</Link>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-3 sm:px-5 py-8 sm:py-20"><InlineLoader /></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
