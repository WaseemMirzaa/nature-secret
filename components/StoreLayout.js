'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { trackPageView } from '@/lib/analytics';

const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer').then((m) => m.CartDrawer), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal').then((m) => m.AuthModal), { ssr: false });

export function StoreLayout({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (!isAdmin && pathname) trackPageView(pathname);
  }, [pathname, isAdmin]);

  if (isAdmin) return <>{children}</>;

  const showBreadcrumbs = pathname && pathname !== '/' && pathname.split('/').filter(Boolean).length > 0;
  return (
    <>
      <Header />
      <div className="flex-1 flex flex-col">
        {showBreadcrumbs && (
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3 border-b border-neutral-100 bg-neutral-50/30">
            <Breadcrumbs />
          </div>
        )}
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
      <CartDrawer />
      <AuthModal />
    </>
  );
}
