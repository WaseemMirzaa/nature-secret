import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { StoreLayout } from '@/components/StoreLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: 'Nature Secret | Premium Herbal Oils & Skincare',
  description: 'Premium minimalistic online store for herbal oils and skincare. Clean, natural, luxurious.',
  icons: {
    icon: '/assets/nature-secret-logo.svg',
  },
};
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

const chunkReloadScript = `
(function(){
  var key='ns_chunk_reload', keyDone=key+'_done', max=3, win=6e4;
  function isChunkErr(m){var s=(m&&m.message)?m.message:String(m);return s.indexOf('ChunkLoadError')!==-1||s.indexOf('Loading chunk')!==-1||s.indexOf('Failed to fetch dynamically imported module')!==-1;}
  function reload(){
    try{
      var now=Date.now(), raw=sessionStorage.getItem(key), data={count:0,first:now};
      if(raw){try{data=JSON.parse(raw);if(now-data.first>win)data={count:0,first:now};}catch(e){}}
      if(data.count<max){data.count++;sessionStorage.setItem(key,JSON.stringify(data));location.reload();return;}
      sessionStorage.setItem(keyDone,'1');
      document.body.innerHTML='<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:system-ui;background:#fafafa;color:#171717"><p style="font-size:1.125rem;font-weight:500;margin-bottom:8px">Update required</p><p style="color:#525252;font-size:0.875rem;margin-bottom:24px">Please refresh to load the latest version.</p><button onclick="sessionStorage.removeItem(\\''+key+'\\');sessionStorage.removeItem(\\''+keyDone+'\\');location.reload()" style="background:#171717;color:#fff;border:none;padding:10px 24px;border-radius:12px;font-size:0.875rem;cursor:pointer">Refresh page</button></div>';
    }catch(e){location.reload();}
  }
  window.addEventListener('error',function(e){if(isChunkErr(e.message))reload();});
  window.addEventListener('unhandledrejection',function(e){if(isChunkErr(e.reason&&e.reason.message?e.reason.message:String(e.reason)))reload();});
})();
`;

export default function RootLayout({ children }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="api-url" content={apiUrl} />
        <link rel="icon" href="/assets/nature-secret-logo.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: chunkReloadScript }} />
        <Providers>
          <StoreLayout>{children}</StoreLayout>
        </Providers>
      </body>
    </html>
  );
}
