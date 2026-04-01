'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from '@/components/Link';

const LAST_ORDER_KEY = 'nature_secret_last_order_date';
const LAST_ORDER_ID_KEY = 'nature_secret_last_order_id';
const POPUP_DISMISSED_KEY = 'nature_secret_review_popup_dismissed';
const DAYS_BEFORE_POPUP = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function ReviewPopup() {
  const pathname = usePathname() || '';
  const isHome = pathname === '/' || pathname === '';
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isHome) {
      setShow(false);
      return;
    }
    try {
      const raw = localStorage.getItem(LAST_ORDER_KEY);
      const orderId = localStorage.getItem(LAST_ORDER_ID_KEY) || '';
      const dismissed = localStorage.getItem(POPUP_DISMISSED_KEY) || '';
      if (!raw || dismissed === orderId || dismissed === 'true') return;
      const orderTime = parseInt(raw, 10);
      if (Number.isNaN(orderTime)) return;
      const elapsed = Date.now() - orderTime;
      if (elapsed >= DAYS_BEFORE_POPUP * MS_PER_DAY) setShow(true);
    } catch (_) {}
  }, [isHome]);

  function dismiss() {
    try {
      const orderId = localStorage.getItem(LAST_ORDER_ID_KEY) || 'true';
      localStorage.setItem(POPUP_DISMISSED_KEY, orderId);
    } catch (_) {}
    setShow(false);
  }

  if (!show || isHome) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 animate-fade-in" aria-hidden onClick={dismiss} />
      <div className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-premium animate-slide-up mx-4">
        <h3 className="text-lg font-semibold text-neutral-900">How was your order?</h3>
        <p className="mt-2 text-sm text-neutral-600">Your feedback helps others. Leave a review for your recent purchase.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/shop"
            onClick={dismiss}
            className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Leave a review
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}
