import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { StoreLayout } from '@/components/StoreLayout';
import { META_LANDING_SNAPSHOT_SCRIPT } from '@/lib/meta-pixel-gate';
import { networkRetryInlineScript } from '@/lib/networkRetry';

/** Single stack: clear, credible retail type (no decorative display serif). */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
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
  return (
    <html lang="en" className={inter.variable}>
      <head>
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
        <script id="meta-landing-snapshot" dangerouslySetInnerHTML={{ __html: META_LANDING_SNAPSHOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: versionRefreshScript(appVersion) }} />
        <script dangerouslySetInnerHTML={{ __html: networkRetryInlineScript() }} />
        <Providers>
          <StoreLayout>{children}</StoreLayout>
        </Providers>
      </body>
    </html>
  );
}
