'use client';

import { useState } from 'react';
import Link from '@/components/Link';
import { useRouter } from 'next/navigation';
import { useCustomerStore } from '@/lib/store';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const login = useCustomerStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    login({ email: email.trim(), name: email.trim().split('@')[0] });
    router.push('/account');
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="flex justify-center mb-8">
        <Logo className="h-10" />
      </div>
      <h1 className="text-2xl font-semibold text-neutral-900">Customer login</h1>
      <p className="mt-1 text-sm text-neutral-500">Sign in to your account</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-500">Demo: any password works.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        New here? <Link href="/login" className="text-neutral-900 font-medium">Create an account</Link> (use same form — we’ll save your email).
      </p>
    </div>
  );
}
