'use client';

import { useLayoutEffect } from 'react';
import { syncMetaPixelExternalIdOnce } from '@/lib/analytics';
import { isMetaPixelEnabledForSession } from '@/lib/meta-pixel-gate';

/** Loads fbevents + fbq init only when first landing was home + Meta traffic (see lib/meta-pixel-gate.js). autoConfig off stops automatic events (e.g. SubscribedButtonClick); commerce events stay manual in lib/analytics.js. */
export function MetaPixelLoader() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  useLayoutEffect(() => {
    if (!pixelId || typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!isMetaPixelEnabledForSession()) return;
    if (window.fbq) return;
    const s = document.createElement('script');
    s.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixelId)});fbq('set','autoConfig',false,${JSON.stringify(pixelId)});`;
    document.head.appendChild(s);
    queueMicrotask(() => syncMetaPixelExternalIdOnce());
    // Sync inject in layout effect so `window.fbq` exists before child useEffects run `trackPageView` (idle deferral skipped first PageView).
  }, [pixelId]);

  return null;
}
