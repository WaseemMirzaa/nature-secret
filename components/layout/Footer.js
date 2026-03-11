import Link from '@/components/Link';
import { Logo } from '@/components/Logo';
import { FooterContact } from '@/components/FooterContact';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50/80 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <Logo className="h-10" />
            <p className="mt-5 text-sm text-neutral-500 max-w-sm leading-relaxed">
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
            <ul className="mt-4 space-y-3">
              <li><Link href="/shop" className="text-sm text-neutral-600 hover:text-gold-700 transition-colors">All products</Link></li>
              <li><Link href="/shop?category=herbal-oils" className="text-sm text-neutral-600 hover:text-gold-700 transition-colors">Herbal Oils</Link></li>
              <li><Link href="/shop?category=skin-care" className="text-sm text-neutral-600 hover:text-gold-700 transition-colors">Skin Care</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-700/90">Company</h3>
            <ul className="mt-4 space-y-3">
              <li><Link href="/blog" className="text-sm text-neutral-600 hover:text-gold-700 transition-colors">Journal</Link></li>
              <li><Link href="/about" className="text-sm text-neutral-600 hover:text-gold-700 transition-colors">About</Link></li>
              <li><Link href="/contact" className="text-sm text-neutral-600 hover:text-gold-700 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 pt-8 border-t border-neutral-200/80 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-400">© {new Date().getFullYear()} Nature Secret. All rights reserved.</p>
          <div className="flex gap-8">
            <Link href="/privacy" className="text-xs text-neutral-400 hover:text-gold-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-neutral-400 hover:text-gold-600 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
