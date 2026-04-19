'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { getContactSettings } from '@/lib/api';
import { DEFAULT_CONTACT } from '@/lib/constants';
import { getWhatsAppHref, handleWhatsAppClick, normalizeWhatsAppDigits, WhatsAppGlyphIcon } from '@/lib/whatsappLink';

function pathLooksLikeShopProduct(pathname) {
  if (!pathname || typeof pathname !== 'string') return false;
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === 'shop' && parts.length >= 2;
}

export function FloatingWhatsApp() {
  const pathnameHook = usePathname() || '';
  const [pathFromWindow] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname || '' : '',
  );
  const pathname = pathnameHook || pathFromWindow;

  const [phoneDigits, setPhoneDigits] = useState(
    () => normalizeWhatsAppDigits(DEFAULT_CONTACT.whatsappNumber) || DEFAULT_CONTACT.whatsappNumber,
  );

  const [portalEl, setPortalEl] = useState(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalEl(document.body);
  }, []);

  useEffect(() => {
    getContactSettings()
      .then((r) => {
        const n = normalizeWhatsAppDigits(r.whatsappNumber) || normalizeWhatsAppDigits(DEFAULT_CONTACT.whatsappNumber);
        if (n) setPhoneDigits(n);
      })
      .catch(() => {});
  }, []);

  const isHome = pathname === '/';
  const isProductDetail = pathLooksLikeShopProduct(pathname);

  const waHref = getWhatsAppHref(phoneDigits);

  const fabClass =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2';

  const nodes = useMemo(() => {
    if (!pathname) return null;
    if (!isHome && !isProductDetail) return null;

    const bottomFab = (
      <a
        key="wa-bottom"
        href={waHref}
        onClick={(e) => handleWhatsAppClick(e, phoneDigits, 'floating')}
        rel="noopener noreferrer"
        className={`fixed right-6 z-[80] ${fabClass} bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px)+var(--ns-pdp-sticky-bottom,0px))]`}
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppGlyphIcon />
      </a>
    );

    if (isProductDetail) {
      return (
        <>
          <a
            key="wa-top"
            href={waHref}
            onClick={(e) => handleWhatsAppClick(e, phoneDigits, 'floating-pdp-top')}
            rel="noopener noreferrer"
            title="WhatsApp"
            aria-label="Chat on WhatsApp"
            className={`fixed z-[80] ${fabClass} right-[max(1rem,env(safe-area-inset-right,0px))] top-[calc(3.5rem+0.75rem+env(safe-area-inset-top,0px))] sm:top-[calc(4rem+0.75rem+env(safe-area-inset-top,0px))]`}
          >
            <WhatsAppGlyphIcon />
          </a>
          {bottomFab}
        </>
      );
    }

    return bottomFab;
  }, [pathname, isHome, isProductDetail, waHref, phoneDigits]);

  if (!portalEl || !nodes) return null;

  return createPortal(nodes, portalEl);
}
