'use client';

import { MAX_PAGE_LOAD_RETRIES } from '@/lib/networkRetry';

export function PageLoadRetryLoader({ attempt }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-neutral-50/95 backdrop-blur-sm px-6">
      <div
        className="h-10 w-10 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mb-4"
        aria-hidden
      />
      <p className="text-sm font-medium text-neutral-900 text-center">Connection is slow…</p>
      <p className="text-xs text-neutral-500 mt-1.5 text-center">
        Retrying {attempt} of {MAX_PAGE_LOAD_RETRIES}
      </p>
    </div>
  );
}
