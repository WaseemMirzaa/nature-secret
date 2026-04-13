'use client';

import { MAX_PAGE_LOAD_RETRIES } from '@/lib/networkRetry';

/** Spinner graphic only (no copy). */
export function PageLoadSpinner() {
  return (
    <div
      className="h-10 w-10 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin shrink-0"
      aria-hidden
    />
  );
}

/**
 * Full-screen overlay during automatic reload retries: progress bar + attempt count.
 * No buttons until parent shows exhausted UI.
 */
export function PageLoadRetryLoader({
  attempt = 1,
  max = MAX_PAGE_LOAD_RETRIES,
} = {}) {
  const safeMax = Math.max(1, max);
  const safeAttempt = Math.min(Math.max(1, attempt), safeMax);
  const pct = Math.round((safeAttempt / safeMax) * 100);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-neutral-50/95 px-6 backdrop-blur-sm supports-[backdrop-filter]:bg-neutral-50/80"
      aria-busy="true"
      role="status"
      aria-live="polite"
      aria-label={`Loading, attempt ${safeAttempt} of ${safeMax}`}
    >
      <PageLoadSpinner />
      <div className="w-full max-w-xs space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-neutral-900 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-center text-xs font-medium text-neutral-700">
          Reconnecting… {safeAttempt} / {safeMax}
        </p>
      </div>
    </div>
  );
}
