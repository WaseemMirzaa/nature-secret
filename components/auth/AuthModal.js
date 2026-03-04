'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerStore, useAuthModalStore } from '@/lib/store';
import { Logo } from '@/components/Logo';
import { customerLogin, customerRegister, formatApiError } from '@/lib/api';

export function AuthModal() {
  const router = useRouter();
  const { open, mode, close } = useAuthModalStore();
  const login = useCustomerStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    if (!password.trim()) {
      setError('Enter your password.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Enter your name.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await customerRegister(email.trim(), password, name.trim());
      } else {
        await customerLogin(email.trim(), password);
      }
      const raw = localStorage.getItem('nature_secret_customer');
      const customer = raw ? JSON.parse(raw) : null;
      login(customer || { email: email.trim(), name: name.trim() || email.trim().split('@')[0] });
      close();
      setEmail('');
      setPassword('');
      setName('');
      router.push('/account');
    } catch (err) {
      setError(formatApiError(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" aria-hidden onClick={close} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <Logo className="h-7" link={false} />
          <button type="button" onClick={close} className="p-1 text-neutral-400 hover:text-neutral-600" aria-label="Close">×</button>
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          {mode === 'signup' ? 'Create account' : 'Login'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-neutral-700">Name</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={mode === 'signup'}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-neutral-700">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-neutral-700">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50">
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          {mode === 'signup' ? (
            <>Already have an account? <button type="button" onClick={() => useAuthModalStore.getState().openLogin()} className="font-medium text-neutral-900">Login</button></>
          ) : (
            <>New here? <button type="button" onClick={() => useAuthModalStore.getState().openSignup()} className="font-medium text-neutral-900">Create account</button></>
          )}
        </p>
      </div>
    </>
  );
}
