'use client';

import { PageLoadSpinner } from '@/components/PageLoadRetryLoader';
import { clearPageLoadRetryState } from '@/lib/networkRetry';

/** Same visual as retry loader: spinner only; tap anywhere to clear retry state and reload. */
export function PageLoadExhaustedError() {
  return (
    <button
      type="button"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-50/95 backdrop-blur-sm supports-[backdrop-filter]:bg-neutral-50/80 border-0 p-0 cursor-pointer"
      onClick={() => {
        clearPageLoadRetryState();
        window.location.reload();
      }}
      aria-label="Reload page"
    >
      <PageLoadSpinner />
    </button>
  );
}
