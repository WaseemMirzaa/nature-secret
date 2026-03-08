'use client';

import { Suspense, useState } from 'react';
import Link from '@/components/Link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomerStore, useAuthModalStore } from '@/lib/store';
import { Logo } from '@/components/Logo';
import { customerLogin, formatApiError } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useCustomerStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await customerLogin(email.trim(), password);
      const raw = typeof window !== 'undefined' ? localStorage.getItem('nature_secret_customer') : null;
      const customer = raw ? JSON.parse(raw) : { email: email.trim(), name: email.trim().split('@')[0] };
      login(customer);
      const returnUrl = searchParams?.get('returnUrl') || '/account';
      router.push(returnUrl.startsWith('/') ? returnUrl : '/account');
    } catch (err) {
      setError(formatApiError(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
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
            required
            className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-500">
            <Link href="/forgot-password" className="text-neutral-600 hover:text-neutral-900">Forgot password?</Link>
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        New here? <button type="button" onClick={() => useAuthModalStore.getState().openSignup()} className="text-neutral-900 font-medium">Create an account</button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm px-4 py-16 text-center text-neutral-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
