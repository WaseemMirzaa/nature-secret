'use client';

import { useEffect } from 'react';
import { isMetaPixelEnabledForSession } from '@/lib/meta-pixel-gate';
import { metaDebug, isMetaDebugEnabled } from '@/lib/metaDebug';

const FB_EVENTS_LOAD = 'meta-fbevents-loaded';

/** Head inline bootstrap loads `fbevents.js` and dispatches this; we only sync `external_id` once here. */
export function MetaPixelLoader() {
  const pixelId = String(process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();

  useEffect(() => {
    if (!pixelId) {
      if (isMetaDebugEnabled()) metaDebug('MetaPixelLoader', { injected: false, reason: 'NEXT_PUBLIC_META_PIXEL_ID unset' });
      return;
    }
    function sync() {
      if (!isMetaPixelEnabledForSession() || !window.fbq) return;
      import('@/lib/analytics').then((m) => m.syncMetaPixelExternalIdOnce()).catch(() => {});
    }
    window.addEventListener(FB_EVENTS_LOAD, sync);
    queueMicrotask(sync);
    return () => window.removeEventListener(FB_EVENTS_LOAD, sync);
  }, [pixelId]);

  return null;
}
