'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BreadcrumbProvider } from '@/lib/BreadcrumbContext';
import { trackPageView } from '@/lib/analytics';
import { useCustomerStore } from '@/lib/store';

const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer').then((m) => m.CartDrawer), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal').then((m) => m.AuthModal), { ssr: false });
const ReviewPopup = dynamic(() => import('@/components/ReviewPopup').then((m) => m.ReviewPopup), { ssr: false });
const FloatingWhatsApp = dynamic(() => import('@/components/FloatingWhatsApp').then((m) => m.FloatingWhatsApp), { ssr: false });

export function StoreLayout({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (!isAdmin && pathname) trackPageView(pathname);
  }, [pathname, isAdmin]);

  // Sync customer session from localStorage if store hasn't rehydrated yet (e.g. new tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const customer = useCustomerStore.getState().customer;
    if (customer) return;
    const token = localStorage.getItem('nature_secret_customer_token');
    const raw = localStorage.getItem('nature_secret_customer');
    if (token && raw) {
      try {
        const data = JSON.parse(raw);
        if (data && (data.email || data.id)) useCustomerStore.getState().login(data);
      } catch (_) {}
    }
  }, []);

  if (isAdmin) return <>{children}</>;

  const showBreadcrumbs = pathname && pathname !== '/' && pathname.split('/').filter(Boolean).length > 0;
  return (
    <BreadcrumbProvider>
      <Header />
      <div className="flex-1 flex flex-col">
        {showBreadcrumbs && (
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-2 sm:py-3 border-b border-neutral-100 bg-neutral-50/30">
            <Breadcrumbs />
          </div>
        )}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <Footer />
      <FloatingWhatsApp />
      <CartDrawer />
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>
      <ReviewPopup />
    </BreadcrumbProvider>
  );
}
