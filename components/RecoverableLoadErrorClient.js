'use client';

import { useEffect } from 'react';
import { PageLoadRetryLoader } from '@/components/PageLoadRetryLoader';
import { PageLoadExhaustedError } from '@/components/PageLoadExhaustedError';
import {
  NS_PAGE_LOAD_RETRY_KEY,
  MAX_PAGE_LOAD_RETRIES,
  RETRY_UI_DELAY_MS,
  readPageLoadRetryState,
} from '@/lib/networkRetry';

/**
 * Next.js `error.js` / `global-error.js`: any error → automatic full reloads with progress
 * (no Try again until {@link MAX_PAGE_LOAD_RETRIES} attempts). Retry count resets on successful `load` (ChunkLoadErrorHandler).
 */
export function RecoverableLoadErrorClient({ error }) {
  const stored = typeof window !== 'undefined' ? readPageLoadRetryState() : { count: 0, first: Date.now() };
  const exhausted = stored.count >= MAX_PAGE_LOAD_RETRIES;
  const displayAttempt = exhausted ? MAX_PAGE_LOAD_RETRIES : Math.min(stored.count + 1, MAX_PAGE_LOAD_RETRIES);

  useEffect(() => {
    if (typeof window === 'undefined' || exhausted) return undefined;
    const now = Date.now();
    const d = readPageLoadRetryState();
    const t = setTimeout(() => {
      if (typeof window !== 'undefined' && window.__NS_PAGE_RELOAD_QUEUED__) return;
      if (typeof window !== 'undefined') window.__NS_PAGE_RELOAD_QUEUED__ = true;
      try {
        sessionStorage.setItem(
          NS_PAGE_LOAD_RETRY_KEY,
          JSON.stringify({ count: d.count + 1, first: d.first || now }),
        );
      } catch (_) {}
      window.location.reload();
    }, RETRY_UI_DELAY_MS);
    return () => clearTimeout(t);
  }, [error, exhausted]);

  if (exhausted) {
    return <PageLoadExhaustedError />;
  }

  return <PageLoadRetryLoader attempt={displayAttempt} max={MAX_PAGE_LOAD_RETRIES} />;
}
