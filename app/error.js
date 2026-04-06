'use client';

import { useEffect } from 'react';
import { PageLoadRetryLoader, PageLoadSpinner } from '@/components/PageLoadRetryLoader';
import { PageLoadExhaustedError } from '@/components/PageLoadExhaustedError';
import {
  NS_PAGE_LOAD_RETRY_KEY,
  MAX_PAGE_LOAD_RETRIES,
  RETRY_UI_DELAY_MS,
  isRecoverablePageLoadError,
  readPageLoadRetryState,
  stringifyErrorReason,
} from '@/lib/networkRetry';

export default function Error({ error, reset }) {
  const msg = `${error?.message || ''} ${error?.name || ''} ${error?.digest || ''} ${error?.stack || ''} ${stringifyErrorReason(error)}`;
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
    <button
      type="button"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-50/95 backdrop-blur-sm border-0 p-0 cursor-pointer"
      onClick={() => reset()}
      aria-label="Try again"
    >
      <PageLoadSpinner />
    </button>
  );
}
