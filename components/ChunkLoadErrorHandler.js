'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PageLoadRetryLoader } from '@/components/PageLoadRetryLoader';
import { PageLoadExhaustedError } from '@/components/PageLoadExhaustedError';
import {
  NS_PAGE_LOAD_RETRY_KEY,
  NS_PAGE_LOAD_RETRY_DONE,
  LEGACY_CHUNK_KEY,
  MAX_PAGE_LOAD_RETRIES,
  RETRY_UI_DELAY_MS,
  isRecoverablePageLoadError,
  readPageLoadRetryState,
  clearPageLoadRetryState,
  stringifyErrorReason,
} from '@/lib/networkRetry';

export function ChunkLoadErrorHandler({ children }) {
  const [retryUi, setRetryUi] = useState(null);
  const [exhausted, setExhausted] = useState(false);
  const handlingRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') window.__NS_PAGE_LOAD_RETRY_REACT__ = true;
  }, []);

  useEffect(() => {
    const onLoad = () => {
      clearPageLoadRetryState();
      try {
        delete window.__NS_PAGE_RELOAD_QUEUED__;
      } catch (_) {}
    };
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
    }
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (!retryUi) return undefined;
    const { nextCount, first } = retryUi;
    const t = setTimeout(() => {
      if (typeof window !== 'undefined' && window.__NS_PAGE_RELOAD_QUEUED__) {
        handlingRef.current = false;
        return;
      }
      if (typeof window !== 'undefined') window.__NS_PAGE_RELOAD_QUEUED__ = true;
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
      if (typeof window === 'undefined') return;
      if (handlingRef.current) return;
      const data = readPageLoadRetryState();
      const now = Date.now();
      if (data.count >= MAX_PAGE_LOAD_RETRIES) {
        try {
          sessionStorage.setItem(NS_PAGE_LOAD_RETRY_DONE, '1');
        } catch (_) {}
        handlingRef.current = false;
        setExhausted(true);
        return;
      }
      handlingRef.current = true;
      setRetryUi({ nextCount: data.count + 1, first: data.first || now });
    }

    const onError = (event) => {
      let msg = event?.message || '';
      const t = event?.target;
      if (event?.error) {
        msg = `${msg} ${stringifyErrorReason(event.error)}`.trim();
      }
      if (!msg && t && t.tagName === 'SCRIPT' && t.src) {
        msg = `Failed to load script ${t.src}`;
      }
      if (!msg && t && t.tagName === 'LINK' && t.href) {
        msg = `Failed to load stylesheet ${t.href}`;
      }
      const staticUrl =
        t && (t.tagName === 'SCRIPT' ? t.src : t.tagName === 'LINK' ? t.href : '');
      const isNextStaticTarget =
        typeof staticUrl === 'string' && staticUrl.includes('/_next/static/');
      if (isRecoverablePageLoadError(msg) || isNextStaticTarget) scheduleRetry();
    };
    const onReject = (event) => {
      const msg = stringifyErrorReason(event?.reason);
      if (isRecoverablePageLoadError(msg)) scheduleRetry();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);

  if (exhausted) {
    return <PageLoadExhaustedError />;
  }

  if (retryUi) {
    return <PageLoadRetryLoader attempt={retryUi.nextCount} max={MAX_PAGE_LOAD_RETRIES} />;
  }

  return <>{children}</>;
}
