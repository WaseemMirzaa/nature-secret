import './globals.css';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { StoreLayout } from '@/components/StoreLayout';
import {
  buildMetaPixelHeadBootstrapScript,
  META_FBE_EVENTS_SCRIPT_URL,
  META_LANDING_SNAPSHOT_SCRIPT,
} from '@/lib/meta-pixel-gate';
import { networkRetryInlineScript } from '@/lib/networkRetry';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: true,
  /**
   * Re-enabled: with ISR on PDP, Critters defers the full CSS stylesheet, so the font preload
   * no longer competes with a render-blocking CSS request. Preloading breaks the
   * CSS→Font discovery chain (was adding ~1,026ms on Slow 4G).
   */
  preload: true,
});

/** Safe origin for `<link rel="preconnect">` (API / uploads). No-op if env unset or invalid. */
function getApiOriginForPreconnect() {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  if (!raw.trim()) return null;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export const metadata = {
  title: 'Nature Secret | Skincare & Botanical Body Care',
  description: 'Premium minimal online store for botanical skincare and body care. Clean, natural, luxurious.',
  icons: {
    icon: '/assets/nature-secret-logo.svg',
  },
};
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

function versionRefreshScript(appVersion) {
  return `
(function(){
  var version=${JSON.stringify(appVersion || '')};
  if(!version) return;
  function run(){
    var key='ns_app_version';
    try{
      var prev=localStorage.getItem(key);
      if(!prev){localStorage.setItem(key,version);return;}
      if(prev===version) return;
      localStorage.setItem(key,version);
      function hardReload(){
        try{location.reload();}catch(e){
          var u=location.pathname+location.search+(location.search?'&':'?')+'ns_hr='+Date.now();
          location.replace(u+location.hash);
        }
      }
      if(window.caches&&caches.keys){
        caches.keys().then(function(names){
          return Promise.all(names.map(function(n){return caches.delete(n);}));
        }).then(hardReload).catch(hardReload);
      }else{hardReload();}
    }catch(e){try{location.reload();}catch(e2){}}
  }
  if(window.requestIdleCallback)requestIdleCallback(run,{timeout:4000});
  else setTimeout(run,0);
})();
`;
}

export default function RootLayout({ children }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  /** Bust stale JS/CSS after deploy: explicit env, else Vercel commit (auto), else empty. */
  const appVersion =
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    (typeof process.env.VERCEL_GIT_COMMIT_SHA === 'string' && process.env.VERCEL_GIT_COMMIT_SHA.length >= 7
      ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
      : '') ||
    '';
  const apiOrigin = getApiOriginForPreconnect();
  const metaPixelHeadScript = buildMetaPixelHeadBootstrapScript();
  const pixelIdConfigured = Boolean(String(process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim());
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Register before `/_next/static/` links/scripts parse so chunk/CSS 404 triggers retry. */}
        <script dangerouslySetInnerHTML={{ __html: networkRetryInlineScript() }} />
        {pixelIdConfigured ? (
          <>
            <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="anonymous" />
            <link rel="dns-prefetch" href="https://connect.facebook.net" />
            <link rel="preload" href={META_FBE_EVENTS_SCRIPT_URL} as="script" crossOrigin="anonymous" />
          </>
        ) : null}
        {metaPixelHeadScript ? null : (
          <script id="meta-landing-snapshot" dangerouslySetInnerHTML={{ __html: META_LANDING_SNAPSHOT_SCRIPT }} />
        )}
        <meta name="api-url" content={apiUrl} />
        {appVersion ? <meta name="ns-app-version" content={appVersion} /> : null}
        {apiOrigin ? (
          <>
            {/* Match lib/api.js fetch(..., { credentials: 'include' }) so the warm socket can be reused. */}
            <link rel="preconnect" href={apiOrigin} crossOrigin="use-credentials" />
            <link rel="dns-prefetch" href={apiOrigin} />
          </>
        ) : null}
        <link rel="icon" href="/assets/nature-secret-logo.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        {metaPixelHeadScript ? (
          <Script
            id="meta-pixel-head-bootstrap"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: metaPixelHeadScript }}
          />
        ) : null}
        {appVersion ? (
          <Script id="ns-app-version-check" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: versionRefreshScript(appVersion) }} />
        ) : null}
        <Providers>
          <StoreLayout>{children}</StoreLayout>
        </Providers>
      </body>
    </html>
  );
}
