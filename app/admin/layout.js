'use client';

import Link from '@/components/Link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminRealtimeProvider } from '@/context/AdminRealtimeContext';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', adminOnly: true },
  { href: '/admin/products', label: 'Products', adminOnly: true },
  { href: '/admin/orders', label: 'Orders', adminOnly: false },
  { href: '/admin/customers', label: 'Customers', adminOnly: true },
  { href: '/admin/order-notifications', label: 'Order notifications', adminOnly: true },
  { href: '/admin/whatsapp', label: 'WhatsApp & Contact', adminOnly: true },
  { href: '/admin/support', label: 'Support tickets', adminOnly: true },
  { href: '/admin/slider', label: 'Home slider', adminOnly: true },
  { href: '/admin/content', label: 'Content settings', adminOnly: true },
  { href: '/admin/blog', label: 'Blog', adminOnly: true },
  { href: '/admin/analytics', label: 'Analytics', adminOnly: true },
];

function NavSidebar({ pathname, auth, onNavClick, onLogout }) {
  return (
    <>
      <div className="p-4 sm:p-6 border-b border-neutral-200">
        <Link href="/admin" className="block" onClick={onNavClick}>
          <Logo className="h-8" link={false} />
        </Link>
        <p className="text-xs text-neutral-500 mt-1">Admin</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {ADMIN_NAV.filter((item) => !item.adminOnly || auth?.role === 'admin').map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={`block rounded-xl px-4 py-3 text-sm font-medium transition min-h-[44px] flex items-center ${
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
          onClick={onLogout}
          className="mt-3 w-full min-h-[44px] rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          Log out
        </button>
      </div>
    </>
  );
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('nature_secret_admin');
    if (!stored && !pathname?.startsWith('/admin/login')) {
      router.replace('/admin/login');
      return;
    }
    try {
      const data = JSON.parse(stored || '{}');
      if (!data?.access_token && !pathname?.startsWith('/admin/login')) {
        localStorage.removeItem('nature_secret_admin');
        router.replace('/admin/login');
        return;
      }
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

  if (auth?.role === 'staff' && pathname !== '/admin/orders' && !pathname?.startsWith?.('/admin/orders/')) {
    router.replace('/admin/orders');
    return <PageLoader />;
  }

  return (
    <AdminRealtimeProvider>
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50">
      {/* Mobile menu button */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-200 bg-white sticky top-0 z-30">
        <Link href="/admin"><Logo className="h-8" link={false} /></Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-3 min-w-[44px] min-h-[44px] rounded-xl text-neutral-600 hover:bg-neutral-100"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      {/* Sidebar: drawer on mobile, fixed on md+ */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" aria-hidden onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`w-64 max-w-[85vw] md:max-w-none md:w-56 border-r border-neutral-200 bg-white flex flex-col fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out md:transform-none pt-14 md:pt-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <button type="button" onClick={() => setMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 p-2 min-w-[44px] min-h-[44px] rounded-xl text-neutral-500 hover:bg-neutral-100" aria-label="Close menu">×</button>
        <div className="flex-1 overflow-y-auto flex flex-col">
          <NavSidebar pathname={pathname} auth={auth} onNavClick={() => setMobileMenuOpen(false)} onLogout={() => { localStorage.removeItem('nature_secret_admin'); router.replace('/admin/login'); }} />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
    </div>
    </AdminRealtimeProvider>
  );
}
