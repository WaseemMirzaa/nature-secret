'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  NS_PROMO_CODE,
  NS_PROMO_DURATION_MINUTES,
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
      className="border-b-2 border-gold-400/90 bg-gradient-to-r from-amber-100 via-gold-100 to-amber-100 px-3 py-3 sm:py-3.5 text-center shadow-[0_4px_18px_-4px_rgba(180,83,9,0.35)]"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm sm:text-base text-neutral-900 leading-snug font-medium">
        <span className="font-bold text-gold-950">
          Offer for our first customers available for {NS_PROMO_DURATION_MINUTES} min
        </span>
        <span className="text-neutral-600"> — </span>
        <span className="tabular-nums font-bold text-gold-900 text-base sm:text-lg">{formatMmSs(seconds)}</span>
        <span className="text-neutral-700 font-semibold"> left this visit</span>
        <span className="text-neutral-600"> · </span>
        <span className="text-neutral-800">
          Use code{' '}
          <span className="font-mono font-bold tracking-wide text-gold-950 bg-white/80 px-1.5 py-0.5 rounded border border-gold-300/80">
            {NS_PROMO_CODE}
          </span>{' '}
          at checkout for <span className="font-semibold text-gold-950">Rs 150 off</span>
        </span>
      </p>
    </div>
  );
}
