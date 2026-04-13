'use client';

import Link from '@/components/Link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCartStore, useCartOpenStore, useCustomerStore, useAuthModalStore } from '@/lib/store';
import { Logo } from '@/components/Logo';
import { CartIcon } from '@/components/icons/CartIcon';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { MenuIcon } from '@/components/icons/MenuIcon';
import { overlayHistoryDismissIfTop, overlayHistoryDismissForNavigation, overlayHistoryOpen } from '@/lib/overlayHistory';
import { useProductsStore } from '@/lib/store';
import { useProductsAndCategories } from '@/lib/useApiData';

const MOBILE_NAV_OVERLAY_ID = 'nsMobileNav';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWasOpenRef = useRef(false);

  const closeMenu = useCallback(() => {
    overlayHistoryDismissIfTop(MOBILE_NAV_OVERLAY_ID, () => setMenuOpen(false));
  }, []);

  const closeMenuAfterNav = useCallback(() => {
    overlayHistoryDismissForNavigation(MOBILE_NAV_OVERLAY_ID, () => setMenuOpen(false));
  }, []);

  const storeProducts = useProductsStore((s) => s.products);
  const { categories } = useProductsAndCategories(storeProducts);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!menuOpen) {
      menuWasOpenRef.current = false;
      return;
    }
    if (!menuWasOpenRef.current) {
      overlayHistoryOpen(MOBILE_NAV_OVERLAY_ID, () => setMenuOpen(false));
    }
    menuWasOpenRef.current = true;
  }, [menuOpen]);
  const openCart = useCartOpenStore((s) => s.open);
  const items = useCartStore((s) => s.items);
  const customer = useCustomerStore((s) => s.customer);
  const totalQty = items.reduce((n, i) => n + i.qty, 0);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="flex h-14 sm:h-16 min-h-[3.5rem] sm:min-h-[4rem] items-center justify-between">
            <Logo className="h-8 sm:h-9" priority />

            <nav className="hidden md:flex items-center gap-10">
              <Link href="/" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors border-b-2 border-transparent hover:border-gold-500/50 pb-0.5 -mb-0.5">Home</Link>
              <Link href="/shop" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors border-b-2 border-transparent hover:border-gold-500/50 pb-0.5 -mb-0.5">Shop</Link>
              {Array.isArray(categories) &&
                categories.map((c) =>
                  c?.slug ? (
                    <Link
                      key={c.id || c.slug}
                      href={`/shop?category=${encodeURIComponent(c.slug)}`}
                      className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors border-b-2 border-transparent hover:border-gold-500/50 pb-0.5 -mb-0.5"
                    >
                      {c.name || c.slug}
                    </Link>
                  ) : null,
                )}
              <Link href="/blog" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors border-b-2 border-transparent hover:border-gold-500/50 pb-0.5 -mb-0.5">Blog</Link>
              {customer ? (
                <>
                  <Link href="/account" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">Account</Link>
                  <Link href="/support" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">Support</Link>
                  <button type="button" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors bg-transparent border-none cursor-pointer font-inherit" onClick={() => { useCustomerStore.getState().logout(); window.location.href = '/'; }}>Log out</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => useAuthModalStore.getState().openLogin()} className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors bg-transparent border-none cursor-pointer font-inherit">Login</button>
                  <button type="button" onClick={() => useAuthModalStore.getState().openSignup()} className="text-sm font-medium text-neutral-900 border border-neutral-800 rounded-full px-4 py-2 hover:bg-neutral-900 hover:text-white transition-colors">Create account</button>
                </>
              )}
            </nav>

            <div className="flex items-center gap-1">
              <Link href="/wishlist" className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-neutral-500 hover:text-gold-600 hover:bg-gold-50 transition-colors" aria-label="Wishlist">
                <HeartIcon className="w-5 h-5" />
              </Link>
              <button
                type="button"
                onClick={() => openCart()}
                className="relative p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-neutral-500 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                aria-label="Open cart"
              >
                <CartIcon className="w-5 h-5" />
                {totalQty > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold text-white shadow-sm">
                    {totalQty}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-full"
                onClick={() => setMenuOpen(true)}
                aria-label="Menu"
              >
                <MenuIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white">
            <nav className="flex flex-col gap-0 px-3 py-3">
              <Link href="/" className="py-2.5 text-sm text-neutral-600 hover:text-gold-600 font-medium transition-colors border-b border-neutral-100" onClick={closeMenuAfterNav}>Home</Link>
              <Link href="/shop" className="py-2.5 text-sm text-neutral-600 hover:text-gold-600 font-medium transition-colors border-b border-neutral-100" onClick={closeMenuAfterNav}>Shop</Link>
              {Array.isArray(categories) &&
                categories.map((c) =>
                  c?.slug ? (
                    <Link
                      key={c.id || c.slug}
                      href={`/shop?category=${encodeURIComponent(c.slug)}`}
                      className="py-2.5 text-sm text-neutral-600 hover:text-gold-600 font-medium transition-colors border-b border-neutral-100"
                      onClick={closeMenuAfterNav}
                    >
                      {c.name || c.slug}
                    </Link>
                  ) : null,
                )}
              <Link href="/blog" className="py-2.5 text-sm text-neutral-600 hover:text-gold-600 font-medium transition-colors border-b border-neutral-100" onClick={closeMenuAfterNav}>Blog</Link>
              {customer ? (
                <>
                  <Link href="/account" className="py-2.5 text-sm text-neutral-600 hover:text-gold-600 font-medium transition-colors border-b border-neutral-100" onClick={closeMenuAfterNav}>Account</Link>
                  <Link href="/support" className="py-2.5 text-sm text-neutral-600 hover:text-gold-600 font-medium transition-colors border-b border-neutral-100" onClick={closeMenuAfterNav}>Support</Link>
                  <button type="button" className="py-2.5 text-sm text-left text-neutral-600 hover:text-gold-600 font-medium w-full border-b border-neutral-100" onClick={() => { useCustomerStore.getState().logout(); closeMenu(); window.location.href = '/'; }}>Log out</button>
                </>
              ) : (
                <>
                  <button type="button" className="py-2.5 text-sm text-left text-neutral-600 hover:text-gold-600 font-medium w-full border-b border-neutral-100" onClick={() => { useAuthModalStore.getState().openLogin(); closeMenu(); }}>Login</button>
                  <button type="button" className="py-2.5 text-sm text-left font-medium text-neutral-900 w-full mt-1.5 rounded-full sm:rounded-2xl bg-gold-50 text-gold-800 border border-gold-200" onClick={() => { useAuthModalStore.getState().openSignup(); closeMenu(); }}>Create account</button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
