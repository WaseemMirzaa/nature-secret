'use client';

import { useState } from 'react';
import Link from '@/components/Link';
import { Logo } from '@/components/Logo';
import { customerForgotPassword, formatApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setLoading(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      await customerForgotPassword(email.trim(), `${baseUrl}/reset-password`);
      setSent(true);
    } catch (err) {
      setError(formatApiError(err, 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="flex justify-center mb-8">
        <Logo className="h-10" />
      </div>
      <h1 className="text-2xl font-semibold text-neutral-900">Forgot password</h1>
      <p className="mt-1 text-sm text-neutral-500">Enter your email and we’ll send a reset link.</p>
      {sent ? (
        <p className="mt-6 text-sm text-neutral-700">If an account exists for that email, we’ve sent a reset link. Check your inbox.</p>
      ) : (
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/login" className="text-neutral-900 font-medium">Back to login</Link>
      </p>
    </div>
  );
}
