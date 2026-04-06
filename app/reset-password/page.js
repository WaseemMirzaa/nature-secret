'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from '@/components/Link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { customerResetPassword, formatApiError } from '@/lib/api';
import { getFirebaseAuth, getFirebaseAuthErrorMessage, MIN_PASSWORD_LENGTH } from '@/lib/firebase';
import { InlineLoader } from '@/components/ui/PageLoader';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const oobCode = searchParams.get('oobCode') || '';
  const mode = searchParams.get('mode') || '';
  const isFirebase = mode === 'resetPassword' && !!oobCode;
  const minLen = isFirebase ? MIN_PASSWORD_LENGTH : 8;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isFirebase && !token) setError('Invalid reset link.');
  }, [isFirebase, token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < minLen) {
      setError(`Password must be at least ${minLen} characters.`);
      return;
    }
    setLoading(true);
    try {
      if (isFirebase) {
        const auth = await getFirebaseAuth();
        if (!auth) throw new Error('Sign-in not configured.');
        const { confirmPasswordReset } = await import('firebase/auth');
        await confirmPasswordReset(auth, oobCode, password);
      } else {
        await customerResetPassword(token, password);
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      const msg = err?.code ? getFirebaseAuthErrorMessage(err.code, err?.message) : formatApiError(err, 'Invalid or expired link.');
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
            <p className="mt-2 text-xs font-medium text-neutral-400 tracking-wider uppercase">Reset password</p>
          </div>
          <div className="p-8">
            {done ? (
              <div className="rounded-xl bg-gold-50 border border-gold-200 p-4">
                <p className="text-sm font-medium text-gold-900">Password updated</p>
                <p className="mt-1 text-sm text-gold-800">Redirecting you to login…</p>
              </div>
            ) : !isFirebase && !token ? (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm font-medium text-red-800">Invalid reset link</p>
                <p className="mt-1 text-sm text-red-700">This link is missing or invalid. Request a new one from the login page.</p>
                <p className="mt-4">
                  <Link href="/forgot-password" className="text-sm font-medium text-red-700 hover:underline">Request new link</Link>
                </p>
              </div>
            ) : (
              <>
                <p className="text-neutral-600 text-sm">Enter your new password below. Use at least {minLen} characters.</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">New password</label>
                    <input
                      id="password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={minLen}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-600/25 focus:border-neutral-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-neutral-700 mb-1.5">Confirm password</label>
                    <input
                      id="confirm"
                      name="confirm-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={minLen}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-600/25 focus:border-neutral-700"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full sm:rounded-2xl bg-neutral-900 py-3.5 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:ring-offset-2 disabled:opacity-50 transition"
                  >
                    {loading ? 'Updating…' : 'Update password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <InlineLoader />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
