'use client';

import { clearPageLoadRetryState } from '@/lib/networkRetry';

/** After max automatic reloads: single explicit Try again (no full-screen mystery tap). */
export function PageLoadExhaustedError() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-neutral-50/95 px-6 backdrop-blur-sm supports-[backdrop-filter]:bg-neutral-50/80"
      role="alert"
    >
      <p className="max-w-sm text-center text-sm text-neutral-600">
        We couldn&apos;t load the page after several tries. Check your connection, then try again.
      </p>
      <button
        type="button"
        className="rounded-full bg-neutral-900 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        onClick={() => {
          clearPageLoadRetryState();
          window.location.reload();
        }}
      >
        Try again
      </button>
    </div>
  );
}
