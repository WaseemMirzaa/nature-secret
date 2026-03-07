'use client';

import { useEffect, useState } from 'react';

const CHUNK_RELOAD_KEY = 'ns_chunk_reload';
const MAX_RELOADS = 3;
const WINDOW_MS = 60000;

function isChunkLoadError(message) {
  if (typeof message !== 'string') return false;
  return message.includes('ChunkLoadError') || message.includes('Loading chunk') || message.includes('Failed to fetch dynamically imported module');
}

function handleChunkError() {
  try {
    if (typeof sessionStorage === 'undefined') {
      window.location.reload();
      return;
    }
    const raw = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    let data = { count: 0, first: now };
    if (raw) {
      try {
        data = JSON.parse(raw);
        if (now - data.first > WINDOW_MS) data = { count: 0, first: now };
      } catch (_) {}
    }
    if (data.count < MAX_RELOADS) {
      data.count += 1;
      sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify(data));
      window.location.reload();
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY + '_done', '1');
  } catch {
    window.location.reload();
  }
}

export function ChunkLoadErrorHandler({ children }) {
  const [showRefresh, setShowRefresh] = useState(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(CHUNK_RELOAD_KEY + '_done')) return true;
    return false;
  });

  useEffect(() => {
    const onError = (event) => {
      const msg = event?.message || event?.reason?.message || String(event.reason || event);
      if (isChunkLoadError(msg)) {
        handleChunkError();
        setShowRefresh(true);
      }
    };
    const onReject = (event) => {
      const msg = event?.reason?.message || String(event.reason || '');
      if (isChunkLoadError(msg)) {
        handleChunkError();
        setShowRefresh(true);
      }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);

  if (showRefresh) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 text-neutral-900">
        <p className="text-lg font-medium mb-2">Update required</p>
        <p className="text-neutral-600 text-sm text-center max-w-sm mb-6">
          A new version of the site is available. Please refresh the page to load it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-neutral-800"
        >
          Refresh page
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
