'use client';

import Link from '@/components/Link';
import { usePathname } from 'next/navigation';
import { useBreadcrumbLabel } from '@/lib/BreadcrumbContext';

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function segmentLabel(segment, nextSegment, overrideLabel) {
  if (segment === '') return 'Home';
  if (LABELS[segment]) return LABELS[segment];
  if (overrideLabel && UUID_REGEX.test(segment)) return overrideLabel;
  const readable = decodeURIComponent(segment).replace(/-/g, ' ');
  if (nextSegment === undefined) return readable.charAt(0).toUpperCase() + readable.slice(1);
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

export function Breadcrumbs({ customItems, className = '' }) {
  const pathname = usePathname();
  const { lastSegmentLabel } = useBreadcrumbLabel() || {};
  const isAdmin = pathname?.startsWith('/admin');
  if (isAdmin) return null;

  const items = customItems ?? (() => {
    const segments = pathname?.split('/').filter(Boolean) ?? [];
    const result = [{ href: '/', label: 'Home' }];
    let href = '';
    const lastIndex = segments.length - 1;
    segments.forEach((seg, i) => {
      href += `/${seg}`;
      const label = segmentLabel(seg, segments[i + 1], i === lastIndex ? lastSegmentLabel : null);
      result.push({ href, label: typeof label === 'string' ? label : decodeURIComponent(String(label)) });
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
