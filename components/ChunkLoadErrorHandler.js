'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PageLoadRetryLoader } from '@/components/PageLoadRetryLoader';
import {
  NS_PAGE_LOAD_RETRY_KEY,
  NS_PAGE_LOAD_RETRY_DONE,
  LEGACY_CHUNK_KEY,
  MAX_PAGE_LOAD_RETRIES,
  RETRY_UI_DELAY_MS,
  isRecoverablePageLoadError,
  readPageLoadRetryState,
  clearPageLoadRetryState,
} from '@/lib/networkRetry';

export function ChunkLoadErrorHandler({ children }) {
  const [retryUi, setRetryUi] = useState(null);
  const handlingRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') window.__NS_PAGE_LOAD_RETRY_REACT__ = true;
  }, []);

  useEffect(() => {
    const onLoad = () => clearPageLoadRetryState();
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (!retryUi) return undefined;
    const { nextCount, first } = retryUi;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(NS_PAGE_LOAD_RETRY_KEY, JSON.stringify({ count: nextCount, first }));
        sessionStorage.removeItem(LEGACY_CHUNK_KEY);
      } catch (_) {}
      handlingRef.current = false;
      window.location.reload();
    }, RETRY_UI_DELAY_MS);
    return () => clearTimeout(t);
  }, [retryUi]);

  useEffect(() => {
    function scheduleRetry() {
      if (typeof window === 'undefined' || window.location.pathname === '/404') return;
      if (handlingRef.current) return;
      const data = readPageLoadRetryState();
      const now = Date.now();
      if (data.count >= MAX_PAGE_LOAD_RETRIES) {
        try {
          sessionStorage.setItem(NS_PAGE_LOAD_RETRY_DONE, '1');
        } catch (_) {}
        handlingRef.current = false;
        window.location.replace('/404');
        return;
      }
      handlingRef.current = true;
      setRetryUi({ nextCount: data.count + 1, first: data.first || now });
    }

    const onError = (event) => {
      const msg = event?.message || '';
      if (isRecoverablePageLoadError(msg)) scheduleRetry();
    };
    const onReject = (event) => {
      const msg = event?.reason?.message || String(event.reason || '');
      if (isRecoverablePageLoadError(msg)) scheduleRetry();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);

  if (retryUi) {
    return <PageLoadRetryLoader attempt={retryUi.nextCount} />;
  }

  return <>{children}</>;
}
