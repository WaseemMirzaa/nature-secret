'use client';

import Link from '@/components/Link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="rounded-full w-16 h-16 bg-neutral-900 text-white flex items-center justify-center text-2xl mx-auto mb-6">✓</div>
      <h1 className="text-2xl font-semibold text-neutral-900">Order confirmed</h1>
      {orderId && <p className="mt-2 text-sm text-neutral-500">Order #{orderId}</p>}
      <p className="mt-2 text-neutral-600">Thank you. We’ll deliver your order and collect payment on delivery.</p>
      <Link href="/shop" className="mt-8 inline-block rounded-2xl bg-neutral-900 px-8 py-3 text-sm font-medium text-white">Continue shopping</Link>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-20 text-center text-neutral-500">Loading…</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
