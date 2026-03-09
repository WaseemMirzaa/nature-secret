'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import { getAdminPushVapidPublic, subscribePush } from '@/lib/api';

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nature_secret_admin');
    const data = raw ? JSON.parse(raw) : null;
    return data?.access_token || null;
  } catch { return null; }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function OrderNotificationsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      setStatus('login');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    setStatus('ready');
  }, []);

  async function handleSubscribe() {
    setError('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setError('Notifications were denied.');
        return;
      }
      const { vapidPublicKey } = await getAdminPushVapidPublic();
      if (!vapidPublicKey) {
        setError('Server push not configured (VAPID keys missing).');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await reg.update();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const subscription = sub.toJSON ? sub.toJSON() : { endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))) } };
      await subscribePush({ subscription });
      setSubscribed(true);
      setStatus('ready');
    } catch (e) {
      setError(e?.message || 'Subscribe failed.');
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

      {subscribed ? (
        <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
          <p className="font-medium">You’re subscribed</p>
          <p className="text-sm mt-1">Add this page to your home screen for best experience: menu → Add to Home Screen.</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleSubscribe}
            className="mt-6 rounded-xl bg-neutral-900 text-white px-6 py-3 text-sm font-medium hover:bg-neutral-800"
          >
            Enable notifications
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <p className="mt-4 text-sm text-neutral-500">Then add this page to your phone’s home screen so you get alerts even when the browser is closed.</p>
        </>
      )}
    </div>
  );
}
