'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { NsPromoBanner } from '@/components/NsPromoBanner';
import { Footer } from '@/components/layout/Footer';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BreadcrumbProvider } from '@/lib/BreadcrumbContext';
import { captureAttributionFromUrl } from '@/lib/attribution';
import { captureFbclidFromUrl } from '@/lib/metaCapiIdentifiers';
import { useCustomerStore } from '@/lib/store';

const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer').then((m) => m.CartDrawer), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal').then((m) => m.AuthModal), { ssr: false });
const ReviewPopup = dynamic(() => import('@/components/ReviewPopup').then((m) => m.ReviewPopup), { ssr: false });
const FloatingWhatsApp = dynamic(() => import('@/components/FloatingWhatsApp').then((m) => m.FloatingWhatsApp), { ssr: false });

function StoreAttributionEffects({ pathname, isAdmin }) {
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    captureAttributionFromUrl();
    captureFbclidFromUrl();
  }, [pathname, searchKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onUrl = () => {
      captureAttributionFromUrl();
      captureFbclidFromUrl();
    };
    window.addEventListener('hashchange', onUrl);
    window.addEventListener('popstate', onUrl);
    return () => {
      window.removeEventListener('hashchange', onUrl);
      window.removeEventListener('popstate', onUrl);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || isAdmin || !pathname) return;
    if (pathname.startsWith('/checkout')) return;
    const path = pathname;
    /** Dynamic `lib/analytics` keeps main bundle smaller; run soon after paint (Meta PageView + CAPI). */
    const run = () => {
      import('@/lib/analytics')
        .then(({ trackPageView }) => trackPageView(path))
        .catch(() => {});
    };
    queueMicrotask(run);
  }, [pathname, isAdmin]);

  return null;
}

export function StoreLayout({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

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

  const attribution = (
    <Suspense fallback={null}>
      <StoreAttributionEffects pathname={pathname} isAdmin={!!isAdmin} />
    </Suspense>
  );

  if (isAdmin) {
    return (
      <>
        {attribution}
        {children}
      </>
    );
  }

  const showBreadcrumbs = pathname && pathname !== '/' && pathname.split('/').filter(Boolean).length > 0;
  const pathParts = pathname?.split('/').filter(Boolean) ?? [];
  const isShopProductDetail = pathParts.length === 2 && pathParts[0] === 'shop';
  return (
    <>
      {attribution}
      <BreadcrumbProvider>
        <Header />
        <NsPromoBanner />
        <div className="flex-1 flex flex-col">
          {showBreadcrumbs && (
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-5 lg:px-8 py-1.5 sm:py-2.5 lg:py-3 border-b border-neutral-200/80 bg-white">
              <Breadcrumbs />
            </div>
          )}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
        <Footer />
        {!isShopProductDetail && <FloatingWhatsApp />}
        <CartDrawer />
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
        <ReviewPopup />
      </BreadcrumbProvider>
    </>
  );
}
