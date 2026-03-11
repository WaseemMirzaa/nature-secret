'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import { registerAdminFcmToken } from '@/lib/api';
import { getApp } from '@/lib/firebase';

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nature_secret_admin');
    const data = raw ? JSON.parse(raw) : null;
    return data?.access_token || null;
  } catch { return null; }
}

export default function OrderNotificationsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const fcmSupported = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  useEffect(() => {
    if (!getAdminToken()) {
      setStatus('login');
      return;
    }
    if (!('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    setStatus('ready');
  }, []);

  async function handleSubscribe() {
    setError('');
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setError('Notifications were denied. Enable them in your browser settings to get order alerts.');
        setLoading(false);
        return;
      }
      const { getMessaging, getToken } = await import('firebase/messaging');
      const app = getApp();
      if (!app) {
        setError('Firebase is not configured. Add Firebase config and reload.');
        setLoading(false);
        return;
      }
      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;
      const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
      if (!token) {
        setError('Could not get notification token. Try again or check browser support.');
        setLoading(false);
        return;
      }
      await registerAdminFcmToken(token);
      setSubscribed(true);
    } catch (e) {
      setError(e?.message || 'Failed to enable notifications. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'login') {
    return (
      <div className="max-w-md mx-auto p-6">
        <Link href="/admin/login" className="text-sm text-neutral-500 hover:text-neutral-900">← Admin login</Link>
        <p className="mt-4 text-neutral-600">Log in as admin to enable order notifications on this device.</p>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="max-w-md mx-auto p-6">
        <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-900">← Dashboard</Link>
        <p className="mt-4 text-neutral-600">Push notifications are not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-900">← Dashboard</Link>
      <h1 className="text-2xl font-semibold text-neutral-900 mt-6">Order notifications</h1>
      <p className="text-neutral-600 mt-2">Get a push on this device when a new order arrives.</p>

      {!fcmSupported ? (
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <p className="font-medium">Firebase required</p>
          <p className="text-sm mt-1">Set NEXT_PUBLIC_FIREBASE_* env vars so FCM can be used. Optional: NEXT_PUBLIC_FIREBASE_VAPID_KEY for Web Push.</p>
        </div>
      ) : subscribed ? (
        <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
          <p className="font-medium">You’re subscribed</p>
          <p className="text-sm mt-1">You’ll get a notification when a new order is placed. Add this page to your home screen for best experience.</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading}
            className="mt-6 rounded-xl bg-neutral-900 text-white px-6 py-3 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? 'Enabling…' : 'Enable notifications'}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <p className="mt-4 text-sm text-neutral-500">Add this page to your phone’s home screen to get alerts even when the browser is in the background.</p>
        </>
      )}
    </div>
  );
}
