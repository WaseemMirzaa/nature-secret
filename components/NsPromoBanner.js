'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  NS_PROMO_CODE,
  NS_PROMO_DURATION_HOURS,
  initNsPromoDeadline,
  getNsPromoSecondsRemaining,
  isNsPromoWindowActive,
} from '@/lib/nsSessionPromo';

function formatCountdown(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
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
      className="border-b border-neutral-900/10 bg-accent-cream px-3 py-2.5 sm:py-3 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium tracking-tight">
        <span className="font-semibold text-neutral-900">
          Offer for our first customers available for {NS_PROMO_DURATION_HOURS} hours
        </span>
        <span className="text-neutral-500"> — </span>
        <span className="tabular-nums font-semibold text-neutral-900 text-sm sm:text-base">{formatCountdown(seconds)}</span>
        <span className="text-neutral-600 font-medium"> left this visit</span>
        <span className="text-neutral-400"> · </span>
        <span className="text-neutral-700">
          Use code{' '}
          <span className="font-mono font-semibold tracking-wide text-neutral-900 bg-white border border-neutral-900/12 px-1.5 py-0.5 rounded-sm shadow-sm">
            {NS_PROMO_CODE}
          </span>{' '}
          at checkout for <span className="font-semibold text-neutral-900">Rs 150 off</span>
        </span>
      </p>
    </div>
  );
}
