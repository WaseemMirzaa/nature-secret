'use client';

import Script from 'next/script';
import { useLayoutEffect, useState } from 'react';
import { syncMetaPixelExternalIdOnce } from '@/lib/analytics';
import { isMetaPixelEnabledForSession } from '@/lib/meta-pixel-gate';
import { metaDebug, isMetaDebugEnabled } from '@/lib/metaDebug';

/** fbq queue + init only; fbevents.js is loaded separately via `<Script lazyOnload />` (no second script tag). */
const FBQ_STUB_AND_INIT = (pixelId) =>
  `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window,document,'script','');` +
  `fbq('init',${JSON.stringify(pixelId)});` +
  `fbq('set','autoConfig',false,${JSON.stringify(pixelId)});`;

const FB_EVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

/** Gate + fbq init when gate opens; `fbevents.js` loads after window load (lazyOnload) so LCP/FCP stay unblocked. `autoConfig: false` — events manual in lib/analytics.js. */
export function MetaPixelLoader() {
  const pixelId = String(process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();
  const [inject, setInject] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pixelId) {
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
    if (isMetaDebugEnabled()) metaDebug('MetaPixelLoader', { injected: true, action: 'fbq stub+init; fbevents.js lazyOnload' });
    setInject(true);
  }, [pixelId]);

  if (!pixelId || !inject) return null;

  return (
    <>
      <Script
        id="meta-pixel-fbq-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: FBQ_STUB_AND_INIT(pixelId) }}
      />
      <Script
        src={FB_EVENTS_SRC}
        strategy="lazyOnload"
        onLoad={() => {
          queueMicrotask(() => syncMetaPixelExternalIdOnce());
        }}
      />
    </>
  );
}
