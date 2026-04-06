'use client';

import { useState } from 'react';
import Link from '@/components/Link';
import { Logo } from '@/components/Logo';
import { customerForgotPassword, formatApiError } from '@/lib/api';
import { getFirebaseAuth, getFirebaseAuthErrorMessage } from '@/lib/firebase';

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
      const auth = await getFirebaseAuth();
      if (auth) {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email.trim(), {
          url: `${baseUrl}/reset-password`,
          handleCodeInApp: true,
        });
      } else {
        await customerForgotPassword(email.trim(), `${baseUrl}/reset-password`);
      }
      setSent(true);
    } catch (err) {
      const msg = err?.code
        ? getFirebaseAuthErrorMessage(err.code, err?.message)
        : formatApiError(err, 'Something went wrong.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-3 sm:px-5 py-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-premium overflow-hidden">
          <div className="bg-neutral-900 px-8 py-6 text-center">
            <Link href="/" className="inline-block">
              <Logo className="h-9 text-gold-500" link={false} />
            </Link>
            <p className="mt-2 text-xs font-medium text-neutral-400 tracking-wider uppercase">Forgot password</p>
          </div>
          <div className="p-8">
            {sent ? (
              <div className="rounded-xl bg-gold-50 border border-gold-200 p-4">
                <p className="text-sm font-medium text-gold-900">Check your inbox</p>
                <p className="mt-1 text-sm text-gold-800">If an account exists for that email, we&apos;ve sent a reset link. It may take a few minutes.</p>
              </div>
            ) : (
              <>
                <p className="text-neutral-600 text-sm">Enter your account email and we&apos;ll send you a link to reset your password.</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-400/50"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:ring-offset-2 disabled:opacity-50 transition"
                  >
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}
            <p className="mt-6 text-center">
              <Link href="/login" className="text-sm font-medium text-gold-600 hover:text-gold-700">← Back to login</Link>
            </p>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-neutral-500">Nature Secret · Skincare &amp; Botanical Body Care</p>
      </div>
    </div>
  );
}
