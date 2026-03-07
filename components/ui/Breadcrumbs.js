'use client';

import Link from '@/components/Link';
import { usePathname } from 'next/navigation';

const LABELS = {
  shop: 'Shop',
  blog: 'Journal',
  wishlist: 'Wishlist',
  account: 'Account',
  checkout: 'Checkout',
  confirmation: 'Order confirmed',
  'herbal-oils': 'Herbal Oils',
  'skin-care': 'Skin Care',
};

function segmentLabel(segment, nextSegment) {
  if (segment === '') return 'Home';
  if (LABELS[segment]) return LABELS[segment];
  const readable = decodeURIComponent(segment).replace(/-/g, ' ');
  if (nextSegment === undefined) return readable.charAt(0).toUpperCase() + readable.slice(1);
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

export function Breadcrumbs({ customItems, className = '' }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  if (isAdmin) return null;

  const items = customItems ?? (() => {
    const segments = pathname?.split('/').filter(Boolean) ?? [];
    const result = [{ href: '/', label: 'Home' }];
    let href = '';
    segments.forEach((seg, i) => {
      href += `/${seg}`;
      const label = segmentLabel(seg, segments[i + 1]);
      result.push({ href, label: decodeURIComponent(label) });
    });
    return result;
  })();

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-500">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-x-2">
              {i > 0 && (
                <span className="text-neutral-300 select-none" aria-hidden>
                  /
                </span>
              )}
              {isLast ? (
                <span className="font-medium text-neutral-900" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gold-600 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
