'use client';

import { useEffect } from 'react';
import { PageLoadRetryLoader } from '@/components/PageLoadRetryLoader';
import { PageLoadExhaustedError } from '@/components/PageLoadExhaustedError';
import {
  NS_PAGE_LOAD_RETRY_KEY,
  MAX_PAGE_LOAD_RETRIES,
  RETRY_UI_DELAY_MS,
  isRecoverablePageLoadError,
  readPageLoadRetryState,
} from '@/lib/networkRetry';

export default function Error({ error, reset }) {
  const msg = `${error?.message || ''} ${error?.name || ''} ${error?.digest || ''} ${error?.stack || ''} ${String(error || '')}`;
  const recoverable = typeof window !== 'undefined' && isRecoverablePageLoadError(msg);
  const stored = typeof window !== 'undefined' ? readPageLoadRetryState() : { count: 0, first: Date.now() };
  const exhausted = recoverable && stored.count >= MAX_PAGE_LOAD_RETRIES;

  useEffect(() => {
    if (typeof window === 'undefined' || !recoverable || exhausted) return undefined;
    const now = Date.now();
    const d = readPageLoadRetryState();
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(
          NS_PAGE_LOAD_RETRY_KEY,
          JSON.stringify({ count: d.count + 1, first: d.first || now }),
        );
      } catch (_) {}
      window.location.reload();
    }, RETRY_UI_DELAY_MS);
    return () => clearTimeout(t);
  }, [error, recoverable, exhausted]);

  if (exhausted) {
    return <PageLoadExhaustedError />;
  }

  if (recoverable && !exhausted) {
    return <PageLoadRetryLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 text-neutral-900">
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-neutral-600 text-sm mb-6 text-center max-w-md">
        The page could not load. You can try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-neutral-800"
      >
        Try again
      </button>
    </div>
  );
}
