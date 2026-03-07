import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { StoreLayout } from '@/components/StoreLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'optional' });

export const metadata = {
  title: 'Nature Secret | Premium Herbal Oils & Skincare',
  description: 'Premium minimalistic online store for herbal oils and skincare. Clean, natural, luxurious.',
};
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

const chunkReloadScript = `
(function(){
  var key='ns_chunk_reload';
  function isChunkErr(m){var s=(m&&m.message)?m.message:String(m);return s.indexOf('ChunkLoadError')!==-1||s.indexOf('Loading chunk')!==-1;}
  function reload(){try{if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');location.reload();}}catch(e){location.reload();}}
  window.addEventListener('error',function(e){if(isChunkErr(e.message))reload();});
  window.addEventListener('unhandledrejection',function(e){if(isChunkErr(e.reason))reload();});
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: chunkReloadScript }} />
        <Providers>
          <StoreLayout>{children}</StoreLayout>
        </Providers>
      </body>
    </html>
  );
}
