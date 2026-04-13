'use client';

import { useLayoutEffect } from 'react';
import { syncMetaPixelExternalIdOnce } from '@/lib/analytics';
import { isMetaPixelEnabledForSession } from '@/lib/meta-pixel-gate';
import { metaDebug, isMetaDebugEnabled } from '@/lib/metaDebug';

/** Loads fbevents + fbq init when gate opens (lib/meta-pixel-gate.js). `autoConfig: false` disables Meta’s automatic pixel configuration / detected events; all commerce + PageView are fired manually in lib/analytics.js. */
export function MetaPixelLoader() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!String(pixelId || '').trim()) {
      if (isMetaDebugEnabled()) metaDebug('MetaPixelLoader', { injected: false, reason: 'NEXT_PUBLIC_META_PIXEL_ID unset' });
      return;
    }
    if (!isMetaPixelEnabledForSession()) {
      if (isMetaDebugEnabled()) {
        metaDebug('MetaPixelLoader', {
          injected: false,
          reason: 'session gate closed (first paint not home/shop/PDP/checkout — lib/meta-pixel-gate.js)',
        });
      }
      return;
    }
    if (window.fbq) return;
    if (isMetaDebugEnabled()) metaDebug('MetaPixelLoader', { injected: true, action: 'fbevents.js + fbq init' });
    const s = document.createElement('script');
    s.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixelId)});fbq('set','autoConfig',false,${JSON.stringify(pixelId)});`;
    document.head.appendChild(s);
    queueMicrotask(() => syncMetaPixelExternalIdOnce());
    // Sync inject in layout effect so `window.fbq` exists before child useEffects run `trackPageView` (idle deferral skipped first PageView).
  }, [pixelId]);

  return null;
}
