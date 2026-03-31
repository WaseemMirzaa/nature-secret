 'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import { Logo } from '@/components/Logo';
import { FooterContact } from '@/components/FooterContact';
import { getContentSettings } from '@/lib/api';

export function Footer() {
  const [footerDisclaimer, setFooterDisclaimer] = useState(
    'Nature Secret products are intended for general wellness and relaxation purposes only. Our botanical oils are designed to support a comfortable lifestyle and are not intended to diagnose, treat, cure, or prevent any disease or medical condition.',
  );

  useEffect(() => {
    let cancelled = false;
    getContentSettings()
      .then((r) => {
        if (!cancelled && r?.footerDisclaimer) setFooterDisclaimer(r.footerDisclaimer);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50/80 mt-16 sm:mt-20 lg:mt-24">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-6 sm:py-10 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-9 lg:gap-12">
          <div className="md:col-span-2">
            <Logo className="h-9 sm:h-10" />
            <p className="mt-3 sm:mt-5 text-xs sm:text-sm text-neutral-500 max-w-sm leading-relaxed">
              Premium herbal oils and skincare. Clean, minimal, effective. Crafted for those who value quality and simplicity.
            </p>
            <p className="mt-3 text-xs text-neutral-400">
              Nationwide delivery · Cash on delivery · Quality assured
            </p>
            <FooterContact />
            <div className="mt-6 h-px w-12 bg-gold-400/60" aria-hidden />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-700/90">Shop</h3>
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              <li><Link href="/shop" className="text-xs sm:text-sm text-neutral-600 hover:text-gold-700 transition-colors">All products</Link></li>
              <li><Link href="/shop?category=herbal-oils" className="text-xs sm:text-sm text-neutral-600 hover:text-gold-700 transition-colors">Herbal Oils</Link></li>
              <li><Link href="/shop?category=skin-care" className="text-xs sm:text-sm text-neutral-600 hover:text-gold-700 transition-colors">Skin Care</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-700/90">Company</h3>
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              <li><Link href="/blog" className="text-xs sm:text-sm text-neutral-600 hover:text-gold-700 transition-colors">Journal</Link></li>
              <li><Link href="/about" className="text-xs sm:text-sm text-neutral-600 hover:text-gold-700 transition-colors">About</Link></li>
              <li><Link href="/contact" className="text-xs sm:text-sm text-neutral-600 hover:text-gold-700 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 sm:mt-12 lg:mt-14 pt-6 sm:pt-8 border-t border-neutral-200/80 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-xs text-neutral-400">© {new Date().getFullYear()} Nature Secret. All rights reserved.</p>
          <div className="flex gap-4 sm:gap-6 lg:gap-8">
            <Link href="/privacy" className="text-xs text-neutral-400 hover:text-gold-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-neutral-400 hover:text-gold-600 transition-colors">Terms</Link>
          </div>
        </div>
        <p className="mt-4 text-[11px] sm:text-xs text-neutral-500 leading-relaxed max-w-4xl">{footerDisclaimer}</p>
      </div>
    </footer>
  );
}
