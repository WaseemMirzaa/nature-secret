'use client';

import { useEffect } from 'react';
import Link from '@/components/Link';
import { useRouter } from 'next/navigation';
import { useCustomerStore } from '@/lib/store';

export default function AccountPage() {
  const router = useRouter();
  const customer = useCustomerStore((s) => s.customer);

  useEffect(() => {
    if (typeof window !== 'undefined' && !customer) {
      router.replace('/login');
    }
  }, [customer, router]);

  if (!customer) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900">Your account</h1>
      <p className="mt-1 text-neutral-500">{customer.email}</p>
      <p className="mt-4 text-sm text-neutral-600">Order history and saved details will appear here once connected to the backend.</p>
      <button
        type="button"
        onClick={() => { useCustomerStore.getState().logout(); router.push('/'); }}
        className="mt-8 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
      >
        Log out
      </button>
    </div>
  );
}
