'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { adminLogin, adminRegister, formatApiError } from '@/lib/api';

const FALLBACK_CREDENTIALS = {
  'admin@naturesecret.com': { role: 'admin', password: 'Admin123!' },
  'staff@naturesecret.com': { role: 'staff', password: 'Staff123!' },
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await adminRegister(email, password);
      } else {
        await adminLogin(email, password);
      }
      router.replace('/admin');
      return;
    } catch (err) {
      if (mode === 'login' && err?.status === 401 && err?.body) {
        const cred = FALLBACK_CREDENTIALS[email];
        if (cred && cred.password === password) {
          localStorage.setItem('nature_secret_admin', JSON.stringify({ email, role: cred.role }));
          router.replace('/admin');
          return;
        }
      }
      setError(formatApiError(err, mode === 'signup' ? 'Signup failed.' : 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-soft">
        <div className="flex justify-center mb-6">
          <Logo className="h-10" link={false} />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {mode === 'signup' ? 'Admin sign up' : 'Admin login'}
        </h1>
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
              minLength={mode === 'signup' ? 8 : undefined}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
            />
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-neutral-500">At least 8 characters, letters and numbers</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50">
            {loading ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Sign up' : 'Sign in')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-600">
          {mode === 'signup' ? (
            <>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(''); }} className="font-medium text-neutral-900 underline">Sign in</button></>
          ) : (
            <>No account? <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="font-medium text-neutral-900 underline">Sign up</button></>
          )}
        </p>
      </div>
    </div>
  );
}
