'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getContactSettings } from '@/lib/api';
import { DEFAULT_CONTACT } from '@/lib/constants';
import { getWhatsAppHref, handleWhatsAppClick, normalizeWhatsAppDigits, WhatsAppGlyphIcon } from '@/lib/whatsappLink';

export function FloatingWhatsApp() {
  const pathname = usePathname() || '';

  const [phoneDigits, setPhoneDigits] = useState(
    () => normalizeWhatsAppDigits(DEFAULT_CONTACT.whatsappNumber) || DEFAULT_CONTACT.whatsappNumber,
  );

  useEffect(() => {
    getContactSettings()
      .then((r) => {
        const n = normalizeWhatsAppDigits(r.whatsappNumber) || normalizeWhatsAppDigits(DEFAULT_CONTACT.whatsappNumber);
        if (n) setPhoneDigits(n);
      })
      .catch(() => {});
  }, []);

  const isHome = pathname === '/';
  const isProductDetail = /^\/shop\/.+/.test(pathname);
  if (!isHome && !isProductDetail) return null;

  const waHref = getWhatsAppHref(phoneDigits);

  return (
    <a
      href={waHref}
      onClick={(e) => handleWhatsAppClick(e, phoneDigits, 'floating')}
      rel="noopener noreferrer"
      className="fixed right-6 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px)+var(--ns-pdp-sticky-bottom,0px))]"
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppGlyphIcon />
    </a>
  );
}
