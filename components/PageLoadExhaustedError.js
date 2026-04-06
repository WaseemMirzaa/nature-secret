'use client';

import { clearPageLoadRetryState } from '@/lib/networkRetry';

export function PageLoadExhaustedError() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 text-neutral-900">
      <h1 className="text-xl font-semibold mb-2">Couldn&apos;t load page</h1>
      <p className="text-neutral-600 text-sm mb-6 text-center max-w-md">
        We tried several times but the page could not load. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => {
          clearPageLoadRetryState();
          window.location.reload();
        }}
        className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-neutral-800"
      >
        Try again
      </button>
    </div>
  );
}
