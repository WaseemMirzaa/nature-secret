import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { StoreLayout } from '@/components/StoreLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata = {
  title: 'Nature Secret | Premium Herbal Oils & Skincare',
  description: 'Premium minimalistic online store for herbal oils and skincare. Clean, natural, luxurious.',
};
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <StoreLayout>{children}</StoreLayout>
        </Providers>
      </body>
    </html>
  );
}
