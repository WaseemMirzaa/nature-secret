'use client';

import Link from '@/components/Link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 text-neutral-900">
      <p className="text-6xl font-semibold text-neutral-300 mb-2">404</p>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-neutral-600 text-sm text-center max-w-md mb-6">
        This page could not be loaded. Check your connection and try again, or return home.
      </p>
      <Link href="/" className="rounded-full sm:rounded-2xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-neutral-800">
        Back to home
      </Link>
    </div>
  );
}
