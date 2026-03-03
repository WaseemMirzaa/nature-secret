'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminRealtimeProvider } from '@/context/AdminRealtimeContext';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/analytics', label: 'Analytics' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('nature_secret_admin');
    if (!stored && !pathname?.startsWith('/admin/login')) {
      router.replace('/admin/login');
      return;
    }
    try {
      const data = JSON.parse(stored || '{}');
      setAuth(data);
    } catch {
      if (!pathname?.startsWith('/admin/login')) router.replace('/admin/login');
    }
  }, [pathname, router]);

  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  if (!auth) {
    return <PageLoader />;
  }

  return (
    <AdminRealtimeProvider>
    <div className="min-h-screen flex bg-neutral-50">
      <aside className="w-56 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-6 border-b border-neutral-200">
          <Link href="/admin" className="block">
            <Logo className="h-8" link={false} />
          </Link>
          <p className="text-xs text-neutral-500 mt-1">Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                pathname === item.href ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-200">
          <span className="block text-xs text-neutral-500 truncate">{auth.email}</span>
          <span className="text-xs text-neutral-400">({auth.role})</span>
          <button
            type="button"
            onClick={() => { localStorage.removeItem('nature_secret_admin'); router.replace('/admin/login'); }}
            className="mt-3 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
    </AdminRealtimeProvider>
  );
}
