'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  NS_PROMO_CODE,
  initNsPromoDeadline,
  getNsPromoSecondsRemaining,
  isNsPromoWindowActive,
} from '@/lib/nsSessionPromo';

function formatMmSs(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function NsPromoBanner() {
  const pathname = usePathname();
  const [seconds, setSeconds] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    initNsPromoDeadline();
    setSeconds(getNsPromoSecondsRemaining());
    setActive(isNsPromoWindowActive());
  }, [pathname]);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    const id = setInterval(() => {
      const rem = getNsPromoSecondsRemaining();
      setSeconds(rem);
      setActive(rem > 0);
    }, 1000);
    return () => clearInterval(id);
  }, [pathname]);

  if (pathname?.startsWith('/admin') || !active) return null;

  return (
    <div
      className="border-b border-gold-200/80 bg-gradient-to-r from-gold-50 via-amber-50/90 to-gold-50 px-3 py-2 sm:py-2.5 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs sm:text-sm text-neutral-800 leading-snug">
        <span className="font-semibold text-gold-900">Limited session offer:</span>{' '}
        use code <span className="font-mono font-bold tracking-wide">{NS_PROMO_CODE}</span> at checkout for{' '}
        <span className="font-semibold">Rs 150 off</span>
        <span className="text-neutral-500"> — </span>
        <span className="tabular-nums font-semibold text-gold-800">{formatMmSs(seconds)}</span>
        <span className="text-neutral-600"> left this visit</span>
      </p>
    </div>
  );
}
