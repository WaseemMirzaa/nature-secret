'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomerStore, useAuthModalStore } from '@/lib/store';
import { Logo } from '@/components/Logo';
import { customerFirebaseLogin, customerForgotPassword, formatApiError } from '@/lib/api';
import { getFirebaseAuth, getFirebaseAuthErrorMessage, MIN_PASSWORD_LENGTH } from '@/lib/firebase';
import { Spinner } from '@/components/ui/PageLoader';

export function AuthModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { open, mode, close } = useAuthModalStore();

  const closeModal = useCallback(() => {
    close();
  }, [close]);
  const login = useCustomerStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (mode === 'forgot') {
      setLoading(true);
      try {
        const auth = await getFirebaseAuth();
        if (auth) {
          const { sendPasswordResetEmail } = await import('firebase/auth');
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          await sendPasswordResetEmail(auth, email.trim(), {
            url: `${baseUrl}/reset-password`,
            handleCodeInApp: true,
          });
        } else {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          await customerForgotPassword(email.trim(), `${baseUrl}/reset-password`);
        }
        setForgotSent(true);
      } catch (err) {
        const msg = err?.code ? getFirebaseAuthErrorMessage(err.code, err?.message) : formatApiError(err, 'Something went wrong.');
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    const auth = await getFirebaseAuth();
    if (!auth) {
      setError('Sign-in is not configured. Please try again later.');
      return;
    }
    setLoading(true);
    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      const userCred = mode === 'signup'
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await userCred.user.getIdToken();
      await customerFirebaseLogin(idToken, mode === 'signup' ? name.trim() : undefined);
      const raw = localStorage.getItem('nature_secret_customer');
      const customer = raw ? JSON.parse(raw) : null;
      login(customer || { email: email.trim(), name: name.trim() || email.trim().split('@')[0] });
      close();
      setEmail('');
      setPassword('');
      setName('');
      const returnUrl = (searchParams?.get('returnUrl') || '/account').replace(/^[^/]/, '/$&');
      router.push(returnUrl.startsWith('/') ? returnUrl : '/account');
    } catch (err) {
      const msg = err?.code ? getFirebaseAuthErrorMessage(err.code, err?.message) : formatApiError(err, 'Something went wrong. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" aria-hidden onClick={closeModal} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <Logo className="h-7" link={false} />
          <button type="button" onClick={closeModal} className="p-1 text-neutral-400 hover:text-neutral-600" aria-label="Close">×</button>
        </div>

        {mode === 'forgot' ? (
          <>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Forgot password</h2>
            {forgotSent ? (
              <p className="text-sm text-neutral-600 mb-4">If an account exists for that email, we&apos;ve sent a reset link. Check your inbox.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="auth-forgot-email" className="block text-sm font-medium text-neutral-700">Email</label>
                  <input
                    id="auth-forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-4 py-2.5 text-neutral-900"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full sm:rounded-2xl bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? (
                    <span aria-hidden>
                      <Spinner className="h-4 w-4 border-white/35 border-t-white" />
                    </span>
                  ) : null}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
            <p className="mt-4 text-center text-sm text-neutral-500">
              <button type="button" onClick={() => { useAuthModalStore.getState().openLogin(); setForgotSent(false); setEmail(''); setError(''); }} className="font-medium text-neutral-900">← Back to login</button>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              {mode === 'signup' ? 'Create account' : 'Login'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-sm font-medium text-neutral-700">Name</label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={mode === 'signup'}
                    className="mt-1 w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-4 py-2.5 text-neutral-900"
                    placeholder="Your name"
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-neutral-700">Email</label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-4 py-2.5 text-neutral-900"
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="block text-sm font-medium text-neutral-700">Password</label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-4 py-2.5 text-neutral-900"
                  placeholder={mode === 'signup' ? `At least ${MIN_PASSWORD_LENGTH} characters` : ''}
                />
                {mode === 'login' && (
                  <p className="mt-1 text-xs text-neutral-500">
                    <button type="button" onClick={() => useAuthModalStore.getState().openForgot()} className="text-neutral-600 hover:text-neutral-900">Forgot password?</button>
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full sm:rounded-2xl bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? (
                  <span aria-hidden>
                    <Spinner className="h-4 w-4 border-white/35 border-t-white" />
                  </span>
                ) : null}
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
          </>
        )}
      </div>
    </>
  );
}
