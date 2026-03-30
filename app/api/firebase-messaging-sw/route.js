import { NextResponse } from 'next/server';

/** Serves the FCM service worker with Firebase config from env (same-origin via rewrite). */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };

  if (!config.apiKey || !config.projectId) {
    return new NextResponse(
      '// Firebase web push: set NEXT_PUBLIC_FIREBASE_* and rebuild.\n',
      {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  const configJson = JSON.stringify(config);
  const body = `importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');
firebase.initializeApp(${configJson});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = (payload && payload.notification && payload.notification.title) || 'New order';
  const body = (payload && payload.notification && payload.notification.body) || '';
  const url = (payload && payload.data && payload.data.url) || '/admin/orders';
  self.registration.showNotification(title, {
    body,
    icon: '/assets/nature-secret-logo.svg',
    badge: '/assets/nature-secret-logo.svg',
    data: { url },
  });
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/admin/orders';
  const fullUrl = url.indexOf('http') === 0 ? url : self.location.origin + url;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url && 'navigate' in c && c.navigate && c.focus) {
          return c.navigate(fullUrl).then(() => c.focus());
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
    }),
  );
});
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
