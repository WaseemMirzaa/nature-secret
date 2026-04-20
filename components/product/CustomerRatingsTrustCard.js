'use client';

import { memo } from 'react';

export const CustomerRatingsTrustCard = memo(function CustomerRatingsTrustCard({ count, average, className = '' }) {
  const safeCount = Number(count);
  const safeAvg = Number(average);
  if (!Number.isFinite(safeCount) || !Number.isFinite(safeAvg) || safeCount < 1 || safeAvg <= 0) return null;
  const display = Math.round(safeAvg * 10) / 10;
  const fullStars = Math.min(5, Math.max(0, Math.round(safeAvg)));
  const label =
    safeCount === 1 ? 'Based on 1 customer rating' : `Based on ${safeCount.toLocaleString('en-US')} customer ratings`;
  return (
    <div
      className={`ns-trust-glass rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 ${className}`}
      role="region"
      aria-label={`Average ${display} out of 5 stars. ${label}.`}
    >
      <div className="relative z-[1]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-900">Customer trust</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-3 sm:gap-4">
          <p className="font-display text-[2rem] font-bold tabular-nums leading-none text-neutral-900 sm:text-[2.125rem]">{display.toFixed(1)}</p>
          <div className="min-w-0 flex-1">
            <p className="text-lg leading-none tracking-tight sm:text-xl" aria-hidden>
              <span className="text-amber-500">{'★'.repeat(fullStars)}</span>
              <span className="text-neutral-900/28">{'★'.repeat(5 - fullStars)}</span>
            </p>
            <p className="mt-1.5 text-[12px] font-medium leading-snug text-neutral-900 sm:text-[13px]">
              <span className="font-semibold">Average {display.toFixed(1)} out of 5</span>
              {' · '}
              {label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
