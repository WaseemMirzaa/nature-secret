'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { customerResetPassword, formatApiError } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid reset link.');
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await customerResetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(formatApiError(err, 'Invalid or expired link.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="flex justify-center mb-8">
        <Logo className="h-10" />
      </div>
      <h1 className="text-2xl font-semibold text-neutral-900">Reset password</h1>
      <p className="mt-1 text-sm text-neutral-500">Enter your new password.</p>
      {done ? (
        <p className="mt-6 text-sm text-neutral-700">Password updated. Redirecting to login…</p>
      ) : !token ? (
        <p className="mt-6 text-sm text-red-600">Missing or invalid reset link. Request a new one from the login page.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-neutral-700">Confirm password</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50">
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/login" className="text-neutral-900 font-medium">Back to login</Link>
      </p>
    </div>
  );
}
